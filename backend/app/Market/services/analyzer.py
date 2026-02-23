import os
import joblib
import numpy as np
import pandas as pd
from fastapi import HTTPException, status
import onnxruntime as rt
from fastapi import HTTPException, status, UploadFile

class MarketAnalyzer:
    def __init__(self):
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.scaler = os.path.join(base_path, 'notebook', 'universal_scalers.save')
        self.lstm_model = os.path.join(base_path, 'notebook', 'universal_lstm.onnx')

    def _clean(self, file: UploadFile):
        if not (file.filename.endswith(".csv") or file.filename.endswith(".tsv")):
            raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Only CSV or TSV files allowed")
        try:
            if file.filename.endswith(".csv"):
                df = pd.read_csv(file.file, header=0, skiprows=[1, 2])
            else:
                df = pd.read_csv(file.file, sep='\t', header=0, skiprows=[1, 2])
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not parse file")
            
        if df.empty:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

        df.rename(columns={df.columns[0]: 'Date'}, inplace=True)
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        df = df.ffill() 
        df = df[~df.index.duplicated(keep='first')]  
        df.dropna(inplace=True) 
        return df
    
    def _replace_nan(self, series):
        return series.replace({np.nan: None}).tolist()
    
    def get_MA(self, close_price, window):
        ma = close_price.rolling(window=window).mean()
        return self._replace_nan(ma)
        
    def get_Bollinger_Bands(self, close_price, window):
        da = close_price.rolling(window=window).mean() 
        std = close_price.rolling(window=window).std()
        upper = da + 2 * std
        lower = da - 2 * std
        return {
            "Moving average": self._replace_nan(da), 
            "upper": self._replace_nan(upper), 
            "lower": self._replace_nan(lower) 
        }
        
    def get_volatility(self, close_price):
        daily_return = close_price.pct_change()
        std_20 = daily_return.rolling(window=20).std()
        Annualized_Volatility = std_20 * np.sqrt(252)
        return self._replace_nan(Annualized_Volatility)
        
    def get_prediction(self, close_price: pd.Series, steps: int):
            LOOKBACK = 60

            if not os.path.exists(self.scaler) or not os.path.exists(self.lstm_model):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Model or scaler file not found"
                )

            scaler = joblib.load(self.scaler)["AAPL"]
            close_series = close_price.dropna().values.reshape(-1, 1)

            if len(close_series) < LOOKBACK:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Not enough data. Minimum required: {LOOKBACK}"
                )

            scaled_data = scaler.transform(close_series)

            # Take last window
            current_sequence = scaled_data[-LOOKBACK:].reshape(1, LOOKBACK, 1)

            # Load ONNX model
            sess = rt.InferenceSession(self.lstm_model)
            input_name = sess.get_inputs()[0].name

            predictions = []

            # Recursive prediction
            for _ in range(steps):
                next_pred = sess.run(None, {input_name: current_sequence.astype(np.float32)})[0]
                predictions.append(next_pred[0][0])

                next_pred_reshaped = next_pred.reshape(1, 1, 1)
                current_sequence = np.concatenate(
                    (current_sequence[:, 1:, :], next_pred_reshaped),
                    axis=1
                )

            predictions = np.array(predictions).reshape(-1, 1)
            predictions_real = scaler.inverse_transform(predictions).flatten()

            last_date = close_price.index[-1]
            future_dates = [
                (last_date + pd.Timedelta(days=i)).strftime('%Y-%m-%d')
                for i in range(1, steps + 1)
            ]

            return future_dates, predictions_real.tolist()
    def do_analysis(self, file: UploadFile, ma_window: int, pred_steps: int):
        df = self._clean(file)
        time_axis = df.index.strftime('%Y-%m-%d').tolist()
        
        ma_overlay = self.get_MA(df['Close'].copy(), window=ma_window)
        bol_bands = self.get_Bollinger_Bands(df['Close'].copy(), window=ma_window)
        volatility = self.get_volatility(df['Close'].copy())
        pred_dates, pred_values = self.get_prediction(df['Close'].copy(), steps=pred_steps)

        # We return a dictionary here; the Router will convert it to the Pydantic schema
        return {
            "time_axis": time_axis,
            "open": df['Open'].tolist(),
            "high": df['High'].tolist(),
            "low": df['Low'].tolist(), 
            "close": df['Close'].tolist(),
            "MA_overlay": ma_overlay,
            "Bollinger_Bands": bol_bands,
            "volatility": volatility,
            "prediction_dates": pred_dates,       
            "prediction_values": pred_values       
        }


