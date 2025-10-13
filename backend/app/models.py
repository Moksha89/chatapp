from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ConversationMeta(Base):
    __tablename__ = "conversation_meta"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    pinned = Column(Boolean, default=False)
    starred = Column(Boolean, default=False)
    labels = Column(String(512), nullable=True)

class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    body = Column(Text, nullable=False)
    attachment_url = Column(String(512), nullable=True)
    attachment_mime = Column(String(128), nullable=True)
    reply_to_id = Column(Integer, ForeignKey("messages.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    delivered = Column(Boolean, default=False)
    seen = Column(Boolean, default=False)
    deleted_for_everyone = Column(Boolean, default=False)

class MessageStar(Base):
    __tablename__ = "message_stars"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    message_id = Column(Integer, ForeignKey("messages.id"), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("user_id", "message_id", name="uq_message_star"),)

class MessageHide(Base):
    __tablename__ = "message_hides"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    message_id = Column(Integer, ForeignKey("messages.id"), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("user_id", "message_id", name="uq_message_hide"),)

class Attachment(Base):
    __tablename__ = "attachments"
    id = Column(Integer, primary_key=True)
    url = Column(String(512), nullable=False)
    mime = Column(String(128), nullable=False)
    size = Column(Integer, default=0)
