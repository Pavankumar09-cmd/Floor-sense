import time
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class TagModel(BaseModel):
    name: str
    dataType: str  # "bool", "int", "float"
    value: Any = None
    address: str
    source: str  # "sensor", "actuator", "internal"
    forced: bool = False
    forcedValue: Any = None
    description: Optional[str] = ""

class MachineTagTable:
    def __init__(self, machine_id: str):
        self.machine_id = machine_id
        self.tags: Dict[str, TagModel] = {}

    def register_tag(self, tag_data: Dict[str, Any]) -> TagModel:
        # Default value based on data type if not provided
        if "value" not in tag_data or tag_data["value"] is None:
            dt = tag_data.get("dataType", "bool")
            if dt == "bool":
                tag_data["value"] = False
            elif dt == "int":
                tag_data["value"] = 0
            elif dt == "float":
                tag_data["value"] = 0.0

        tag = TagModel(**tag_data)
        self.tags[tag.name] = tag
        return tag

    def get_tag(self, tag_name: str) -> Optional[TagModel]:
        return self.tags.get(tag_name)

    def read_value(self, tag_name: str) -> Any:
        tag = self.tags.get(tag_name)
        if not tag:
            return None
        if tag.forced:
            return tag.forcedValue
        return tag.value

    def write_value(self, tag_name: str, val: Any) -> bool:
        tag = self.tags.get(tag_name)
        if not tag:
            return False
        
        # Cast value to correct type
        try:
            if tag.dataType == "bool":
                val = bool(val)
            elif tag.dataType == "int":
                val = int(val)
            elif tag.dataType == "float":
                val = float(val)
        except (ValueError, TypeError):
            return False

        if tag.forced:
            # When forced, internal logic writes do not overwrite the live value,
            # but we update the underlying value so if unforced, it gets that value.
            tag.value = val
        else:
            tag.value = val
        return True

    def force_tag(self, tag_name: str, force_val: Any) -> bool:
        tag = self.tags.get(tag_name)
        if not tag:
            return False
        
        try:
            if tag.dataType == "bool":
                force_val = bool(force_val)
            elif tag.dataType == "int":
                force_val = int(force_val)
            elif tag.dataType == "float":
                force_val = float(force_val)
        except (ValueError, TypeError):
            return False

        tag.forced = True
        tag.forcedValue = force_val
        return True

    def unforce_tag(self, tag_name: str) -> bool:
        tag = self.tags.get(tag_name)
        if not tag:
            return False
        tag.forced = False
        tag.forcedValue = None
        return True

    def get_all_tags(self) -> Dict[str, Dict[str, Any]]:
        return {name: tag.model_dump() for name, tag in self.tags.items()}

class GlobalTagTable:
    def __init__(self):
        self.machines: Dict[str, MachineTagTable] = {}

    def get_or_create_machine_table(self, machine_id: str) -> MachineTagTable:
        if machine_id not in self.machines:
            self.machines[machine_id] = MachineTagTable(machine_id)
        return self.machines[machine_id]

    def remove_machine(self, machine_id: str):
        if machine_id in self.machines:
            del self.machines[machine_id]

# Singleton instance
global_tag_table = GlobalTagTable()
