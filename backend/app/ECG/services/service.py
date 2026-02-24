import io
import os

import joblib
import numpy as np
import onnxruntime as ort
import pandas as pd
from scipy import stats
from scipy.special import softmax


async def parse_ecg(file):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    df.columns = [column.lower() for column in df.columns]

    if "time" in df.columns:
        time = df["time"].tolist()
        channels = [column for column in df.columns if column != "time"]
    else:
        sampling_rate = 360
        time = [index / sampling_rate for index in range(len(df))]
        channels = df.columns.tolist()

    signals = {channel: df[channel].astype(float).tolist() for channel in channels}
    duration = float(time[-1]) if time else None

    return {
        "num_channels": len(channels),
        "channels": channels,
        "num_samples": len(df),
        "duration": duration,
        "time": time,
        "signals": signals,
    }


base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
onnx_path = os.path.join(base_path, "notebook", "light_ecg_cnn_balanced.onnx")
classic_model_path = os.path.join(base_path, "notebook", "balanced_rf_ecg.pkl")

ai_session = None
input_name = None

try:
    ai_session = ort.InferenceSession(str(onnx_path))
    input_name = ai_session.get_inputs()[0].name
    print("Light ECG CNN model loaded successfully")
except Exception as error:
    print(f"Failed to load AI model: {error}")

classic_model = None

try:
    classic_model = joblib.load(classic_model_path)
    print("Classical Random Forest model loaded")
except Exception as error:
    print(f"Failed to load classical model: {error}")


def is_pretrained_available():
    return ai_session is not None


def is_classical_available():
    return classic_model is not None


def _normalized_prediction(values_by_label):
    class_names = ["Normal", "AFib", "PVC", "LBBB", "RBBB"]
    prediction = {name: float(values_by_label.get(name, 0.0)) for name in class_names}
    total = sum(prediction.values())
    if total > 0:
        prediction = {key: float(value / total) for key, value in prediction.items()}
    return {"prediction": prediction}


def _run_onnx_with_flexible_shape(signal, session, session_input_name):
    candidates = [
        signal.reshape(1, 200),
        signal.reshape(1, 1, 200),
        signal.reshape(1, 200, 1),
    ]
    for signal_array in candidates:
        try:
            return session.run(None, {session_input_name: signal_array})[0]
        except Exception:
            continue
    raise RuntimeError("ONNX inference failed for all supported input shapes")


def _vector_to_prediction(vector):
    class_names = ["Normal", "AFib", "PVC", "LBBB", "RBBB"]
    values = np.asarray(vector, dtype=np.float32).reshape(-1)
    if values.size == 0:
        return _normalized_prediction({})
    if np.any(values < 0) or np.any(values > 1) or not np.isclose(np.sum(values), 1.0, atol=1e-2):
        probs = softmax(values)
    else:
        total = float(np.sum(values))
        probs = values / total if total > 0 else values
    mapped = {class_names[index]: float(probs[index]) for index in range(min(len(class_names), len(probs)))}
    return _normalized_prediction(mapped)


def _label_to_class_name(label):
    class_map = {0: "Normal", 1: "AFib", 2: "PVC", 3: "LBBB", 4: "RBBB"}
    if isinstance(label, str):
        return label if label in class_map.values() else None
    try:
        return class_map.get(int(label))
    except Exception:
        return None


def extract_features(signal):
    signal = np.asarray(signal, dtype=np.float32)
    q25 = np.percentile(signal, 25)
    q75 = np.percentile(signal, 75)
    fft_vals = np.abs(np.fft.fft(signal))
    fft_vals = fft_vals[: len(fft_vals) // 2]

    features = [
        np.mean(signal),
        np.std(signal),
        np.max(signal),
        np.min(signal),
        np.ptp(signal),
        np.median(signal),
        q25,
        q75,
        stats.skew(signal),
        stats.kurtosis(signal),
        np.var(signal),
        np.sqrt(np.mean(signal**2)),
        np.sum(np.abs(np.diff(signal))),
        np.sum(fft_vals),
        np.argmax(fft_vals),
    ]
    return np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0).tolist()


async def predict_ecg(parsed_data, model_type="pretrained"):
    default_prediction = {
        "prediction": {
            "Normal": 0.8,
            "AFib": 0.05,
            "PVC": 0.05,
            "LBBB": 0.05,
            "RBBB": 0.05,
        }
    }
    model_type = (model_type or "pretrained").lower()

    channels = parsed_data.get("channels", [])
    if not channels:
        return _normalized_prediction({})

    signal = np.array(parsed_data["signals"][channels[0]])

    if model_type == "pretrained":
        if ai_session is None:
            return default_prediction
        if len(signal) > 200:
            signal = signal[:200]
        elif len(signal) < 200:
            signal = np.pad(signal, (0, 200 - len(signal)), "constant")
        signal = signal.astype(np.float32)
        try:
            raw_outputs = _run_onnx_with_flexible_shape(signal, ai_session, input_name)
            return _vector_to_prediction(raw_outputs[0] if np.asarray(raw_outputs).ndim > 1 else raw_outputs)
        except Exception as error:
            print(f"ONNX Inference Error: {error}")
            return default_prediction

    if model_type == "classical":
        if classic_model is None:
            return default_prediction
        features = extract_features(signal)
        try:
            pred = classic_model.predict([features])[0]
            if hasattr(classic_model, "predict_proba"):
                probs = classic_model.predict_proba([features])[0]
                if hasattr(classic_model, "classes_"):
                    mapped = {}
                    for cls, prob in zip(classic_model.classes_, probs):
                        class_name = _label_to_class_name(cls)
                        if class_name is not None:
                            mapped[class_name] = float(prob)
                    return _normalized_prediction(mapped)
                return _vector_to_prediction(probs)

            class_name = _label_to_class_name(pred)
            if class_name is None:
                print(f"Warning: Could not map prediction '{pred}' to a known class.")
                return _normalized_prediction({})
            return _normalized_prediction({class_name: 1.0})
        except Exception as error:
            print(f"Classical Model Inference Error: {error}")
            return default_prediction

    return default_prediction
import pandas as pd
import io
import numpy as np
import joblib
from scipy import stats
from scipy.special import softmax
import onnxruntime as ort
import os

async def parse_ecg(file):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    df.columns = [c.lower() for c in df.columns]
    if "time" in df.columns:
        time = df["time"].tolist()
        channels = [c for c in df.columns if c != "time"]
    else:
        fs = 360
        time = [i / fs for i in range(len(df))]
        channels = df.columns.tolist()
    signals = {ch: df[ch].astype(float).tolist() for ch in channels}
    duration = float(time[-1]) if time else None
    return {
        "num_channels": len(channels),
        "channels": channels,
        "num_samples": len(df),
        "duration": duration,
        "time": time,
        "signals": signals
    }

base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
onnx_path = os.path.join(base_path, 'notebook', 'light_ecg_cnn_balanced.onnx')

ai_session = None
input_name = None
try:
    ai_session = ort.InferenceSession(str(onnx_path))
    input_name = ai_session.get_inputs()[0].name
    print("Light ECG CNN model loaded successfully")
except Exception as e:
    print(f"Failed to load AI model: {e}")

CLASSIC_MODEL_PATH = os.path.join(base_path, 'notebook', 'balanced_rf_ecg.pkl')
classic_model = None
try:
    classic_model = joblib.load(CLASSIC_MODEL_PATH)
    print("Classical Random Forest model loaded")
except Exception as e:
    print(f"Failed to load classical model: {e}")

def is_pretrained_available():
    return ai_session is not None

def is_classical_available():
    return classic_model is not None

def _label_to_class_name(label):
    class_map = {0: "Normal", 1: "AFib", 2: "PVC", 3: "LBBB", 4: "RBBB"}
    if isinstance(label, str):
        return label if label in class_map.values() else None
    try:
        label_idx = int(label)
        return class_map.get(label_idx)
    except Exception:
        return None

def _normalized_prediction(values_by_label):
    class_names = ["Normal", "AFib", "PVC", "LBBB", "RBBB"]
    prediction = {name: float(values_by_label.get(name, 0.0)) for name in class_names}
    total = sum(prediction.values())
    if total > 0:
        prediction = {k: float(v / total) for k, v in prediction.items()}
    return {"prediction": prediction}

def _run_onnx_with_flexible_shape(signal, session, input_name):
    candidates = [
        signal.reshape(1, 200),
        signal.reshape(1, 1, 200),
        signal.reshape(1, 200, 1),
    ]
    for signal_array in candidates:
        try:
            raw_outputs = session.run(None, {input_name: signal_array})[0]
            return raw_outputs
        except Exception:
            continue
    raise RuntimeError("ONNX inference failed for all supported input shapes")

def _vector_to_prediction(vector):
    class_names = ["Normal", "AFib", "PVC", "LBBB", "RBBB"]
    values = np.asarray(vector, dtype=np.float32).reshape(-1)
    if values.size == 0:
        return _normalized_prediction({})
    if np.any(values < 0) or np.any(values > 1) or not np.isclose(np.sum(values), 1.0, atol=1e-2):
        probs = softmax(values)
    else:
        total = float(np.sum(values))
        probs = values / total if total > 0 else values
    mapped = {class_names[i]: float(probs[i]) for i in range(min(len(class_names), len(probs)))}
    return _normalized_prediction(mapped)

def extract_features(signal):
    signal = np.asarray(signal, dtype=np.float32)
    q25 = np.percentile(signal, 25)
    q75 = np.percentile(signal, 75)
    features = [
        np.mean(signal),
        np.std(signal),
        np.max(signal),
        np.min(signal),
        np.ptp(signal),
        np.median(signal),
        q25,
        q75,
        stats.skew(signal),
        stats.kurtosis(signal),
        np.var(signal),
        np.sqrt(np.mean(signal ** 2)),
        np.mean(np.abs(signal)),
        q75 - q25,
        np.mean(np.abs(np.diff(np.signbit(signal)).astype(np.float32)))
    ]
    return np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0).tolist()

async def predict_ecg(parsed_data, model_type="pretrained"):
    default_prediction = {"prediction": {"Normal": 0.8, "AFib": 0.05, "PVC": 0.05, "LBBB": 0.05, "RBBB": 0.05}}
    model_type = (model_type or "pretrained").lower()
    
    if model_type == "pretrained":
        if ai_session is None:
            return default_prediction
            
        channels = parsed_data.get("channels", [])
        if not channels:
            return {"prediction": {}}
            
        signal = np.array(parsed_data["signals"][channels[0]])
        if len(signal) > 200:
            signal = signal[:200]
        elif len(signal) < 200:
            signal = np.pad(signal, (0, 200 - len(signal)), 'constant')
        signal = signal.astype(np.float32)
        
        try:
            raw_outputs = _run_onnx_with_flexible_shape(signal, ai_session, input_name)
            return _vector_to_prediction(raw_outputs[0] if np.asarray(raw_outputs).ndim > 1 else raw_outputs)
        except Exception as e:
            print(f"ONNX Inference Error: {e}")
            return default_prediction

    elif model_type == "classical":
        if classic_model is None:
            return default_prediction
            
        channels = parsed_data.get("channels", [])
        if not channels:
            return {"prediction": {}}
            
        signal = np.array(parsed_data["signals"][channels[0]])
        features = extract_features(signal)
        
        try:
            pred = classic_model.predict([features])[0]
            
            if hasattr(classic_model, "predict_proba"):
                probs = classic_model.predict_proba([features])[0]
                if hasattr(classic_model, "classes_"):
                    mapped = {}
                    for cls, prob in zip(classic_model.classes_, probs):
                        class_name = _label_to_class_name(cls)
                        if class_name is not None:
                            mapped[class_name] = float(prob)
                    return _normalized_prediction(mapped)
                return _vector_to_prediction(probs)
            else:
                class_name = _label_to_class_name(pred)
                if class_name is None:
                    print(f"Warning: Could not map prediction '{pred}' to a known class.")
                    return _normalized_prediction({})
                return _normalized_prediction({class_name: 1.0})
                
        except Exception as e:
            print(f"Classical Model Inference Error: {e}")
            return default_prediction
            
    return default_prediction