from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, Set
import json

router = APIRouter()

connections: Dict[str, Set[WebSocket]] = {}

async def send_to_conversation(conv_id: str, message: dict):
    if conv_id in connections:
        for ws in list(connections[conv_id]):
            await ws.send_text(json.dumps(message))

@router.websocket("/ws")
async def ws_messages(ws: WebSocket, conversation_id: str = Query(...), user: str = Query("")):
    await ws.accept()
    conv = conversation_id
    connections.setdefault(conv, set()).add(ws)
    try:
        while True:
            data = await ws.receive_text()
            try:
                payload = json.loads(data)
            except Exception:
                payload = {"type": "text", "body": data}
            await send_to_conversation(conv, {"from": user, **payload})
    except WebSocketDisconnect:
        connections.get(conv, set()).discard(ws)
        if not connections.get(conv):
            connections.pop(conv, None)
