from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.ECG.schemas.schema import ECGResponse, PredictionResponse
from app.ECG.services.service import (
    is_pretrained_available,
    parse_ecg,
    predict_ecg,
)

router = APIRouter(prefix="/ecg")


@router.post("/upload", response_model=ECGResponse)
async def upload_ecg(file: UploadFile = File(...)):
    return await parse_ecg(file)


@router.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...), model: str = Form(...)):
    model = (model or "pretrained").lower()
    if model not in {"pretrained", "classical"}:
        raise HTTPException(status_code=400, detail="Model must be 'pretrained' or 'classical'.")

    if model == "pretrained" and not is_pretrained_available():
        raise HTTPException(
            status_code=503,
            detail="Pretrained ECG model is unavailable (missing ONNX artifacts).",
        )

    data = await parse_ecg(file)
    preds = await predict_ecg(data, model_type=model)
    return preds
