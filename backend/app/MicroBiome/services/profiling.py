import numpy as np
import pandas as pd
from fastapi import UploadFile, File, HTTPException, status
pd.Int64Index = pd.Index 

import joblib
import os
from app.MicroBiome.schemas.schema import ProfilingOutput

class Profiling:
    def __init__(self):     
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            base_path = os.path.dirname(current_dir)
            ml_path = os.path.join(base_path, 'notebook', 'xgb_model.pkl')
            
            # Check if file exists to prevent silent failures
            if not os.path.exists(ml_path):
                print(f"WARNING: Model file not found at {ml_path}")
                self.ml_model = None
            else:
                self.ml_model = joblib.load(ml_path)
                
                # --- THE XGBOOST FIXES ---
                # Give Scikit-learn the dummy attributes it is looking for
                if not hasattr(self.ml_model, 'use_label_encoder'):
                    self.ml_model.use_label_encoder = False
                if not hasattr(self.ml_model, 'enable_categorical'):
                    self.ml_model.enable_categorical = False
                if not hasattr(self.ml_model, 'predictor'):
                    self.ml_model.predictor = None

        except Exception as e:
            print(f"Error loading model: {e}")
            self.ml_model = None

        self.top_diseases = ["n", 't2d', "obesity", "cirrhosis", "ibd_ulcerative_colitis", "cancer"]

    def profiling(self, df: pd.DataFrame) -> ProfilingOutput:
        if self.ml_model is None:
            raise ValueError("ML Model failed to load.")

        row = df.iloc[0]

        # Extract metadata securely
        subjectID = row.get('subjectID')
        if isinstance(subjectID, np.generic): 
            subjectID = subjectID.item()
            
        bodysite = str(row.get('bodysite')) if pd.notna(row.get('bodysite')) else None
        
        # --- THE AGE FIX ---
        age_raw = row.get('age')
        try:
            # Try to convert to float first (in case of '25.0'), then int
            age = int(float(age_raw))
        except (ValueError, TypeError):
            # If it says 'nd' or is missing entirely, default to 0
            age = 0
            
        gender = str(row.get('gender')) if pd.notna(row.get('gender')) else None

        # Filter microbiome columns safely
        valid_columns = [col for col in df.columns if "s__" in col and "t__" not in col]
        
        if not valid_columns:
            raise ValueError("No valid microbiome (s__) columns found.")

        microbe_series = row[valid_columns].astype(float) 
        microbe_df = df.iloc[[0]][valid_columns] 

        # Calculate Indices
        shannon = float(-(microbe_series/100 * np.log(microbe_series/100 + 1e-9)).sum())
        richness = int((microbe_series > 0).sum())

        # Model Predictions
        probs_array = self.ml_model.predict_proba(microbe_df)
        probs = probs_array[0].tolist()  

        # Top 10 columns and values
        top10 = microbe_series.nlargest(10)
        top_cols = top10.index.tolist()
        top_vals = top10.values.tolist() 

        # Return as a Pydantic schema
        return ProfilingOutput(
            subjectID=str(subjectID),
            bodysite=bodysite,
            age=age,  # Safely parsed as an int
            gender=gender,
            shannon=shannon,
            richness=richness,
            top_diseases=self.top_diseases,
            probs=probs,
            top_cols=top_cols,
            top_vals=top_vals
        )

profile_runner = Profiling()


async def GetProfile(file: UploadFile = File(...)):
    if not (file.filename.endswith(".csv") or file.filename.endswith(".tsv")):
        raise HTTPException(status_code=status.HTTP_406_NOT_ACCEPTABLE, detail="Only CSV or TSV files allowed")
    
    # Read the file bytes into a pandas DataFrame
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(file.file)
        else:
            df = pd.read_csv(file.file, sep='\t')
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not parse file")
        
    if df.empty:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    results = profile_runner.profiling(df) 
    return results