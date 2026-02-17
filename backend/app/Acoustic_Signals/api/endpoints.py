from fastapi import APIRouter
from app.Acoustic_Signals.schemas.schema import GenerationInput, GeneratedSignal
from app.Acoustic_Signals.services.generate_signal import generate_signal
from fastapi   import UploadFile, File
from app.Acoustic_Signals.services.extract_coef import extract_coef
from app.Acoustic_Signals.services.get_prediction import get_prediction

acoustic_router = APIRouter()



# 1 - endpoint  for generating doppler 

@acoustic_router.post("/doppler_generation")
async def GenerateDoppler(Input : GenerationInput ):
    input_dict = Input
    return generate_signal(input_dict.velocity,input_dict.frequency,input_dict.duration,input_dict.num_points_per_second)


# 2 - endpoint for extracting the velocity and frequency from audio files

@acoustic_router.post("/extract_coef")
async def ExtractCoef(file : UploadFile = File(...)):
       return   extract_coef(file)
    


# 3 - endpoint for the AI models

@acoustic_router.post("/submarine_detection")
async def GetPrediction(file : UploadFile = File(...)):
      return get_prediction(file)