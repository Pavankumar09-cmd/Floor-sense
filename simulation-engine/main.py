import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import os

from api.rest_routes import router as sim_router
from api.ws_server import ws_manager, setup_ws_broadcast
from engine.scan_cycle import sim_manager

app = FastAPI(title="FloorSense Simulation Engine")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach REST router
app.include_router(sim_router)

# Setup callback linking sim_manager to ws_manager
setup_ws_broadcast(sim_manager)

@app.get("/")
def read_root():
    return {"service": "floorsense-simulation-engine", "status": "running"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; accept commands if sent via WS
            data = await websocket.receive_text()
            # Can parse incoming WS commands here if needed, e.g. quick tag forces
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"Starting FloorSense Simulation Engine on port {port}...")
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
