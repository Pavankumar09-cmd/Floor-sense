import random
from typing import Dict, Any
from .tag_table import MachineTagTable

class IOSimulator:
    def __init__(self, machine_id: str, machine_type: str = "reactor_tank"):
        self.machine_id = machine_id
        self.machine_type = machine_type
        # State variables for internal physical process integrations
        self.tank_level = 0.0         # 0.0 to 100.0%
        self.tank_temp = 20.0          # Ambient start, e.g. 20.0 C
        self.ambient_temp = 20.0

    def simulate(self, tag_table: MachineTagTable, dt_ms: int):
        """
        Runs physical simulation based on current actuator tags and updates sensor tags.
        """
        dt_sec = dt_ms / 1000.0

        if self.machine_type == "reactor_tank":
            self._simulate_reactor_tank(tag_table, dt_sec)
        else:
            # Fallback or generic loop (doing nothing or basic sine wave generator)
            self._simulate_generic(tag_table, dt_sec)

    def _simulate_reactor_tank(self, tag_table: MachineTagTable, dt_sec: float):
        """
        Reactor Tank physical model:
        Actuators:
          - XV_101 (Inlet Valve): boolean
          - XV_102 (Outlet Valve): boolean
          - HTR_101 (Heater Coil): boolean
          - P_101 (Pump): boolean
        Sensors:
          - LT_101 (Level Transmitter): float (0-100%)
          - TT_101 (Temperature Transmitter): float (deg C)
          - LSH_101 (Level Switch High): boolean
          - LSL_101 (Level Switch Low): boolean
        """
        # Read actuator states
        inlet_open = bool(tag_table.read_value("XV_101"))
        outlet_open = bool(tag_table.read_value("XV_102"))
        pump_running = bool(tag_table.read_value("P_101"))
        heater_on = bool(tag_table.read_value("HTR_101"))

        # 1. Level dynamics
        # Inlet flow adds 5.0% level per second
        inflow = 5.0 if inlet_open else 0.0
        # Outlet pump drains 8.0% level per second if outlet open
        outflow = 8.0 if (outlet_open and pump_running) else (1.5 if outlet_open else 0.0) # gravity drain is slower

        self.tank_level += (inflow - outflow) * dt_sec
        # Boundary constraints
        if self.tank_level > 100.0:
            self.tank_level = 100.0
        elif self.tank_level < 0.0:
            self.tank_level = 0.0

        # Add physical sensor noise (0.05% standard deviation)
        noise_level = random.gauss(0, 0.05)
        level_pv = max(0.0, min(100.0, self.tank_level + noise_level))
        tag_table.write_value("LT_101", round(level_pv, 2))

        # Update limit switches
        tag_table.write_value("LSH_101", level_pv >= 90.0)
        tag_table.write_value("LSL_101", level_pv <= 10.0)

        # 2. Temperature dynamics
        # Heat transfer model: heater adds temperature, ambient cools it down
        # Heater can heat up by 3.5 C per second
        # Cools towards ambient (20 C) at a rate proportional to (temp - ambient)
        temp_diff = self.tank_temp - self.ambient_temp
        cooling = 0.05 * temp_diff  # cooling coefficient

        heating = 0.0
        if heater_on and level_pv > 15.0: # Heater only works if there is enough liquid (protection)
            heating = 4.0
        elif heater_on and level_pv <= 15.0:
            # Heater on but dry tank! This is an unsafe state!
            # Could trigger a thermal runaway simulation or high temp alarm
            heating = 12.0 # heats up empty tank extremely fast

        self.tank_temp += (heating - cooling) * dt_sec

        # Add physical temperature noise (0.1 C standard deviation)
        noise_temp = random.gauss(0, 0.1)
        temp_pv = max(0.0, self.tank_temp + noise_temp)
        tag_table.write_value("TT_101", round(temp_pv, 2))

    def _simulate_generic(self, tag_table: MachineTagTable, dt_sec: float):
        """
        Generic simulation that just oscillates a test sensor tag
        """
        # If there's an analog sensor, make it drift up/down
        sensor = tag_table.get_tag("AI_101")
        if sensor:
            current = tag_table.read_value("AI_101") or 50.0
            drift = random.uniform(-1.0, 1.0) * dt_sec * 5.0
            new_val = max(0.0, min(100.0, current + drift))
            tag_table.write_value("AI_101", round(new_val, 2))
