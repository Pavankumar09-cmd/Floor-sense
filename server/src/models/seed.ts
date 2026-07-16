import db from '../config/database';

export async function seedDatabase() {
  const projectCount = await db('projects').count('id as count').first();
  const count = projectCount ? parseInt(String(projectCount.count)) : 0;
  
  if (count > 0) {
    console.log('Database already has data. Skipping seeding.');
    return;
  }

  console.log('Seeding demo virtual commissioning project...');

  const projectId = 'proj_demo1';
  const machineId = 'mach_reactor1';

  // 1. Create Project
  await db('projects').insert({
    id: projectId,
    name: 'Virtual Commissioning Demo',
    description: 'Standard chemical batch reactor project demonstrating dynamic loops, interlocks, alarms, and test validations.',
    created_at: new Date()
  });

  // 2. Program definition (Rung & Timer Logic)
  const program = {
    rungs: [
      {
        id: 'rung_seq',
        output: 'SEQ_STEP',
        expression: '1 if (SEQ_STEP == 0 and START_CMD) else (2 if (SEQ_STEP == 1 and LT_101 >= 80.0) else (3 if (SEQ_STEP == 2 and TT_101 >= 85.0) else (4 if (SEQ_STEP == 3 and TON_DWELL) else (0 if (SEQ_STEP == 4 and LT_101 <= 2.0) else SEQ_STEP))))',
        description: 'Sequence step controller state machine transitions.'
      },
      {
        id: 'rung_xv101',
        output: 'XV_101',
        expression: 'True if (SEQ_STEP == 1) else False',
        description: 'Inlet Valve opened only during Fill step (1).'
      },
      {
        id: 'rung_htr101',
        output: 'HTR_101',
        expression: 'True if (SEQ_STEP == 2 and LT_101 > 15.0) else False',
        description: 'Heater enabled in step 2 with low level protection interlock.'
      },
      {
        id: 'rung_xv102',
        output: 'XV_102',
        expression: 'True if (SEQ_STEP == 4) else False',
        description: 'Outlet valve opened during Drain step (4).'
      },
      {
        id: 'rung_p101',
        output: 'P_101',
        expression: 'True if (SEQ_STEP == 4) else False',
        description: 'Drain pump running during Drain step (4).'
      }
    ],
    timers: [
      {
        id: 'TON_DWELL',
        in_expr: 'SEQ_STEP == 3',
        pt_ms: 5000,
        out_tag: 'TON_DWELL',
        et_tag: 'DWELL_ET'
      }
    ]
  };

  // Create Machine
  await db('machines').insert({
    id: machineId,
    project_id: projectId,
    name: 'Reactor Loop Tank 01',
    machine_type: 'reactor_tank',
    scan_period_ms: 100,
    program: JSON.stringify(program),
    created_at: new Date()
  });

  // 3. Create Tags
  const tags = [
    // Actuators
    { name: 'XV_101', dataType: 'bool', address: 'DB100.DBX0.0', source: 'actuator', description: 'Inlet water feed valve (SOLENOID)' },
    { name: 'XV_102', dataType: 'bool', address: 'DB100.DBX0.1', source: 'actuator', description: 'Outlet gravity drain valve (SOLENOID)' },
    { name: 'P_101', dataType: 'bool', address: 'DB100.DBX0.2', source: 'actuator', description: 'Outlet drain pump (MOTOR)' },
    { name: 'HTR_101', dataType: 'bool', address: 'DB100.DBX0.3', source: 'actuator', description: 'Heater coil heating element' },
    
    // Sensors
    { name: 'LT_101', dataType: 'float', address: 'DB100.DBD4', source: 'sensor', description: 'Tank fluid level transmitter (0-100%)' },
    { name: 'TT_101', dataType: 'float', address: 'DB100.DBD8', source: 'sensor', description: 'Reactor fluid temperature transmitter (deg C)' },
    { name: 'LSH_101', dataType: 'bool', address: 'DB100.DBX1.0', source: 'sensor', description: 'High level safety limit switch' },
    { name: 'LSL_101', dataType: 'bool', address: 'DB100.DBX1.1', source: 'sensor', description: 'Low level dry-run safety limit switch' },
    
    // Internal States
    { name: 'START_CMD', dataType: 'bool', address: 'DB100.DBX2.1', source: 'internal', description: 'Start cycle command pushbutton' },
    { name: 'STOP_CMD', dataType: 'bool', address: 'DB100.DBX2.2', source: 'internal', description: 'Graceful stop command pushbutton' },
    { name: 'SEQ_STEP', dataType: 'int', address: 'DB100.DBW20', source: 'internal', description: 'Current batch sequence step index' },
    { name: 'TON_DWELL', dataType: 'bool', address: 'DB100.DBX3.0', source: 'internal', description: 'Timer on-delay output Q' },
    { name: 'DWELL_ET', dataType: 'int', address: 'DB100.DBW22', source: 'internal', description: 'Timer elapsed time in ms' }
  ];

  const tagInserts = tags.map(t => ({
    id: 'tag_' + Math.random().toString(36).substring(2, 9),
    machine_id: machineId,
    name: t.name,
    data_type: t.dataType,
    address: t.address,
    source: t.source,
    description: t.description,
    created_at: new Date()
  }));
  await db('tags').insert(tagInserts);

  // 4. Create Alarms
  const alarms = [
    { id: 'alm_temp_hi', name: 'TT_101 TEMP HIGH-HIGH', tag_ref: 'TT_101', condition: '> 90.0', priority: 'high' },
    { id: 'alm_level_hi', name: 'LT_101 LEVEL HIGH DEV', tag_ref: 'LT_101', condition: '> 95.0', priority: 'medium' },
    { id: 'alm_level_lo', name: 'LT_101 LEVEL LOW DEV', tag_ref: 'LT_101', condition: '< 5.0', priority: 'low' }
  ];

  const alarmInserts = alarms.map(a => ({
    ...a,
    machine_id: machineId,
    state: 'cleared',
    raised_at: null,
    acked_at: null,
    cleared_at: null
  }));
  await db('alarms').insert(alarmInserts);

  // 5. Create Sequences Documentation
  const stepsDocumentation = [
    { stepIndex: 0, name: 'Idle / Standby' },
    { stepIndex: 1, name: 'Water Filling' },
    { stepIndex: 2, name: 'Heating Phase' },
    { stepIndex: 3, name: 'Dwell Soaking' },
    { stepIndex: 4, name: 'Reactor Draining' }
  ];
  await db('sequences').insert({
    id: 'seq_demo1',
    machine_id: machineId,
    name: 'Reactor Batch Sequence',
    steps: JSON.stringify(stepsDocumentation),
    created_at: new Date()
  });

  // 6. Create Test Plan
  const testPlanSteps = [
    {
      stepNumber: 1,
      name: "Verify Standby State & Empty Tank",
      actions: [
        { type: "write", tag: "START_CMD", value: false },
        { type: "write", tag: "STOP_CMD", value: false },
        { type: "force", tag: "XV_101", value: false },
        { type: "write", tag: "XV_102", value: true },
        { type: "write", tag: "P_101", value: true }
      ],
      assertions: [
        { tag: "SEQ_STEP", operator: "==", value: 0 },
        { tag: "LT_101", operator: "<=", value: 2.0 },
        { tag: "LSL_101", operator: "==", value: true }
      ],
      timeoutMs: 4000
    },
    {
      stepNumber: 2,
      name: "Trigger Auto Loop & Start Filling",
      actions: [
        { type: "unforce", tag: "XV_101" },
        { type: "write", tag: "XV_102", value: false },
        { type: "write", tag: "P_101", value: false },
        { type: "write", tag: "START_CMD", value: true }
      ],
      assertions: [
        { tag: "SEQ_STEP", operator: "==", value: 1 },
        { tag: "XV_101", operator: "==", value: true }
      ],
      timeoutMs: 3000
    },
    {
      stepNumber: 3,
      name: "Filling Up to 80% Threshold",
      actions: [
        { type: "write", tag: "START_CMD", value: false }
      ],
      assertions: [
        { tag: "SEQ_STEP", operator: "==", value: 2 },
        { tag: "LT_101", operator: ">=", value: 80.0 },
        { tag: "XV_101", operator: "==", value: false }
      ],
      timeoutMs: 25000
    },
    {
      stepNumber: 4,
      name: "Heating Up to 85°C Temperature",
      actions: [],
      assertions: [
        { tag: "SEQ_STEP", operator: "==", value: 3 },
        { tag: "TT_101", operator: ">=", value: 85.0 },
        { tag: "HTR_101", operator: "==", value: false }
      ],
      timeoutMs: 30000
    },
    {
      stepNumber: 5,
      name: "5s Dwell/Soaking Completion",
      actions: [],
      assertions: [
        { tag: "SEQ_STEP", operator: "==", value: 4 },
        { tag: "XV_102", operator: "==", value: true },
        { tag: "P_101", operator: "==", value: true }
      ],
      timeoutMs: 8000
    },
    {
      stepNumber: 6,
      name: "Draining Process Complete",
      actions: [],
      assertions: [
        { tag: "SEQ_STEP", operator: "==", value: 0 },
        { tag: "LT_101", operator: "<=", value: 2.0 },
        { tag: "P_101", operator: "==", value: false }
      ],
      timeoutMs: 20000
    }
  ];

  await db('test_plans').insert({
    id: 'tp_demo1',
    machine_id: machineId,
    name: 'Reactor Batch Sequence Commissioning',
    steps: JSON.stringify(testPlanSteps),
    last_run_at: null,
    pass_fail: null,
    results: null
  });

  // 7. Event logs
  await db('event_logs').insert({
    machine_id: machineId,
    timestamp: new Date(),
    source: 'system',
    actor: 'seeder',
    new_value: 'Seeded reactor tank machine loop and automated commissioning test plan.'
  });

  console.log('Database seeding complete.');
}
