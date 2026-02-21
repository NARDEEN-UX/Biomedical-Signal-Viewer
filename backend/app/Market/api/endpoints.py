from fastapi import APIRouter, UploadFile, File
from app.Market.services.analyzer import GetAnalysis
from typing import List


# Initialize the Market Router
market_router = APIRouter()

# 1 - endpoint for analysis and  predicting the future behavior 
@market_router.post('/analysis')
async def get_market(file : UploadFile = File(...)):
    return GetAnalysis(file)

# # 2 - endpoint for comparing between  2 companies
# @market_router.post('/analysis')
# async def compare(file : List[UploadFile] = File(...)):
#     return Compare2(file)





