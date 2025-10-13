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

def _devices_key(user_id: int) -> str:
    return f"link:devices:{user_id}"

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
    device_id = str(uuid4())
    r.hset(_devices_key(user.id), device_id, "web")
    sub = user.phone or user.email or str(user.id)
    web_jwt = create_access_token(sub=sub, expires_minutes=settings.jwt_expires_min)
    return {"access_token": web_jwt, "token_type": "bearer", "device_id": device_id}

@router.get("/devices")
def list_devices(user=Depends(get_current_user)):
    if not r:
        raise HTTPException(status_code=500, detail="Redis not configured")
    data = r.hgetall(_devices_key(user.id))
    out = [{"id": k.decode(), "name": v.decode()} for k, v in data.items()]
    return out

@router.delete("/devices/{device_id}")
def revoke_device(device_id: str, user=Depends(get_current_user)):
    if not r:
        raise HTTPException(status_code=500, detail="Redis not configured")
    r.hdel(_devices_key(user.id), device_id)
    return {"ok": True}
