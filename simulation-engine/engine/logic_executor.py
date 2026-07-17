import re
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from .tag_table import MachineTagTable

class RungModel(BaseModel):
    id: str
    output: str           # Target tag name
    expression: str       # Boolean/Math expression (e.g. "START_PB AND NOT ESTOP")
    description: Optional[str] = ""

class TimerModel(BaseModel):
    id: str               # e.g. "TON_1"
    in_expr: str          # Input condition expression (e.g. "HEATING_ACTIVE")
    pt_ms: int            # Preset time in milliseconds
    out_tag: str          # Tag to write output status (Q)
    et_tag: Optional[str] = None # Tag to write elapsed time (ET)

class PLCProgram(BaseModel):
    rungs: List[RungModel] = []
    timers: List[TimerModel] = []

class PLCTimerState:
    def __init__(self, pt_ms: int):
        self.pt_ms = pt_ms
        self.et_ms = 0
        self.q = False
        self.last_active_time = None

    def update(self, in_val: bool, dt_ms: int) -> tuple[bool, int]:
        if in_val:
            if self.et_ms < self.pt_ms:
                self.et_ms += dt_ms
                if self.et_ms >= self.pt_ms:
                    self.et_ms = self.pt_ms
                    self.q = True
            else:
                self.q = True
        else:
            self.et_ms = 0
            self.q = False
        return self.q, self.et_ms

class LogicExecutor:
    def __init__(self, machine_id: str, program: PLCProgram):
        self.machine_id = machine_id
        self.program = program
        # Keep track of internal timer states
        self.timer_states: Dict[str, PLCTimerState] = {
            t.id: PLCTimerState(t.pt_ms) for t in program.timers
        }

    def update_program(self, program: PLCProgram):
        self.program = program
        # Reset/rebuild timer states preserving existing active timers
        new_states = {}
        for t in program.timers:
            if t.id in self.timer_states and self.timer_states[t.id].pt_ms == t.pt_ms:
                new_states[t.id] = self.timer_states[t.id]
            else:
                new_states[t.id] = PLCTimerState(t.pt_ms)
        self.timer_states = new_states

    def safe_eval(self, expr: str, tag_table: MachineTagTable) -> Any:
        """
        Parses and evaluates a simple math/boolean expression safely.
        Supported tokens: AND, OR, NOT, true, false, tag names, numbers, operators: +, -, *, /, <, >, <=, >=, ==, !=, (, ).
        """
        # Normalize casing of logical operators
        expr_norm = expr.replace(" AND ", " and ").replace(" OR ", " or ").replace(" NOT ", " not ")
        expr_norm = expr_norm.replace(" and ", " and ").replace(" or ", " or ").replace(" not ", " not ")
        
        # Tokenize by finding words, numbers, and symbols
        tokens = re.findall(r'[a-zA-Z_][a-zA-Z0-9_]*|\d+\.\d+|\d+|==|!=|<=|>=|[+\-*/()<>]|and|or|not|true|false', expr_norm)
        
        # Build evaluation string replacing tags with their values
        eval_parts = []
        for token in tokens:
            lower_token = token.lower()
            if lower_token in ("and", "or", "not", "if", "else"):
                eval_parts.append(lower_token)
            elif lower_token == "true":
                eval_parts.append("True")
            elif lower_token == "false":
                eval_parts.append("False")
            elif re.match(r'^\d+(\.\d+)?$', token):
                eval_parts.append(token)
            elif token in ("+", "-", "*", "/", "<", ">", "<=", ">=", "==", "!=", "(", ")"):
                eval_parts.append(token)
            else:
                # Treat as tag name
                tag_val = tag_table.read_value(token)
                if tag_val is None:
                    # Default to False if tag doesn't exist
                    eval_parts.append("False")
                else:
                    if isinstance(tag_val, bool):
                        eval_parts.append("True" if tag_val else "False")
                    elif isinstance(tag_val, (int, float)):
                        eval_parts.append(str(tag_val))
                    else:
                        eval_parts.append(f"'{tag_val}'")

        eval_str = " ".join(eval_parts)
        if not eval_str.strip():
            return False

        # Evaluate safely using a limited scope
        try:
            # Only allow standard mathematical and logic operations
            result = eval(eval_str, {"__builtins__": None}, {})
            return result
        except Exception:
            return False

    def execute_scan(self, tag_table: MachineTagTable, dt_ms: int):
        """
        Executes one PLC scan cycle.
        1. Read inputs (implicit in tag_table values)
        2. Update timer blocks
        3. Evaluate logic rungs and write to outputs
        """
        # 1. Update Timer blocks
        for t in self.program.timers:
            in_val = bool(self.safe_eval(t.in_expr, tag_table))
            state = self.timer_states.get(t.id)
            if not state:
                state = PLCTimerState(t.pt_ms)
                self.timer_states[t.id] = state
            
            q, et = state.update(in_val, dt_ms)
            
            # Write to PLC tags
            tag_table.write_value(t.out_tag, q)
            if t.et_tag:
                tag_table.write_value(t.et_tag, et)

        # 2. Evaluate logic rungs
        for rung in self.program.rungs:
            val = self.safe_eval(rung.expression, tag_table)
            tag_table.write_value(rung.output, val)
