from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from engine.scan_cycle import sim_manager

router = APIRouter(prefix="/api/simulation")

class StartSimRequest(BaseModel):
    machineId: str
    machineType: str
    scanPeriodMs: Optional[int] = 100
    tags: List[Dict[str, Any]]
    program: Dict[str, Any]

class StopSimRequest(BaseModel):
    machineId: str

class WriteTagRequest(BaseModel):
    machineId: str
    tagName: str
    value: Any

class ForceTagRequest(BaseModel):
    machineId: str
    tagName: str
    value: Any

class UnforceTagRequest(BaseModel):
    machineId: str
    tagName: str

class UpdateProgramRequest(BaseModel):
    machineId: str
    program: Dict[str, Any]

@router.post("/start")
async def start_simulation(req: StartSimRequest):
    try:
        # First register the tags in the machine's tag table
        tag_table = sim_manager.simulations.get(req.machineId)
        # Setup or get
        state = await sim_manager.create_and_start_sim(
            machine_id=req.machineId,
            machine_type=req.machineType,
            program_data=req.program,
            scan_period_ms=req.scanPeriodMs
        )
        
        # Load tags
        sim = sim_manager.simulations[req.machineId]
        for tag_data in req.tags:
            sim.tag_table.register_tag(tag_data)
            
        return {"status": "started", "machineId": req.machineId}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start simulation: {str(e)}")

@router.post("/stop")
async def stop_simulation(req: StopSimRequest):
    stopped = await sim_manager.stop_sim(req.machineId)
    if not stopped:
        raise HTTPException(status_code=404, detail="Simulation not found or not running")
    return {"status": "stopped", "machineId": req.machineId}

@router.post("/write")
async def write_tag(req: WriteTagRequest):
    success = sim_manager.write_tag(req.machineId, req.tagName, req.value)
    if not success:
        raise HTTPException(status_code=400, detail=f"Tag write failed for {req.tagName}. Make sure simulation is running and tag exists.")
    return {"status": "success"}

@router.post("/force")
async def force_tag(req: ForceTagRequest):
    success = sim_manager.force_tag(req.machineId, req.tagName, req.value)
    if not success:
        raise HTTPException(status_code=400, detail=f"Tag force failed for {req.tagName}.")
    return {"status": "success"}

@router.post("/unforce")
async def unforce_tag(req: UnforceTagRequest):
    success = sim_manager.unforce_tag(req.machineId, req.tagName)
    if not success:
        raise HTTPException(status_code=400, detail=f"Tag unforce failed for {req.tagName}.")
    return {"status": "success"}

@router.post("/program")
async def update_program(req: UpdateProgramRequest):
    sim = sim_manager.simulations.get(req.machineId)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not running")
    try:
        sim.update_program(req.program)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid program format: {str(e)}")

@router.get("/{machine_id}")
async def get_state(machine_id: str):
    state = sim_manager.get_sim_state(machine_id)
    if not state:
        raise HTTPException(status_code=404, detail="Simulation not running")
    return state
