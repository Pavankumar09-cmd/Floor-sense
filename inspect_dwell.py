import asyncio
import websockets
import json
import requests
import time

API_URL = "http://localhost:5000"
WS_URL = "ws://localhost:5001"

async def run_inspector():
    print("Forcing simulation to Dwell (STEP 3) to inspect timer...")
    
    # 1. Ensure sim is started
    try:
        requests.post(f"{API_URL}/api/machines/mach_reactor1/start", json={"actor": "inspector"})
    except Exception:
        pass

    # 2. Force tags directly to Dwell state
    requests.post(f"{API_URL}/api/machines/mach_reactor1/force-tag", json={"tagName": "SEQ_STEP", "value": 3, "actor": "inspector"})
    requests.post(f"{API_URL}/api/machines/mach_reactor1/write-tag", json={"tagName": "LT_101", "value": 80.0, "actor": "inspector"})
    requests.post(f"{API_URL}/api/machines/mach_reactor1/write-tag", json={"tagName": "TT_101", "value": 85.0, "actor": "inspector"})

    try:
        async with websockets.connect(WS_URL) as ws:
            start_time = time.time()
            # Release SEQ_STEP from force after 1 second so the program logic runs it
            released = False
            
            while time.time() - start_time < 8:
                msg = await ws.recv()
                payload = json.loads(msg)
                if payload.get("type") == "tag_update":
                    tags = payload.get("tags", {})
                    seq = tags.get("SEQ_STEP", {}).get("value")
                    ton = tags.get("TON_DWELL", {}).get("value")
                    et = tags.get("DWELL_ET", {}).get("value")
                    
                    print(f"Time: {time.time() - start_time:.1f}s | STEP: {seq} | TON: {ton} | ET: {et}ms")
                    
                    if not released and time.time() - start_time > 1.5:
                        print("Releasing SEQ_STEP force to let PLC logic run...")
                        requests.post(f"{API_URL}/api/machines/mach_reactor1/unforce-tag", json={"tagName": "SEQ_STEP", "actor": "inspector"})
                        released = True
    except Exception as e:
        print("WS Error:", e)

asyncio.run(run_inspector())
