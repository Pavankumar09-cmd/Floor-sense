import { Request, Response } from 'express';
import axios from 'axios';
import db from '../config/database';

const SIM_ENGINE_URL = process.env.SIM_ENGINE_URL || 'http://localhost:8000';

interface Assertion {
  tag: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: any;
}

interface Action {
  type: 'write' | 'force' | 'unforce';
  tag: string;
  value?: any;
}

interface TestStep {
  stepNumber: number;
  name: string;
  actions: Action[];
  assertions: Assertion[];
  timeoutMs: number;
}

export async function createTestPlan(req: Request, res: Response) {
  const { machineId, name, steps } = req.body;
  
  if (!machineId || !name || !steps) {
    return res.status(400).json({ error: 'machineId, name, and steps are required' });
  }

  const id = 'tp_' + Math.random().toString(36).substring(2, 9);
  try {
    await db('test_plans').insert({
      id,
      machine_id: machineId,
      name,
      steps: JSON.stringify(steps),
      last_run_at: null,
      pass_fail: null,
      results: null
    });
    
    const newPlan = await db('test_plans').where('id', id).first();
    res.status(201).json({ ...newPlan, steps: JSON.parse(newPlan.steps) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getTestPlans(req: Request, res: Response) {
  const { machineId } = req.params;
  try {
    const plans = await db('test_plans').where('machine_id', machineId).select('*');
    res.json(plans.map(p => ({
      ...p,
      steps: JSON.parse(p.steps),
      results: p.results ? JSON.parse(p.results) : null
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

// Background Runner execution function
export async function runTestPlan(req: Request, res: Response) {
  const { id } = req.params;
  
  try {
    const testPlan = await db('test_plans').where('id', id).first();
    if (!testPlan) {
      return res.status(404).json({ error: 'Test plan not found' });
    }

    const steps: TestStep[] = JSON.parse(testPlan.steps);
    const machineId = testPlan.machine_id;

    // 1. Ensure machine simulation is started
    const machine = await db('machines').where('id', machineId).first();
    if (!machine) {
      return res.status(404).json({ error: 'Machine associated with test plan not found' });
    }

    // Try starting the simulation (will return ok if already running)
    try {
      await axios.post(`${SIM_ENGINE_URL}/api/simulation/start`, {
        machineId: machine.id,
        machineType: machine.machine_type,
        scanPeriodMs: machine.scan_period_ms,
        tags: await db('tags').where('machine_id', machine.id).select('name', 'data_type', 'address', 'source', 'description').then(rows => rows.map(r => ({
          name: r.name,
          dataType: r.data_type,
          address: r.address,
          source: r.source,
          description: r.description
        }))),
        program: JSON.parse(machine.program)
      });
    } catch (simErr) {
      // Ignored if already running
    }

    // Inform client that the test plan execution has started in background
    // (We will run it asynchronously, updating the database as we go)
    res.json({ message: 'Test plan run started', testPlanId: id });

    // Run execution in the background so we don't hold the HTTP request open
    executeTestPlanInBackground(id, machineId, steps);

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

async function executeTestPlanInBackground(testPlanId: string, machineId: string, steps: TestStep[]) {
  const results: any[] = [];
  let planPassed = true;

  // Log the test start
  await db('event_logs').insert({
    machine_id: machineId,
    timestamp: new Date(),
    source: 'system',
    actor: 'test-runner',
    new_value: `STARTING TEST PLAN RUN: ${testPlanId}`
  });

  for (const step of steps) {
    const stepResult = {
      stepNumber: step.stepNumber,
      name: step.name,
      status: 'pending',
      error: '',
      startedAt: new Date().toISOString(),
      endedAt: ''
    };

    try {
      // 1. Apply Actions
      for (const action of step.actions) {
        if (action.type === 'write') {
          await axios.post(`${SIM_ENGINE_URL}/api/simulation/write`, {
            machineId,
            tagName: action.tag,
            value: action.value
          });
        } else if (action.type === 'force') {
          await axios.post(`${SIM_ENGINE_URL}/api/simulation/force`, {
            machineId,
            tagName: action.tag,
            value: action.value
          });
        } else if (action.type === 'unforce') {
          await axios.post(`${SIM_ENGINE_URL}/api/simulation/unforce`, {
            machineId,
            tagName: action.tag
          });
        }
        
        // Log action execution
        await db('event_logs').insert({
          machine_id: machineId,
          timestamp: new Date(),
          source: 'system',
          tag_ref: action.tag,
          new_value: `TEST_ACTION: ${action.type.toUpperCase()}(${action.value !== undefined ? action.value : ''})`,
          actor: 'test-runner'
        });
      }

      // 2. Poll Assertions
      const pollIntervalMs = 250;
      const maxTicks = Math.ceil(step.timeoutMs / pollIntervalMs);
      let assertionsPassed = false;
      let tick = 0;

      while (tick < maxTicks) {
        // Read live tags from simulation engine
        const stateRes = await axios.get(`${SIM_ENGINE_URL}/api/simulation/${machineId}`);
        const currentTags = stateRes.data.tags;

        // Evaluate all assertions for this step
        let stepAssertionsOk = true;
        for (const assert of step.assertions) {
          const tagObj = currentTags[assert.tag];
          if (!tagObj) {
            stepAssertionsOk = false;
            break;
          }
          
          const tagVal = tagObj.forced ? tagObj.forcedValue : tagObj.value;
          const targetVal = assert.value;
          
          let ok = false;
          if (assert.operator === '==') ok = tagVal === targetVal;
          else if (assert.operator === '!=') ok = tagVal !== targetVal;
          else if (assert.operator === '>') ok = tagVal > targetVal;
          else if (assert.operator === '<') ok = tagVal < targetVal;
          else if (assert.operator === '>=') ok = tagVal >= targetVal;
          else if (assert.operator === '<=') ok = tagVal <= targetVal;
          
          if (!ok) {
            stepAssertionsOk = false;
            break;
          }
        }

        if (stepAssertionsOk) {
          assertionsPassed = true;
          break;
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        tick++;
      }

      stepResult.endedAt = new Date().toISOString();
      if (assertionsPassed) {
        stepResult.status = 'passed';
      } else {
        stepResult.status = 'failed';
        stepResult.error = `Assertion timeout. Conditions not met within ${step.timeoutMs}ms.`;
        planPassed = false;
      }
    } catch (err: any) {
      stepResult.endedAt = new Date().toISOString();
      stepResult.status = 'failed';
      stepResult.error = `Runner error: ${err.message}`;
      planPassed = false;
    }

    results.push(stepResult);

    // Log step completion
    await db('event_logs').insert({
      machine_id: machineId,
      timestamp: new Date(),
      source: 'system',
      new_value: `TEST STEP ${step.stepNumber} COMPLETED: ${stepResult.status.toUpperCase()}`,
      actor: 'test-runner'
    });

    // If a step fails, abort the rest of the plan
    if (!planPassed) {
      break;
    }
  }

  // Update DB with results
  const passFail = planPassed ? 'passed' : 'failed';
  await db('test_plans')
    .where('id', testPlanId)
    .update({
      pass_fail: passFail,
      last_run_at: new Date(),
      results: JSON.stringify(results)
    });

  // Log final test status
  await db('event_logs').insert({
    machine_id: machineId,
    timestamp: new Date(),
    source: 'system',
    actor: 'test-runner',
    new_value: `TEST PLAN COMPLETED: ${passFail.toUpperCase()}`
  });
}
