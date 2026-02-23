from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.Acoustic_Signals.api.endpoints import acoustic_router
from app.MicroBiome.api.endpoint import microbiome_rouuter
from app.Market.api.endpoints import market_router
from app.EEG.api.endpoint import EEG_Router
app = FastAPI(title="Biomedical Signal Viewer API")

# --- CHANGE 1: Add specific IP addresses ---
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",  # <--- CRITICAL: Browsers treat this differently from localhost
    "http://127.0.0.1:5173",
]

# --- CHANGE 2: Use the variable 'origins' ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,    # <--- Actually use the list we defined above
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(acoustic_router)
app.include_router(microbiome_rouuter)
app.include_router(market_router)
app.include_router(EEG_Router)
@app.get("/")
def health_check():
    return {"status": "Biomedical API is running"}

##################################