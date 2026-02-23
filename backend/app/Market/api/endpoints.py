from fastapi import APIRouter, UploadFile, File, Query
# Import your classes and schemas
from app.Market.services.analyzer import MarketAnalyzer
from app.Market.services.compare import Compare2Comapnies
from app.Market.schemas.schema import AnalysisOutput, ComparisonOutput

# Initialize the Router and your classes
market_router = APIRouter()
analyzer = MarketAnalyzer()
comparator = Compare2Comapnies()

# 1 - Endpoint for single asset analysis and predicting future behavior
@market_router.post('/analysis', response_model=AnalysisOutput)
async def get_market(
    file: UploadFile = File(...),
    ma_window: int = Query(20, description="Moving Average window size (e.g., 20)"),
    pred_steps: int = Query(30, description="Number of days to forecast into the future")
):
    results = analyzer.do_analysis(file, ma_window=ma_window, pred_steps=pred_steps)
    return results

# 2 - Endpoint for comparing two companies
@market_router.post('/compare', response_model=ComparisonOutput)
async def compare_markets(
    file1: UploadFile = File(..., description="First company CSV"), 
    file2: UploadFile = File(..., description="Second company CSV"),

    ma_short: int = Query(50, description="Short Moving Average (e.g., 50)"),
    ma_long: int = Query(200, description="Long Moving Average (e.g., 200)"),
    season_period: int = Query(30, description="Seasonality period (e.g., 30 for monthly)")
):
    files = [file1, file2]
    results = comparator.compare(files, ma_short=ma_short, ma_long=ma_long, season_period=season_period)
    return results