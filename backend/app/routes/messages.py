from fastapi import BackgroundTasks
import asyncio
from ..ws import send_to_conversation

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import asyncio
from ..db import get_db
from ..models import Conversation, ConversationParticipant, ConversationMeta, Message, User
from ..schemas import MessageOut, MessageCreate, ConversationOut, ConversationMetaUpdate
from ..auth import get_current_user
from ..ws import send_to_conversation

router = APIRouter()

def get_or_create_conversation(db: Session, user_ids: List[int]) -> Conversation:
    conv = (
        db.query(Conversation)
        .join(ConversationParticipant, Conversation.id == ConversationParticipant.conversation_id)
        .filter(ConversationParticipant.user_id.in_(user_ids))
        .group_by(Conversation.id)
        .having(func.count(ConversationParticipant.id) == len(user_ids))
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
    conv_ids = (
        db.query(Conversation.id)
        .join(ConversationParticipant)
        .filter(ConversationParticipant.user_id == user.id)
        .all()
    )
    conv_ids = [c[0] for c in conv_ids]
    results: List[ConversationOut] = []
    if not conv_ids:
        return results
    for cid in conv_ids:
        last_msg = (
            db.query(Message)
            .filter(Message.conversation_id == cid)
            .order_by(Message.id.desc())
            .first()
        )
        unread = (
            db.query(Message)
            .filter(Message.conversation_id == cid, Message.sender_id != user.id, Message.seen == False)
            .count()
        )
        others = (
            db.query(User)
            .join(ConversationParticipant, ConversationParticipant.user_id == User.id)
            .filter(ConversationParticipant.conversation_id == cid, User.id != user.id)
            .all()
        )
        if len(others) == 1:
            o = others[0]
            title = o.name or o.email
        elif len(others) > 1:
            title = f"Group • {len(others)} participants"
        else:
            title = f"Conversation {cid}"
        meta = db.query(ConversationMeta).filter_by(conversation_id=cid, user_id=user.id).first()
        labels_list = []
        if meta and meta.labels:
            try:
                labels_list = [x for x in meta.labels.split(",") if x]
            except Exception:
                labels_list = []
        results.append(ConversationOut(
            id=cid,
            title=title,
            last_message=(last_msg.body if last_msg else None),
            unread_count=int(unread),
            pinned=bool(meta.pinned) if meta else False,
            starred=bool(meta.starred) if meta else False,
            labels=labels_list if meta else [],
        ))
    return results

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageOut])
def list_messages(conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    member = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a participant")
    msgs = db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.id.asc()).all()
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user.id,
        Message.seen == False
    ).update({Message.seen: True}, synchronize_session=False)
    db.commit()
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
@router.patch("/conversations/{conversation_id}", response_model=ConversationOut)
def update_conversation(conversation_id: int, payload: ConversationMetaUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    member = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a participant")
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    meta = db.query(ConversationMeta).filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not meta:
        meta = ConversationMeta(conversation_id=conversation_id, user_id=user.id)
        db.add(meta)
        db.flush()
    if payload.pinned is not None:
        meta.pinned = payload.pinned
    if payload.starred is not None:
        meta.starred = payload.starred
    if payload.labels is not None:
        meta.labels = ",".join(payload.labels)
    db.commit()
    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.id.desc())
        .first()
    )
    unread = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id, Message.sender_id != user.id, Message.seen == False)
        .count()
    )
    labels_list = []
    if meta and meta.labels:
        try:
            labels_list = [x for x in meta.labels.split(",") if x]
        except Exception:
            labels_list = []
    others = (
        db.query(User)
        .join(ConversationParticipant, ConversationParticipant.user_id == User.id)
        .filter(ConversationParticipant.conversation_id == conversation_id, User.id != user.id)
        .all()
    )
    if len(others) == 1:
        o = others[0]
        title = o.name or o.email
    elif len(others) > 1:
        title = f"Group • {len(others)} participants"
    else:
        title = f"Conversation {conversation_id}"
    return ConversationOut(
        id=conversation_id,
        title=title,
        last_message=(last_msg.body if last_msg else None),
        unread_count=int(unread),
        pinned=bool(meta.pinned) if meta else False,
        starred=bool(meta.starred) if meta else False,
        labels=labels_list,
    )
