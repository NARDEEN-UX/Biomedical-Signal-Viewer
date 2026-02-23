# Biomedical Signal Viewer

### One platform. Five sectors. Real signal intelligence.

![Status](https://img.shields.io/badge/status-active-success)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61dafb)
![Backend](https://img.shields.io/badge/backend-FastAPI-05998b)
![Charts](https://img.shields.io/badge/charts-Plotly%20%2B%20Recharts-7c4dff)

Biomedical Signal Viewer unifies **acoustic, microbiome, market, EEG, and ECG workflows** in one full-stack app.

- 🎛️ **Frontend:** React + Vite
- ⚡ **Backend:** FastAPI + modular services
- 📊 **Visualization:** Plotly + Recharts

### Why it stands out

- 🔗 **Unified workflow:** upload, analyze, and visualize in one place
- 🧠 **Cross-domain intelligence:** biomedical + acoustic + market analytics together
- 🚀 **Demo-ready modules:** Acoustic, Market, and Microbiome are ready to run now

---

## At a Glance

| Sector | Frontend | Backend | Status |
|---|---|---|---|
| Acoustic | ✅ | ✅ | Ready |
| Market | ✅ | ✅ | Ready |
| Microbiome | ✅ | ✅ | Ready |
| EEG | ⚠️ Placeholder page | ✅ | API ready |
| ECG | ⚠️ Placeholder page | ⚠️ | Planned |

![Home Dashboard Screenshot](docs/media/screenshots/home-dashboard.png)

🎬 **Watch Demo:** [Home Walkthrough](docs/media/videos/home-walkthrough.mp4)

<video controls width="100%" src="docs/media/videos/home-walkthrough.mp4">
  Your browser does not support the video tag.
</video>

---

## Architecture

```text
React (Vite)
   |
   | HTTP (axios)
   v
FastAPI (Uvicorn)
   ├── Acoustic_Signals
   ├── Market
   ├── MicroBiome
   └── EEG
```

Local endpoints:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`

---

## Explore by Sector

### 1) Acoustic (`/acoustic`) — Motion, sound, and detection

End-to-end acoustic workflows:

- **Doppler Simulation** → `POST /doppler_generation`
- **Velocity/Frequency Estimation** (`.wav/.mp3`) → `POST /extract_coef`
- **AI Submarine Detection** (`.wav/.mp3`) → `POST /submarine_detection`

Outputs: waveform visualization, estimated coefficients, ML/DL confidence, and final threat label.

![Acoustic Overview](docs/media/screenshots/acoustic-overview.png)
![Doppler Simulation](docs/media/screenshots/acoustic-doppler-sim.png)
![Submarine Detection](docs/media/screenshots/acoustic-submarine-detection.png)

🎬 **Watch Demo:** [Acoustic Demo](docs/media/videos/acoustic-demo.mp4)

<video controls width="100%" src="docs/media/videos/acoustic-demo.mp4">
  Your browser does not support the video tag.
</video>

### 2) Market (`/stock`) — Analyze trends, compare assets, predict movement

Two quantitative dashboards:

- **Single Asset Analysis** (`POST /analysis`)
  - OHLC candlestick, MA overlay, Bollinger Bands, volatility, future forecast
- **Compare Two Assets** (`POST /compare`)
  - Relative performance, seasonality, crossover analysis

![Market Intro](docs/media/screenshots/market-intro.png)
![Market Analysis](docs/media/screenshots/market-analysis.png)
![Market Comparison](docs/media/screenshots/market-compare.png)

🎬 **Watch Demo:** [Market Demo](docs/media/videos/market-demo.mp4)

<video controls width="100%" src="docs/media/videos/market-demo.mp4">
  Your browser does not support the video tag.
</video>

### 3) Microbiome (`/microbiome`) — Track gut dynamics over time

Longitudinal profiling from `.csv/.tsv` uploads via `POST /microbiome`.

Core insights:

- Top taxa stacked composition
- Fecal calprotectin overlays
- Protective vs opportunistic bacteria trends
- Health/Shannon index signals
- PCA trajectory with stability insights

![Microbiome Dashboard](docs/media/screenshots/microbiome1.png)
![Microbiome Clinical Panel](docs/media/screenshots/microbiome-clinical.png)

🎬 **Watch Demo:** [Microbiome Demo](docs/media/videos/microbiome-demo.mp4)

<video controls width="100%" src="docs/media/videos/microbiome-demo.mp4">
  Your browser does not support the video tag.
</video>

### 4) EEG (`/eeg`) — API-ready, UI expansion pending

- UI page is currently placeholder.
- API is active: `POST /EEG` (`.csv/.parquet`).
- Response includes cleaned feature package + AI prediction dictionaries.

![EEG Page](docs/media/screenshots/eeg-page.png)

🎬 **Watch Demo:** [EEG Demo](docs/media/videos/eeg-demo.mp4)

<video controls width="100%" src="docs/media/videos/eeg-demo.mp4">
  Your browser does not support the video tag.
</video>

### 5) ECG (`/ecg`) — Placeholder today, roadmap target

- UI page exists as placeholder.
- Dedicated backend ECG pipeline is not connected yet.

![ECG Page](docs/media/screenshots/ecg-page.png)

🎬 **Watch Demo:** [ECG Demo](docs/media/videos/ecg-demo.mp4)

<video controls width="100%" src="docs/media/videos/ecg-demo.mp4">
  Your browser does not support the video tag.
</video>

---

## API Quick Reference

Fast endpoints, organized by domain:

### Acoustic

- `POST /doppler_generation` → generated signal + time arrays
- `POST /extract_coef` → `velocity`, `frequency`, sampled `signal`
- `POST /submarine_detection` → ML/DL/mixed confidence + `label`

### Market

- `POST /analysis?ma_window=&pred_steps=` → OHLC, MA, Bollinger, volatility, forecast
- `POST /compare?ma_short=&ma_long=&season_period=` → pairwise trend metrics

### Microbiome

- `POST /microbiome` → participant profile, indices, top taxa, PCA

### EEG

- `POST /EEG` → extracted features + prediction dictionaries

---

## Quick Start

Run backend + frontend in under 3 minutes.

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements_back.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Data & Media Paths

- Market sample data: `backend/app/Market/test_data/`
- Microbiome sample data: `backend/app/MicroBiome/test_patients/`
- Acoustic models/assets: `backend/app/Acoustic_Signals/notebook/`
- Media checklists:
  - `docs/media/README.md`
  - `docs/media/screenshots/README.md`
  - `docs/media/videos/README.md`

---

## Troubleshooting

- **CORS issues:** run frontend on `localhost:5173` or `127.0.0.1:5173`
- **File parsing errors:** verify extension matches endpoint requirements
- **Model inference errors:** verify acoustic model files exist in `backend/app/Acoustic_Signals/notebook/`
- **No charts:** check backend is running and inspect browser network calls

---

## Roadmap

Next high-impact upgrades:

- Complete EEG interactive frontend
- Implement ECG backend + visualization flow
- Add auth + analysis history
- Add API/UI automated tests
