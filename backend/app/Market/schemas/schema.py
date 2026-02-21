from pydantic import BaseModel



class AnalysisOutput(BaseModel):
    time_axis: list
    open: list 
    high: list
    low: list 
    close: list
    MA_overlay: list 
    Bollinger_Bands: dict 
    volatility: list
    prediction_dates: list
    prediction_values: list