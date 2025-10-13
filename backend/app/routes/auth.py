from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from ..db import get_db
from ..models import User
from ..schemas import UserCreate, UserOut, Token, OtpRequest, OtpVerify
from ..auth import hash_password, verify_password, create_access_token
from ..config import settings

import random
import redis

router = APIRouter()

def _redis():
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)

@router.post("/register", response_model=UserOut)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    if user_in.email:
        existing = db.query(User).filter(User.email == user_in.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
    if user_in.phone:
        existing_p = db.query(User).filter(User.phone == user_in.phone).first()
        if existing_p:
            raise HTTPException(status_code=400, detail="Phone already registered")
    name_default = (user_in.email.split("@")[0] if user_in.email else (user_in.phone or "user"))
    user = User(
        email=user_in.email,
        phone=user_in.phone,
        name=user_in.name or name_default,
        password_hash=hash_password(user_in.password) if user_in.password else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not user.password_hash or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    sub = user.phone or user.email or str(user.id)
    token = create_access_token(sub=sub, expires_minutes=settings.jwt_expires_min)
    return {"access_token": token, "token_type": "bearer"}

@router.post("/otp/request")
def otp_request(body: OtpRequest):
    if not body.phone:
        raise HTTPException(status_code=400, detail="Phone required")
    r = _redis()
    if r.get(f"otp:cooldown:{body.phone}"):
        raise HTTPException(status_code=429, detail="Please wait before requesting another OTP")
    code = f"{random.randint(100000, 999999)}"
    r.setex(f"otp:{body.phone}", 300, code)
    r.setex(f"otp:cooldown:{body.phone}", 30, "1")
    return {"sent": True, "phone": body.phone, "otp_debug": code}

@router.post("/otp/verify", response_model=Token)
def otp_verify(body: OtpVerify, db: Session = Depends(get_db)):
    r = _redis()
    key = f"otp:{body.phone}"
    saved = r.get(key)
    if not saved or saved != body.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    user = db.query(User).filter(User.phone == body.phone).first()
    if not user:
        user = User(phone=body.phone, name=body.name or body.phone)
        db.add(user)
        db.commit()
        db.refresh(user)
    r.delete(key)
    sub = user.phone or user.email or str(user.id)
    token = create_access_token(sub=sub, expires_minutes=settings.jwt_expires_min)
    return {"access_token": token, "token_type": "bearer"}
