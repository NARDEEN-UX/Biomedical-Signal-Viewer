import pandas as pd
import io
import numpy as np
from pathlib import Path
import joblib
from scipy import stats
from scipy.special import softmax
import onnxruntime as ort

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

MODEL_PATH = Path(__file__).parent / "models" / "light_ecg_cnn_balanced.onnx"

ai_session = None
input_name = None
try:
    ai_session = ort.InferenceSession(str(MODEL_PATH))
    input_name = ai_session.get_inputs()[0].name
    print("Light ECG CNN model loaded successfully")
except Exception as e:
    print(f"Failed to load AI model: {e}")

CLASSIC_MODEL_PATH = Path(__file__).parent / "models" / "balanced_rf_ecg.pkl"
classic_model = None
try:
    classic_model = joblib.load(CLASSIC_MODEL_PATH)
    print("Classical Random Forest model loaded")
except Exception as e:
    print(f"Failed to load classical model: {e}")

def extract_features(signal):
    return [
        np.mean(signal),
        np.std(signal),
        np.max(signal),
        np.min(signal),
        np.ptp(signal),
        np.median(signal),
        np.percentile(signal, 25),
        np.percentile(signal, 75),
        stats.skew(signal),
        stats.kurtosis(signal)
    ]

async def predict_ecg(parsed_data, model_type="pretrained"):
    if model_type == "pretrained":
        if ai_session is None:
            return {
                "prediction": {
                    "Normal": 0.8,
                    "AFib": 0.05,
                    "PVC": 0.05,
                    "LBBB": 0.05,
                    "RBBB": 0.05
                }
            }
        channels = parsed_data["channels"]
        if not channels:
            return {"prediction": {}}
        signal = np.array(parsed_data["signals"][channels[0]])
        if len(signal) > 200:
            signal = signal[:200]
        elif len(signal) < 200:
            signal = np.pad(signal, (0, 200 - len(signal)), 'constant')
            
        # Format specifically for ONNX: shape [1, 200], float32
        signal_array = signal.astype(np.float32).reshape(1, 200)
        
        # Run inference using ONNX
        raw_outputs = ai_session.run(None, {input_name: signal_array})[0]
        probs = softmax(raw_outputs, axis=1)
        preds = probs[0].tolist()
        
        class_map = {0: "Normal", 1: "AFib", 2: "PVC", 3: "LBBB", 4: "RBBB"}
        print(f"Predictions: {dict(zip(class_map.values(), preds))}")
        return {
            "prediction": {
                class_map[i]: float(preds[i])
                for i in range(len(preds))
            }
        }
    elif model_type == "classical":
        if classic_model is None:
            return {
                "prediction": {
                    "Normal": 0.8,
                    "AFib": 0.05,
                    "PVC": 0.05,
                    "LBBB": 0.05,
                    "RBBB": 0.05
                }
            }
        channels = parsed_data["channels"]
        if not channels:
            return {"prediction": {}}
        signal = np.array(parsed_data["signals"][channels[0]])
        features = extract_features(signal)
        pred = classic_model.predict([features])[0]
        if hasattr(classic_model, "predict_proba"):
            probs = classic_model.predict_proba([features])[0]
        else:
            probs = np.zeros(5)
            probs[int(pred)] = 1.0
        class_map = {0: "Normal", 1: "AFib", 2: "PVC", 3: "LBBB", 4: "RBBB"}
        return {
            "prediction": {
                class_map[i]: float(probs[i])
                for i in range(5)
            }
        }
    else:
        return {
            "prediction": {
                "Normal": 0.8,
                "AFib": 0.05,
                "PVC": 0.05,
                "LBBB": 0.05,
                "RBBB": 0.05
            }
        }