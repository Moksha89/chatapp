# Akirah Backend (FastAPI)

Setup
- Python 3.12
- Install: `pip install -r requirements.txt` or use Poetry

Env (.env)
- See .env.example

Run
- `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

Migrate
- `alembic upgrade head`
