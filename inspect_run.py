import asyncio
import websockets
import json
import requests
import time

API_URL = "http://localhost:5000"
WS_URL = "ws://localhost:5001"

async def run_inspector():
    print("Restarting simulation for fresh run...")
    # 1. Stop simulation
    try:
        requests.post(f"{API_URL}/api/machines/mach_reactor1/stop")
    except Exception:
        pass
    
    await asyncio.sleep(1)

    # 2. Start simulation
    try:
        res = requests.post(f"{API_URL}/api/machines/mach_reactor1/start", json={"actor": "inspector"})
        print("Start simulation status:", res.status_code)
    except Exception as e:
        print("Error starting simulation:", e)
        return

    # 3. Connect to WebSocket
    print(f"Connecting to {WS_URL}...")
    try:
        async with websockets.connect(WS_URL) as ws:
            print("Connected. Running startup sequence...")
            
            # Write START_CMD to begin cycle
            requests.post(f"{API_URL}/api/machines/mach_reactor1/write-tag", json={
                "tagName": "START_CMD",
                "value": True,
                "actor": "inspector"
            })
            
            # Start loop to print sequence updates
            start_time = time.time()
            while time.time() - start_time < 20: # run for 20 seconds
                msg = await ws.recv()
                payload = json.loads(msg)
                if payload.get("type") == "tag_update":
                    tags = payload.get("tags", {})
                    seq = tags.get("SEQ_STEP", {}).get("value")
                    ton = tags.get("TON_DWELL", {}).get("value")
                    et = tags.get("DWELL_ET", {}).get("value")
                    lt = tags.get("LT_101", {}).get("value")
                    tt = tags.get("TT_101", {}).get("value")
                    
                    print(f"Time: {time.time() - start_time:.1f}s | STEP: {seq} | LT: {lt}% | TT: {tt}C | TON: {ton} | ET: {et}ms")
                    
                    # If we are in STEP 1 and filling, let's keep printing
                    # If we reach STEP 3, we want to watch the dwell timer closely
                    # Let's turn off START_CMD so sequence behaves properly after it starts
                    if seq == 1 and tags.get("START_CMD", {}).get("value") == True:
                        requests.post(f"{API_URL}/api/machines/mach_reactor1/write-tag", json={
                            "tagName": "START_CMD",
                            "value": False,
                            "actor": "inspector"
                        })
    except Exception as e:
        print("WS Error:", e)

asyncio.run(run_inspector())
