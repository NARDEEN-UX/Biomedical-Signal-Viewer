from fastapi import APIRouter,File,UploadFile,HTTPException,status, Query
from app.EEG.schemas.schema import AnalysisResponse , PaginatedSignalResponse
from app.EEG.services.extract_info import FeatureExtractor
from app.EEG.services.predictions import AiPredictor
from io import BytesIO
import pandas as pd
import uuid
import json
import os

EEG_Router = APIRouter()
extractor = FeatureExtractor()
predictor = AiPredictor()

TEMP_DIR = "temp_signal_data"
os.makedirs(TEMP_DIR, exist_ok=True)


# 1 - endpoint for data extraction and ai predictions 
@EEG_Router.post('/EEG', response_model=AnalysisResponse)
async def get_info(file: UploadFile = File(...)):

    if not (file.filename.endswith(".csv") or file.filename.endswith(".parquet")):
        raise HTTPException(
            status_code=status.HTTP_406_NOT_ACCEPTABLE,
            detail="Only CSV or Parquet files allowed"
        )

    try:
        contents = await file.read()
        if file.filename.endswith(".csv"):
            # contents = await file.read()
            df = pd.read_csv(BytesIO(contents))
        else:
            # contents = await file.read()
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
        
    metadata, time_array, signals_dict = extractor.extract(df)
    predictions = predictor.predict(df)
    
    file_id = str(uuid.uuid4())
    filepath = os.path.join(TEMP_DIR, f"{file_id}.json")
    
    
    # features = extractor.extract(df)
    # predictions = predictor.predict(df)

    with open(filepath, "w") as f:
        json.dump({"time": time_array, "signals": signals_dict}, f)
        
        
    return {
        "file_id": file_id,
        "features": metadata,
        "predictions": predictions
    }
    
@EEG_Router.get('/EEG/data/{file_id}', response_model=PaginatedSignalResponse)
async def get_eeg_data(
    file_id: str, 
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(1000, ge=1, le=5000, description="Data points per page")
):
    filepath = os.path.join(TEMP_DIR, f"{file_id}.json")
    
    # Check if the file exists
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Data file not found. You must analyze a file first.")

    # Load the massive data from the disk
    with open(filepath, "r") as f:
        data = json.load(f)

    # Calculate start and end indices for pagination
    start_index = (page - 1) * limit
    end_index = start_index + limit
    total_samples = len(data["time"])

    # Slice the arrays to return only the requested chunk
    chunk_time = data["time"][start_index:end_index]
    chunk_signals = {ch: vals[start_index:end_index] for ch, vals in data["signals"].items()}

    return {
        "time": chunk_time,
        "signals": chunk_signals,
        "total_samples": total_samples
    }