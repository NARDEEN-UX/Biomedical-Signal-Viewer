from fastapi import APIRouter,File,UploadFile,HTTPException,status
from app.EEG.schemas.schema import FinalOutput
from app.EEG.services.extract_info import FeatureExtractor
from app.EEG.services.predictions import AiPredictor
from io import BytesIO
import pandas as pd
EEG_Router = APIRouter()
extractor = FeatureExtractor()
predictor = AiPredictor()
# 1 - endpoint for data extraction and ai predictions 
@EEG_Router.post('/EEG', response_model=FinalOutput)
async def get_info(file: UploadFile = File(...)):

    if not (file.filename.endswith(".csv") or file.filename.endswith(".parquet")):
        raise HTTPException(
            status_code=status.HTTP_406_NOT_ACCEPTABLE,
            detail="Only CSV or Parquet files allowed"
        )

    try:
        if file.filename.endswith(".csv"):
            contents = await file.read()
            df = pd.read_csv(BytesIO(contents))
        else:
            contents = await file.read()
            df = pd.read_parquet(BytesIO(contents))

    except Exception as e:
        print("ERROR:", e)   # 🔥 helps debugging
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not parse file"
        )

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty"
        )

    features = extractor.extract(df)
    predictions = predictor.predict(df)

    return {
        "features": features,
        "predictions": predictions
    }