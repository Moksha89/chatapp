from fastapi import APIRouter

router = APIRouter()

@router.get("/login")
def login_health():
    return {"ok": True}
