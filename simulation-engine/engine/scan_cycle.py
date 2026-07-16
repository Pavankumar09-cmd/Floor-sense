import asyncio
import time
from typing import Dict, Any, Callable, Optional
from .tag_table import global_tag_table, MachineTagTable
from .logic_executor import LogicExecutor, PLCProgram
from .io_simulator import IOSimulator

class MachineSimulation:
    def __init__(self, machine_id: str, machine_type: str, program_data: Dict[str, Any], scan_period_ms: int = 100):
        self.machine_id = machine_id
        self.machine_type = machine_type
        self.scan_period_ms = scan_period_ms
        self.running = False
        self._task: Optional[asyncio.Task] = None

        # Setup sub-components
        self.tag_table = global_tag_table.get_or_create_machine_table(machine_id)
        
        # Load logic program
        program = PLCProgram(**program_data)
        self.logic_executor = LogicExecutor(machine_id, program)
        self.io_simulator = IOSimulator(machine_id, machine_type)

        # Internal diagnostics
        self.actual_scan_time_ms = 0.0
        self.cycle_overrun = False
        
        # Register system diagnostic tags
        self.tag_table.register_tag({
            "name": "SYS_SCAN_TIME",
            "dataType": "float",
            "value": 0.0,
            "address": "SYS.SCAN_TIME",
            "source": "internal",
            "description": "Actual scan execution time in ms"
        })
        self.tag_table.register_tag({
            "name": "SYS_CYCLE_OVERRUN",
            "dataType": "bool",
            "value": False,
            "address": "SYS.CYCLE_OVERRUN",
            "source": "internal",
            "description": "True if logic took longer than target scan period"
        })

    def update_program(self, program_data: Dict[str, Any]):
        program = PLCProgram(**program_data)
        self.logic_executor.update_program(program)

    async def start(self, on_scan_callback: Callable[[str, Dict[str, Any]], None]):
        if self.running:
            return
        self.running = True
        self._task = asyncio.create_task(self._run_loop(on_scan_callback))

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _run_loop(self, on_scan_callback: Callable[[str, Dict[str, Any]], None]):
        target_sec = self.scan_period_ms / 1000.0
        last_time = time.perf_counter()

        while self.running:
            start_time = time.perf_counter()
            # Calculate actual dt since last run to ensure physics integrates correctly
            dt_ms = int((start_time - last_time) * 1000.0)
            if dt_ms <= 0:
                dt_ms = self.scan_period_ms
            last_time = start_time

            # 1. Run physical I/O simulation
            self.io_simulator.simulate(self.tag_table, dt_ms)

            # 2. Execute PLC program logic rung scan
            self.logic_executor.execute_scan(self.tag_table, dt_ms)

            # Calculate diagnostic stats
            end_time = time.perf_counter()
            self.actual_scan_time_ms = (end_time - start_time) * 1000.0
            self.cycle_overrun = self.actual_scan_time_ms > self.scan_period_ms

            # Write diagnostic tags
            self.tag_table.write_value("SYS_SCAN_TIME", round(self.actual_scan_time_ms, 2))
            self.tag_table.write_value("SYS_CYCLE_OVERRUN", self.cycle_overrun)

            # Trigger callback with updated tag table
            try:
                # Callback to stream tags to WebSocket broadcast queue
                on_scan_callback(self.machine_id, self.get_state())
            except Exception as e:
                # Guard against broken connection callback errors crashing the scan loop
                pass

            # Precise sleep calculations
            elapsed = (time.perf_counter() - start_time)
            sleep_time = max(0.0, target_sec - elapsed)
            await asyncio.sleep(sleep_time)

    def get_state(self) -> Dict[str, Any]:
        return {
            "machineId": self.machine_id,
            "scanPeriodMs": self.scan_period_ms,
            "actualScanTimeMs": self.actual_scan_time_ms,
            "cycleOverrun": self.cycle_overrun,
            "tags": self.tag_table.get_all_tags()
        }

class SimulationManager:
    def __init__(self):
        self.simulations: Dict[str, MachineSimulation] = {}
        self.broadcast_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None

    def set_broadcast_callback(self, cb: Callable[[str, Dict[str, Any]], None]):
        self.broadcast_callback = cb

    async def create_and_start_sim(self, machine_id: str, machine_type: str, program_data: Dict[str, Any], scan_period_ms: int = 100) -> Dict[str, Any]:
        # Stop existing if any
        await self.stop_sim(machine_id)
        
        sim = MachineSimulation(machine_id, machine_type, program_data, scan_period_ms)
        self.simulations[machine_id] = sim
        
        if self.broadcast_callback:
            await sim.start(self.broadcast_callback)
        else:
            # Fallback direct startup
            await sim.start(lambda mid, data: None)
            
        return sim.get_state()

    async def stop_sim(self, machine_id: str) -> bool:
        if machine_id in self.simulations:
            await self.simulations[machine_id].stop()
            global_tag_table.remove_machine(machine_id)
            del self.simulations[machine_id]
            return True
        return False

    def get_sim_state(self, machine_id: str) -> Optional[Dict[str, Any]]:
        sim = self.simulations.get(machine_id)
        return sim.get_state() if sim else None

    def force_tag(self, machine_id: str, tag_name: str, value: Any) -> bool:
        sim = self.simulations.get(machine_id)
        if not sim:
            return False
        return sim.tag_table.force_tag(tag_name, value)

    def unforce_tag(self, machine_id: str, tag_name: str) -> bool:
        sim = self.simulations.get(machine_id)
        if not sim:
            return False
        return sim.tag_table.unforce_tag(tag_name)

    def write_tag(self, machine_id: str, tag_name: str, value: Any) -> bool:
        sim = self.simulations.get(machine_id)
        if not sim:
            return False
        return sim.tag_table.write_value(tag_name, value)

# Singleton manager
sim_manager = SimulationManager()
