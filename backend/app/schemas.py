from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserCreate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    name: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    name: Optional[str] = None
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class OtpRequest(BaseModel):
    phone: str

class OtpVerify(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None

class ConversationMetaUpdate(BaseModel):
    pinned: Optional[bool] = None
    starred: Optional[bool] = None
    labels: Optional[List[str]] = None

class ConversationOut(BaseModel):
    id: int
    title: str
    last_message: str | None = None
    unread_count: int = 0
    pinned: Optional[bool] = False
    starred: Optional[bool] = False
    labels: Optional[List[str]] = None
    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    body: str = ""
    conversation_id: Optional[int] = None
    to_user_id: Optional[int] = None
    attachment_url: Optional[str] = None
    attachment_mime: Optional[str] = None
    reply_to_id: Optional[int] = None

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    body: str
    attachment_url: Optional[str] = None
    attachment_mime: Optional[str] = None
    reply_to_id: Optional[int] = None
    deleted_for_everyone: Optional[bool] = False
    delivered: Optional[bool] = False
    seen: Optional[bool] = False
    class Config:
        from_attributes = True

class MessageAction(BaseModel):
    star: Optional[bool] = None
    delete_for_me: Optional[bool] = None
    delete_for_everyone: Optional[bool] = None
