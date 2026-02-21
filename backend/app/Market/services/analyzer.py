import pandas as pd 
import numpy as np 
from statsmodels.tsa.arima.model import ARIMA
import warnings
from fastapi import HTTPException, status, UploadFile

# Ignore statsmodels convergence warnings to keep your server logs clean
warnings.filterwarnings("ignore")

class MarketAnalyzer:
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
        
    def get_prediction(self, close_price, steps):
        model = ARIMA(close_price.dropna(), order=(5, 1, 0))
        fitted_model = model.fit()
        forecast = fitted_model.forecast(steps=steps)
        last_date = close_price.index[-1]
        future_dates = [(last_date + pd.Timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, steps + 1)]
        return future_dates, forecast.tolist()
        
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


