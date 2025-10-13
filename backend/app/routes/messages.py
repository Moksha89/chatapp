

from fastapi import UploadFile, File
import os

from fastapi import BackgroundTasks
import asyncio
from ..ws import send_to_conversation

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import asyncio
from ..db import get_db
from ..models import Conversation, ConversationParticipant, ConversationMeta, Message, User, MessageStar, MessageHide
from ..schemas import MessageOut, MessageCreate, ConversationOut, ConversationMetaUpdate, MessageAction
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
@router.post("/upload")
def upload_attachment(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    uploads_dir = "/opt/akirah/uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    dest_path = os.path.join(uploads_dir, file.filename)
    with open(dest_path, "wb") as f:
        f.write(file.file.read())
    url = f"/static/uploads/{file.filename}"
    return {"url": url, "mime": file.content_type or "application/octet-stream", "size": os.path.getsize(dest_path)}
from pydantic import BaseModel
class ConversationCreate(BaseModel):
    type: str = "direct"
    title: str | None = None
    participant_ids: List[int]

class ParticipantUpdate(BaseModel):
    user_id: int
    role: Optional[str] = None

@router.post("/conversations", response_model=ConversationOut)
def create_conversation(payload: ConversationCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not payload.participant_ids:
        raise HTTPException(status_code=400, detail="participant_ids required")
    ids = list({*payload.participant_ids, user.id})
    conv = Conversation()
    conv.type = payload.type or "direct"
    conv.title = payload.title
    db.add(conv)
    db.flush()
    for uid in ids:
        role = "admin" if uid == user.id and conv.type in ("group","broadcast") else "member"
        db.add(ConversationParticipant(conversation_id=conv.id, user_id=uid, role=role))
    db.commit()
    db.refresh(conv)
    last_msg = None
    unread = 0
    others = (
        db.query(User)
        .join(ConversationParticipant, ConversationParticipant.user_id == User.id)
        .filter(ConversationParticipant.conversation_id == conv.id, User.id != user.id)
        .all()
    )
    title = conv.title or ((others[0].name or others[0].email) if len(others)==1 else (f"Group • {len(others)} participants" if len(others)>1 else f"Conversation {conv.id}"))
    meta = db.query(ConversationMeta).filter_by(conversation_id=conv.id, user_id=user.id).first()
    labels_list = []
    if meta and meta.labels:
        try:
            labels_list = [x for x in meta.labels.split(",") if x]
        except Exception:
            labels_list = []
    return ConversationOut(
        id=conv.id,
        title=title,
        last_message=(last_msg.body if last_msg else None),
        unread_count=int(unread),
        pinned=bool(meta.pinned) if meta else False,
        starred=bool(meta.starred) if meta else False,
        labels=labels_list,
    )

@router.patch("/conversations/{conversation_id}/title", response_model=ConversationOut)
def update_conversation_title(conversation_id: int, title: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    member = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a participant")
    if conv.type in ("group","broadcast"):
        me = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user.id).first()
        if not me or me.role != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
    conv.title = title
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
    meta = db.query(ConversationMeta).filter_by(conversation_id=conversation_id, user_id=user.id).first()
    labels_list = []
    if meta and meta.labels:
        try:
            labels_list = [x for x in meta.labels.split(",") if x]
        except Exception:
            labels_list = []
    title_out = conv.title or f"Conversation {conversation_id}"
    return ConversationOut(
        id=conversation_id,
        title=title_out,
        last_message=(last_msg.body if last_msg else None),
        unread_count=int(unread),
        pinned=bool(meta.pinned) if meta else False,
        starred=bool(meta.starred) if meta else False,
        labels=labels_list,
    )

@router.post("/conversations/{conversation_id}/participants")
def add_participant(conversation_id: int, payload: ParticipantUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    me = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not me:
        raise HTTPException(status_code=403, detail="Not a participant")
    if conv.type in ("group","broadcast") and me.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    exists = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=payload.user_id).first()
    if exists:
        if payload.role:
            exists.role = payload.role
            db.commit()
        return {"ok": True}
    db.add(ConversationParticipant(conversation_id=conversation_id, user_id=payload.user_id, role=payload.role or "member"))
    db.commit()
    return {"ok": True}

@router.delete("/conversations/{conversation_id}/participants/{user_id}")
def remove_participant(conversation_id: int, user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    me = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not me:
        raise HTTPException(status_code=403, detail="Not a participant")
    if conv.type in ("group","broadcast") and me.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    target = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user_id).first()
    if target:
        db.delete(target)
        db.commit()
    return {"ok": True}


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
        if hasattr('conv','title'):
            pass
        if len(others) == 1 and not locals().get('title'):
            o = others[0]
            title = o.name or o.email
        elif len(others) > 1 and not locals().get('title'):
            title = f"Group • {len(others)} participants"
        else:
            title = locals().get('title') or f"Conversation {cid}"
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
    msgs = db.query(Message).filter(Message.conversation_id == conversation_id, Message.deleted_for_everyone == False).order_by(Message.id.asc()).all()
    hidden_ids = {mh.message_id for mh in db.query(MessageHide).filter_by(user_id=user.id).all()}

    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user.id,
        Message.seen == False
    ).update({Message.seen: True}, synchronize_session=False)
    db.commit()
    return [
        MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            body=m.body,
            attachment_url=getattr(m, "attachment_url", None),
            attachment_mime=getattr(m, "attachment_mime", None),
            reply_to_id=getattr(m, "reply_to_id", None),
            deleted_for_everyone=bool(getattr(m, "deleted_for_everyone", False)),
            delivered=bool(getattr(m, "delivered", False)),
            seen=bool(getattr(m, "seen", False)),
        )
        for m in msgs if m.id not in hidden_ids
    ]
@router.patch("/conversations/{conversation_id}/read")
def mark_read(conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    member = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a participant")
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user.id,
        Message.seen == False
    ).update({Message.seen: True}, synchronize_session=False)
    db.commit()
    return {"ok": True}
@router.post("/conversations/{conversation_id}/read")
def mark_read_post(conversation_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    member = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a participant")
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user.id,
        Message.seen == False
    ).update({Message.seen: True}, synchronize_session=False)
    db.commit()
    return {"ok": True}

@router.get("/starred", response_model=List[MessageOut])
def get_starred(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    hidden_ids = {mh.message_id for mh in db.query(MessageHide).filter_by(user_id=user.id).all()}
    q = (
        db.query(Message)
        .join(MessageStar, MessageStar.message_id == Message.id)
        .filter(MessageStar.user_id == user.id, Message.deleted_for_everyone == False)
        .order_by(Message.id.desc())
        .all()
    )
    return [
        MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            body=m.body,
            attachment_url=m.attachment_url,
            attachment_mime=m.attachment_mime,
            reply_to_id=m.reply_to_id,
            deleted_for_everyone=bool(m.deleted_for_everyone),
            delivered=bool(getattr(m, "delivered", False)),
            seen=bool(getattr(m, "seen", False)),
        )
        for m in q if m.id not in hidden_ids
    ]

@router.get("/conversations/{conversation_id}/search", response_model=List[MessageOut])
def search_in_conversation(conversation_id: int, q: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    member = db.query(ConversationParticipant).filter_by(conversation_id=conversation_id, user_id=user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a participant")
    hidden_ids = {mh.message_id for mh in db.query(MessageHide).filter_by(user_id=user.id).all()}
    msgs = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id,
            Message.deleted_for_everyone == False,
            Message.body.ilike(f"%{q}%"),
        )
        .order_by(Message.id.desc())
        .all()
    )
    return [
        MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            body=m.body,
            attachment_url=m.attachment_url,
            attachment_mime=m.attachment_mime,
            reply_to_id=m.reply_to_id,
            deleted_for_everyone=bool(m.deleted_for_everyone),
            delivered=bool(getattr(m, "delivered", False)),
            seen=bool(getattr(m, "seen", False)),
        )
        for m in msgs if m.id not in hidden_ids
    ]

@router.get("/search", response_model=List[MessageOut])
def global_search(q: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    hidden_ids = {mh.message_id for mh in db.query(MessageHide).filter_by(user_id=user.id).all()}
    conv_ids = [
        cid for (cid,) in db.query(ConversationParticipant.conversation_id).filter_by(user_id=user.id).all()
    ]
    if not conv_ids:
        return []
    msgs = (
        db.query(Message)
        .filter(
            Message.conversation_id.in_(conv_ids),
            Message.deleted_for_everyone == False,
            Message.body.ilike(f"%{q}%"),
        )
        .order_by(Message.id.desc())
        .all()
    )
    return [
        MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            body=m.body,
            attachment_url=m.attachment_url,
            attachment_mime=m.attachment_mime,
            reply_to_id=m.reply_to_id,
            deleted_for_everyone=bool(m.deleted_for_everyone),
            delivered=bool(getattr(m, "delivered", False)),
            seen=bool(getattr(m, "seen", False)),
        )
        for m in msgs if m.id not in hidden_ids
    ]
@router.get("/labels", response_model=List[str])
def get_labels(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    conv_ids = [cid for (cid,) in db.query(ConversationParticipant.conversation_id).filter_by(user_id=user.id).all()]
    if not conv_ids:
        return []
    metas = db.query(ConversationMeta).filter(ConversationMeta.conversation_id.in_(conv_ids), ConversationMeta.user_id == user.id).all()
    labels: List[str] = []
    for m in metas:
        if m.labels:
            for l in m.labels.split(","):
                l2 = l.strip()
                if l2 and l2 not in labels:
                    labels.append(l2)
    return labels




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

    msg = Message(
        conversation_id=conversation_id,
        sender_id=user.id,
        body=payload.body or "",
        attachment_url=payload.attachment_url,
        attachment_mime=payload.attachment_mime,
        reply_to_id=payload.reply_to_id,
    )
    db.add(msg)
    msg.delivered = True
    db.commit()
    db.refresh(msg)

    try:
        background_tasks.add_task(
            asyncio.run,
            send_to_conversation(
                str(conversation_id),
                {
                    "from": user.email if hasattr(user, "email") else str(user.id),
                    "type": "text",
                    "body": payload.body or "",
                    "attachment_url": payload.attachment_url,
                    "attachment_mime": payload.attachment_mime,
                },
            ),
        )
    except Exception:
        pass

    return MessageOut(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        body=msg.body,
        attachment_url=msg.attachment_url,
        attachment_mime=msg.attachment_mime,
        reply_to_id=msg.reply_to_id,
        deleted_for_everyone=bool(msg.deleted_for_everyone),
        delivered=bool(getattr(msg, "delivered", False)),
        seen=bool(getattr(msg, "seen", False)),
    )

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
@router.patch("/messages/{message_id}")
def act_on_message(message_id: int, payload: MessageAction, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    m = db.query(Message).filter(Message.id == message_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Message not found")
    member = db.query(ConversationParticipant).filter_by(conversation_id=m.conversation_id, user_id=user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a participant")
    if payload.star is not None:
        existing = db.query(MessageStar).filter_by(user_id=user.id, message_id=message_id).first()
        if payload.star and not existing:
            db.add(MessageStar(user_id=user.id, message_id=message_id))
        if payload.star is False and existing:
            db.delete(existing)
    if payload.delete_for_me:
        if not db.query(MessageHide).filter_by(user_id=user.id, message_id=message_id).first():
            db.add(MessageHide(user_id=user.id, message_id=message_id))
    if payload.delete_for_everyone:
        if m.sender_id != user.id:
            raise HTTPException(status_code=403, detail="Only sender can delete for everyone")
        m.deleted_for_everyone = True
    db.commit()
    return {"ok": True}
