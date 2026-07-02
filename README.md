# BreathQuest

A breath-training game platform for kids and therapists.

## Structure
- `frontend/` — React + Vite web app (6 canvas games)
- `backend/` — FastAPI + PostgreSQL REST API  
- `game/` — Pygame desktop prototype

## Running locally

### Backend
cd backend && python -m venv backenv && source backenv/bin/activate && pip install -r requirements.txt && uvicorn main:app --reload

### Frontend
cd frontend && npm install && npm run dev
