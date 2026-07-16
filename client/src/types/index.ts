export interface Tag {
  name: string;
  dataType: 'bool' | 'int' | 'float';
  value: any;
  address: string;
  source: 'sensor' | 'actuator' | 'internal';
  forced: boolean;
  forcedValue: any;
  description: string;
}

export interface Alarm {
  id: string;
  name: string;
  tagRef: string;
  condition: string;
  priority: 'high' | 'medium' | 'low';
  state: 'unacknowledged' | 'acknowledged' | 'cleared';
  raisedAt?: string;
  ackedAt?: string;
  clearedAt?: string;
}

export interface EventLog {
  id: number;
  machine_id: string;
  timestamp: string;
  source: 'system' | 'simulation' | 'operator';
  tag_ref?: string;
  old_value?: string;
  new_value?: string;
  actor?: string;
}

export interface SequenceStep {
  stepIndex: number;
  name: string;
}

export interface TestPlanStepResult {
  stepNumber: number;
  name: string;
  status: 'passed' | 'failed' | 'pending';
  error?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface TestPlan {
  id: string;
  machine_id: string;
  name: string;
  steps: any[];
  last_run_at?: string;
  pass_fail?: 'passed' | 'failed' | null;
  results?: TestPlanStepResult[] | null;
}

export interface Machine {
  id: string;
  project_id: string;
  name: string;
  machine_type: string;
  scan_period_ms: number;
  program: any;
  tags: Tag[];
  alarms: Alarm[];
  sequences: { id: string; name: string; steps: SequenceStep[] }[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  machines?: { id: string; name: string; machine_type: string }[];
}
