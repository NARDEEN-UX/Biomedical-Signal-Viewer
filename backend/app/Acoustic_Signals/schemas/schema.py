from pydantic import BaseModel, Field



class GenerationInput(BaseModel):
    velocity: float = Field(..., description="Velocity of the source (m/s)")
    frequency: float = Field(..., gt=0, description="Source frequency (Hz)")
    duration: float = Field(..., gt=0, description="Signal duration (seconds)")
    num_points_per_second: int = Field(default=4000, gt=0)


class GeneratedSignal(BaseModel):
    Signal : list
    Time : list

class Coef(BaseModel):
    velocity : float
    frequency : float 
    signal : list
