from pydantic import BaseModel



class ProfilingOutput(BaseModel):
    subjectID : str 
    bodysite : str
    age : int 
    gender : str
    shannon : float
    richness : int 
    top_diseases : list
    probs : list
    top_cols : list
    top_vals : list