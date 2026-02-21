from pydantic import BaseModel
from typing import List, Optional

class AnalysisOutput(BaseModel):
    time_axis: List[str]
    open: List[Optional[float]]
    high: List[Optional[float]]
    low: List[Optional[float]]
    close: List[Optional[float]]
    MA_overlay: List[Optional[float]]
    Bollinger_Bands: dict 
    volatility: List[Optional[float]]
    prediction_dates: List[str]
    prediction_values: List[Optional[float]]

class MACrossData(BaseModel):
    ma_short: List[Optional[float]]
    ma_long: List[Optional[float]]

class AssetComparisonData(BaseModel):
    filename: str
    time_axis: List[str]
    pct_comparison: List[Optional[float]]
    ma_cross: MACrossData
    seasonality: List[Optional[float]]

class ComparisonOutput(BaseModel):
    asset_1: AssetComparisonData
    asset_2: AssetComparisonData