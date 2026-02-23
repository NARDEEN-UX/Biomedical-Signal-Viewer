from pydantic import BaseModel


class Features(BaseModel) :
    num_channels : int
    channels : list
    num_samples : int
    duration : int
    time : list
    signals : dict

class AIPredictions(BaseModel):
    ML_Predictions : dict
    DL_Predictions : dict 

class FinalOutput(BaseModel):
    features : Features
    predictions : AIPredictions