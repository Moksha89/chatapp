from fastapi import APIRouter
import qrcode
import io
import base64
from uuid import uuid4

router = APIRouter()

@router.get("/qr")
def generate_qr():
    token = str(uuid4())
    img = qrcode.make(token)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {"token": token, "qr_base64": f"data:image/png;base64,{b64}"}
