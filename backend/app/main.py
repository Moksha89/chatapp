from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import auth, link
from .config import settings
from .ws import router as ws_router

app = FastAPI(title="Akirah API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from .db import Base, engine
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

from fastapi.staticfiles import StaticFiles
app.mount("/static/uploads", StaticFiles(directory="/opt/akirah/uploads"), name="uploads")


@app.get("/api/health")
def health():
    return {"ok": True, "name": "Akirah"}

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
from .routes import messages
app.include_router(messages.router, prefix="/api", tags=["messages"])

app.include_router(link.router, prefix="/api/link", tags=["link"])
app.include_router(ws_router)
