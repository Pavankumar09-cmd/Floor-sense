import asyncio
import json
from typing import List, Set
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        if not self.active_connections:
            return
        
        # Broadcast to all connected clients
        # Use asyncio.gather to broadcast concurrently and clean up disconnected clients
        tasks = []
        for connection in list(self.active_connections):
            tasks.append(self._send_and_handle_error(connection, message))
        if tasks:
            await asyncio.gather(*tasks)

    async def _send_and_handle_error(self, websocket: WebSocket, message: str):
        try:
            await websocket.send_text(message)
        except Exception:
            self.disconnect(websocket)

ws_manager = ConnectionManager()

def setup_ws_broadcast(sim_manager):
    """
    Connects the simulation manager scan loop updates to the WebSocket server broadcasting.
    """
    def broadcast_callback(machine_id: str, state_data: dict):
        # Create a WebSocket message payload
        payload = {
            "type": "tag_update",
            "machineId": machine_id,
            "data": state_data
        }
        message_str = json.dumps(payload)
        
        # Run broadcast in the running event loop
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(ws_manager.broadcast(message_str), loop)

    sim_manager.set_broadcast_callback(broadcast_callback)
