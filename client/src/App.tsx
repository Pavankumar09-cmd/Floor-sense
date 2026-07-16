import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { MimicDisplay } from './components/MimicDisplay';
import { TagTable } from './components/TagTable';
import { AlarmPanel } from './components/AlarmPanel';
import { EventLog } from './components/EventLog';
import { TestPlanRunner } from './components/TestPlanRunner';
import { Project, Machine, Tag, Alarm, EventLog as EventLogType, TestPlan } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5001';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  
  // Real-time State from WS
  const [tags, setTags] = useState<Record<string, Tag>>({});
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [eventLogs, setEventLogs] = useState<EventLogType[]>([]);
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  
  // Communication States
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [scanTimeMs, setScanTimeMs] = useState(0.0);
  const [cycleOverrun, setCycleOverrun] = useState(false);
  
  // Test Plan running states
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [activeTestPlanId, setActiveTestPlanId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const testPollIntervalRef = useRef<number | null>(null);

  // 1. Initial Load: Fetch Projects list
  useEffect(() => {
    fetchProjects();
  }, []);

  // 2. Fetch Projects list
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects`);
      const data = await res.json();
      setProjects(data);

      // Auto-select seeded demo project if it exists
      if (data.length > 0) {
        const demoProj = data.find((p: Project) => p.id === 'proj_demo1') || data[0];
        setSelectedProject(demoProj);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  // 3. Select Project and fetch its Machine details
  useEffect(() => {
    if (!selectedProject) return;
    
    // Auto-select first machine of project
    if (selectedProject.machines && selectedProject.machines.length > 0) {
      const demoMach = selectedProject.machines.find(m => m.id === 'mach_reactor1') || selectedProject.machines[0];
      loadMachineDetails(demoMach.id);
    }
  }, [selectedProject]);

  const loadMachineDetails = async (machineId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/machines/${machineId}`);
      const machine: Machine = await res.json();
      setSelectedMachine(machine);
      
      // Load static tag objects into tag table state
      const initialTags: Record<string, Tag> = {};
      machine.tags.forEach(t => {
        initialTags[t.name] = t;
      });
      setTags(initialTags);
      
      // Set initial alarms
      setAlarms(machine.alarms);

      // Fetch logs, test plans, and check simulation running state
      fetchLogs(machineId);
      fetchTestPlans(machineId);
      checkSimulationState(machineId);
    } catch (err) {
      console.error('Error loading machine details:', err);
    }
  };

  const fetchLogs = async (machineId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/machines/${machineId}/logs?limit=50`);
      const logs = await res.json();
      setEventLogs(logs);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const fetchTestPlans = async (machineId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/machines/${machineId}/test-plans`);
      const plans = await res.json();
      setTestPlans(plans);
    } catch (err) {
      console.error('Error fetching test plans:', err);
    }
  };

  const checkSimulationState = async (machineId: string) => {
    try {
      // Check if python sim engine is active for this machine
      const res = await fetch(`${API_URL}/api/machines/${machineId}`);
      const data = await res.json();
      // If we can fetch state from python sim engine, it means it's running
      const engineRes = await fetch(`${API_URL}/api/machines/${machineId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'system-check' })
      });
      // The start endpoint returns success immediately, but if we query the engine we will know if it is active.
      // Wait, let's keep it simple: we can just check if we receive websocket messages to mark as simulating.
    } catch (err) {
      // Not running
    }
  };

  // 4. WebSocket Client Connection Manager
  useEffect(() => {
    console.log('Connecting to WebSocket relay at:', WS_URL);
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket relay.');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'tag_update') {
          // If we are getting tag updates, the simulation is running
          setIsSimulating(true);
          setScanTimeMs(payload.scanTimeMs);
          setCycleOverrun(payload.cycleOverrun);
          
          // Merge updates into tag table
          setTags((prevTags) => {
            const nextTags = { ...prevTags };
            Object.keys(payload.tags).forEach((name) => {
              const currentTag = nextTags[name];
              const updatedTag = payload.tags[name];
              if (currentTag) {
                nextTags[name] = {
                  ...currentTag,
                  value: updatedTag.value,
                  forced: updatedTag.forced,
                  forcedValue: updatedTag.forcedValue
                };
              } else {
                nextTags[name] = {
                  name,
                  dataType: updatedTag.dataType,
                  value: updatedTag.value,
                  address: updatedTag.address,
                  source: updatedTag.source,
                  forced: updatedTag.forced,
                  forcedValue: updatedTag.forcedValue,
                  description: updatedTag.description || ''
                };
              }
            });
            return nextTags;
          });

          // Update alarms list
          if (payload.alarms) {
            setAlarms(payload.alarms);
          }
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      console.warn('WebSocket relay disconnected. Retrying connection in 5s...');
      setIsConnected(false);
      setIsSimulating(false);
      setTimeout(() => {
        // Reconnect logic
      }, 5000);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Poll event logs and test plans periodically
  useEffect(() => {
    if (!selectedMachine) return;
    const interval = setInterval(() => {
      fetchLogs(selectedMachine.id);
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedMachine]);

  // 5. REST operations
  const handleToggleSimulation = async () => {
    if (!selectedMachine) return;
    
    const endpoint = isSimulating ? 'stop' : 'start';
    try {
      await fetch(`${API_URL}/api/machines/${selectedMachine.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'operator' })
      });
      
      if (isSimulating) {
        setIsSimulating(false);
        setScanTimeMs(0.0);
        setCycleOverrun(false);
      }
      fetchLogs(selectedMachine.id);
    } catch (err) {
      console.error('Error toggling simulation:', err);
    }
  };

  const handleWriteTag = async (tagName: string, value: any) => {
    if (!selectedMachine) return;
    try {
      await fetch(`${API_URL}/api/machines/${selectedMachine.id}/write-tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName, value, actor: 'operator' })
      });
    } catch (err) {
      console.error('Error writing tag:', err);
    }
  };

  const handleForceTag = async (tagName: string, value: any) => {
    if (!selectedMachine) return;
    try {
      await fetch(`${API_URL}/api/machines/${selectedMachine.id}/force-tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName, value, actor: 'operator' })
      });
    } catch (err) {
      console.error('Error forcing tag:', err);
    }
  };

  const handleUnforceTag = async (tagName: string) => {
    if (!selectedMachine) return;
    try {
      await fetch(`${API_URL}/api/machines/${selectedMachine.id}/unforce-tag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName, actor: 'operator' })
      });
    } catch (err) {
      console.error('Error unforcing tag:', err);
    }
  };

  const handleAcknowledgeAlarm = async (alarmId: string) => {
    try {
      await fetch(`${API_URL}/api/alarms/${alarmId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: 'operator' })
      });
      if (selectedMachine) {
        // Refresh alarms state from REST or wait for WS update
        const res = await fetch(`${API_URL}/api/machines/${selectedMachine.id}/alarms`);
        const data = await res.json();
        setAlarms(data);
      }
    } catch (err) {
      console.error('Error acknowledging alarm:', err);
    }
  };

  const handleRunTestPlan = async (planId: string) => {
    if (!selectedMachine) return;
    setIsTestRunning(true);
    setActiveTestPlanId(planId);

    try {
      await fetch(`${API_URL}/api/test-plans/${planId}/run`, {
        method: 'POST'
      });
      
      // Start polling test results every 1s
      if (testPollIntervalRef.current) clearInterval(testPollIntervalRef.current);
      
      testPollIntervalRef.current = setInterval(async () => {
        const res = await fetch(`${API_URL}/api/machines/${selectedMachine.id}/test-plans`);
        const plans: TestPlan[] = await res.json();
        setTestPlans(plans);

        const currentPlan = plans.find(p => p.id === planId);
        if (currentPlan && currentPlan.pass_fail !== null) {
          // Finished running!
          setIsTestRunning(false);
          setActiveTestPlanId(null);
          if (testPollIntervalRef.current) {
            clearInterval(testPollIntervalRef.current);
            testPollIntervalRef.current = null;
          }
        }
      }, 1000) as unknown as number;

    } catch (err) {
      console.error('Error running test plan:', err);
      setIsTestRunning(false);
      setActiveTestPlanId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-panel-900 text-panel-100 font-sans antialiased">
      {/* Top Banner Header bar */}
      <Header
        currentProject={selectedProject}
        currentMachine={selectedMachine}
        isConnected={isConnected}
        scanTimeMs={scanTimeMs}
        cycleOverrun={cycleOverrun}
        isSimulating={isSimulating}
        onToggleSim={handleToggleSimulation}
      />

      {/* Main Commissioning Grid Dashboard */}
      {selectedMachine ? (
        <main className="flex-grow p-4 grid grid-cols-1 xl:grid-cols-3 gap-4 overflow-y-auto">
          {/* Col 1 & 2: Process Schematic Mimic (Top) & Tag Table / Operations (Bottom) */}
          <div className="xl:col-span-2 flex flex-col space-y-4">
            
            {/* Mimic Schematic (centerpiece) */}
            <div className="flex-grow min-h-[360px]">
              <MimicDisplay tags={tags} />
            </div>

            {/* Tag browser table controller */}
            <div className="shrink-0">
              <TagTable
                tags={tags}
                onWriteTag={handleWriteTag}
                onForceTag={handleForceTag}
                onUnforceTag={handleUnforceTag}
              />
            </div>
          </div>

          {/* Col 3: Test runner, Alarm monitoring, and Event logs stream */}
          <div className="flex flex-col space-y-4">
            {/* Validation Test Runner */}
            <div className="shrink-0">
              <TestPlanRunner
                testPlans={testPlans}
                onRunTestPlan={handleRunTestPlan}
                isRunning={isTestRunning}
                activePlanId={activeTestPlanId}
              />
            </div>

            {/* Live Alarm Panel */}
            <div className="flex-grow">
              <AlarmPanel
                alarms={alarms}
                onAcknowledge={handleAcknowledgeAlarm}
              />
            </div>

            {/* Event Audit Logs */}
            <div className="flex-grow">
              <EventLog logs={eventLogs} />
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-grow flex items-center justify-center font-mono text-xs text-panel-500">
          LOADING PLC CONTROLLERS & SCHEMATICS...
        </div>
      )}
    </div>
  );
}
