from fastapi import APIRouter, Depends, HTTPException
import qrcode
import io
import base64
from uuid import uuid4
import redis
from ..config import settings
from ..auth import get_current_user, create_access_token

router = APIRouter()
r = redis.Redis.from_url(settings.redis_url) if settings.redis_url else None

@router.get("/qr")
def generate_qr():
    token = str(uuid4())
    img = qrcode.make(token)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {"token": token, "qr_base64": f"data:image/png;base64,{b64}"}

@router.post("/qr-token")
def issue_qr_token():
    if not r:
        raise HTTPException(status_code=500, detail="Redis not configured")
    token = str(uuid4())
    r.setex(f"qr:{token}", 180, "1")
    img = qrcode.make(token)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {"token": token, "qr_base64": f"data:image/png;base64,{b64}"}

@router.post("/confirm")
def confirm_link(token: str, user=Depends(get_current_user)):
    if not r:
        raise HTTPException(status_code=500, detail="Redis not configured")
    val = r.get(f"qr:{token}")
    if not val:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    r.delete(f"qr:{token}")
    web_jwt = create_access_token(sub=user.email, expires_minutes=settings.jwt_expires_min)
    return {"access_token": web_jwt, "token_type": "bearer"}
