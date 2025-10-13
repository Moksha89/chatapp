from pydantic import BaseModel, EmailStr
from typing import Optional

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: Optional[str] = None
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
from typing import List, Optional
from pydantic import BaseModel

class ConversationOut(BaseModel):
    id: int
    title: str
    last_message: str | None = None
    unread_count: int = 0
    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    body: str
    conversation_id: Optional[int] = None
    to_user_id: Optional[int] = None

class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    body: str
    class Config:
        from_attributes = True
