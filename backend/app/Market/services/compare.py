import pandas as pd 
import numpy as np 
from statsmodels.tsa.seasonal import seasonal_decompose
import warnings
from fastapi import HTTPException, status, UploadFile

warnings.filterwarnings("ignore")

class Compare2Comapnies:
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
    
    def clean_2_files(self, files: list[UploadFile]):
        if len(files) != 2:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Exactly two files are required for comparison.")
        
        cleaned_files = []
        for file in files:
            cleaned_files.append(self._clean(file))
        return cleaned_files

    def _replace_nan(self, series):
        return series.replace({np.nan: None}).tolist()

    def get_pct_comparison(self, close_price):
        pct_comp = ((close_price / close_price.iloc[0]) - 1) * 100
        return self._replace_nan(pct_comp)

    def get_ma_cross(self, close_price, short_window, long_window):
        ma_short = close_price.rolling(window=short_window).mean()
        ma_long = close_price.rolling(window=long_window).mean()
        return {
            "ma_short": self._replace_nan(ma_short),
            "ma_long": self._replace_nan(ma_long)
        }

    def get_seasonality(self, close_price, period):
        clean_close = close_price.dropna()
        if len(clean_close) < period * 2: 
            empty_series = pd.Series(index=close_price.index, dtype=float)
            return self._replace_nan(empty_series)
            
        decompose_result = seasonal_decompose(clean_close, model='additive', period=period)
        seasonality = decompose_result.seasonal.reindex(close_price.index)
        return self._replace_nan(seasonality)

    def compare(self, files: list[UploadFile], ma_short: int, ma_long: int, season_period: int):
        df1, df2 = self.clean_2_files(files)
        
        time_axis1 = df1.index.strftime('%Y-%m-%d').tolist()
        time_axis2 = df2.index.strftime('%Y-%m-%d').tolist()

        return {
            "asset_1": {
                "filename": files[0].filename,
                "time_axis": time_axis1,
                "pct_comparison": self.get_pct_comparison(df1['Close'].copy()),
                "ma_cross": self.get_ma_cross(df1['Close'].copy(), ma_short, ma_long),
                "seasonality": self.get_seasonality(df1['Close'].copy(), season_period)
            },
            "asset_2": {
                "filename": files[1].filename,
                "time_axis": time_axis2,
                "pct_comparison": self.get_pct_comparison(df2['Close'].copy()),
                "ma_cross": self.get_ma_cross(df2['Close'].copy(), ma_short, ma_long),
                "seasonality": self.get_seasonality(df2['Close'].copy(), season_period)
            }
        }