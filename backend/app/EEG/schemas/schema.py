from pydantic import BaseModel
from typing import List, Dict


class FeaturesMetadata(BaseModel) :
    num_channels : int
    channels : list
    num_samples : int
    duration : float
    # time : list
    # signals : dict

class AIPredictions(BaseModel):
    ML_Predictions : dict
    DL_Predictions : dict 

class AnalysisResponse(BaseModel):
    file_id: str #return the id
    features : FeaturesMetadata
    predictions : AIPredictions
    
class PaginatedSignalResponse(BaseModel):
    time: List[float]
    signals: Dict[str, List[float]]
    total_samples: int