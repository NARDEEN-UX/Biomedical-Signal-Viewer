import pandas as pd 
import numpy as np 
from statsmodels.tsa.arima.model import ARIMA
from dataclasses import dataclass
import warnings
from app.Market.schemas.schema import AnalysisOutput
from fastapi import HTTPException, status, UploadFile, File

# Ignore statsmodels convergence warnings to keep your server logs clean
warnings.filterwarnings("ignore")

class MarketAnalyzer:
    def _clean(self, file):
        df = file 
        df.rename(columns={df.columns[0]: 'Date'}, inplace=True)
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)
        df = df.ffill() 
        df = df[~df.index.duplicated(keep='first')]  
        df.dropna(inplace=True) 
        return df
    
    def _replace_nan(self, series):
        # FastAPI cannot serialize 'NaN' into JSON. This cleanly converts them to 'None'.
        return series.replace({np.nan: None}).tolist()
    
    def get_MA(self, close_price):
        ma = close_price.rolling(window=20).mean()
        return self._replace_nan(ma)
        
    def get_Bollinger_Bands(self, close_price):
        da_20 = close_price.rolling(window=20).mean() 
        std_20 = close_price.rolling(window=20).std()
        upper = da_20 + 2 * std_20
        lower = da_20 - 2 * std_20
        return {
            "Moving average": self._replace_nan(da_20), 
            "upper": self._replace_nan(upper), 
            "lower": self._replace_nan(lower) 
        }
        
    def get_volatility(self, close_price):
        daily_return = close_price.pct_change()
        std_20 = daily_return.rolling(window=20).std()
        Annualized_Volatility = std_20 * np.sqrt(252)
        return self._replace_nan(Annualized_Volatility)
        
    def get_prediction(self, close_price, steps=30):
        # 1. Initialize and train the ARIMA model (5 lags, 1 difference, 0 moving average)
        model = ARIMA(close_price.dropna(), order=(5, 1, 0))
        fitted_model = model.fit()
        
        # 2. Forecast the next 'steps' (default 30 days)
        forecast = fitted_model.forecast(steps=steps)
        
        # 3. Generate the future dates for the X-axis
        last_date = close_price.index[-1]
        future_dates = [(last_date + pd.Timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, steps + 1)]
        
        return future_dates, forecast.tolist()
        
    def do_analysis(self, csv_file):
        df = self._clean(csv_file)
        time_axis = df.index.strftime('%Y-%m-%d').tolist()
        
        ma_overlay = self.get_MA(df['Close'].copy())
        bol_bands = self.get_Bollinger_Bands(df['Close'].copy())
        volatility = self.get_volatility(df['Close'].copy())
        
        # Execute the prediction algorithm
        pred_dates, pred_values = self.get_prediction(df['Close'].copy(), steps=30)

        return AnalysisOutput(
            time_axis=time_axis,
            open=df['Open'].tolist(),
            high=df['High'].tolist(),
            low=df['Low'].tolist(), 
            close=df['Close'].tolist(),
            MA_overlay=ma_overlay,
            Bollinger_Bands=bol_bands,
            volatility=volatility,
            prediction_dates=pred_dates,       
            prediction_values=pred_values      
        )

analyzer  = MarketAnalyzer()


async def GetAnalysis(file: UploadFile = File(...)):
    if not (file.filename.endswith(".csv") or file.filename.endswith(".tsv")):
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Only CSV or TSV files allowed")
    
    # Read the file bytes into a pandas DataFrame
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(file.file,header=0, skiprows=[1, 2])
        else:
            df = pd.read_csv(file.file, sep='\t',header=0, skiprows=[1, 2])
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not parse file")
        
    if df.empty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    results = analyzer.do_analysis(df) 
    return results