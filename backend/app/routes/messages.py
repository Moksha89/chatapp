from fastapi import BackgroundTasks
import asyncio
from ..ws import send_to_conversation

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import asyncio
from ..db import get_db
from ..models import Conversation, ConversationParticipant, Message, User
from ..schemas import MessageOut, MessageCreate, ConversationOut
from ..auth import get_current_user
from ..ws import send_to_conversation

router = APIRouter()

def get_or_create_conversation(db: Session, user_ids: List[int]) -> Conversation:
    conv = (
        db.query(Conversation)
        .join(ConversationParticipant, Conversation.id == ConversationParticipant.conversation_id)
        .filter(ConversationParticipant.user_id.in_(user_ids))
        .group_by(Conversation.id)
        .having(db.func.count(ConversationParticipant.id) == len(user_ids))
        .first()
    )
    if not conv:
        conv = Conversation()
        db.add(conv)
        db.flush()
        for uid in user_ids:
            db.add(ConversationParticipant(conversation_id=conv.id, user_id=uid))
        db.commit()
        db.refresh(conv)
    return conv

@router.get("/conversations", response_model=List[ConversationOut])
def list_conversations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    convs = (
        db.query(Conversation)
        .join(ConversationParticipant)
        .filter(ConversationParticipant.user_id == user.id)
        .all()
    )
    return convs

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageOut])
def list_messages(conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    member = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a participant")
    msgs = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.id.asc()).all()
    return msgs

@router.post("/messages", response_model=MessageOut)
def send_message(payload: MessageCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload.conversation_id is None and payload.to_user_id is None:
        raise HTTPException(status_code=400, detail="Provide conversation_id or to_user_id")
    if payload.conversation_id is None:
        other = db.query(User).filter(User.id == payload.to_user_id).first()
        if not other:
            raise HTTPException(status_code=404, detail="Recipient not found")
        conv = get_or_create_conversation(db, [user.id, other.id])
        conversation_id = conv.id
    else:
        conversation_id = payload.conversation_id
        member = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user.id).first()
        if not member:
            raise HTTPException(status_code=403, detail="Not a participant")

    msg = Message(conversation_id=conversation_id, sender_id=user.id, body=payload.body)
    db.add(msg)
    db.commit()
    db.refresh(msg)

    try:
        background_tasks.add_task(asyncio.run, send_to_conversation(str(conversation_id), {"from": user.email if hasattr(user, "email") else str(user.id), "type": "text", "body": payload.body}))
    except Exception:
        pass

    return msg
