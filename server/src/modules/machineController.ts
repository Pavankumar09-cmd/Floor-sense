import { Request, Response } from 'express';
import axios from 'axios';
import db from '../config/database';

const SIM_ENGINE_URL = process.env.SIM_ENGINE_URL || 'http://localhost:8000';

export async function createMachine(req: Request, res: Response) {
  const { projectId, name, machineType, scanPeriodMs, tags, program, sequences, alarms } = req.body;
  
  if (!projectId || !name || !machineType) {
    return res.status(400).json({ error: 'projectId, name, and machineType are required' });
  }

  const machineId = 'mach_' + Math.random().toString(36).substring(2, 9);
  const trx = await db.transaction();

  try {
    // 1. Insert Machine
    await trx('machines').insert({
      id: machineId,
      project_id: projectId,
      name,
      machine_type: machineType,
      scan_period_ms: scanPeriodMs || 100,
      program: JSON.stringify(program || { rungs: [], timers: [] }),
      created_at: new Date()
    });

    // 2. Insert Tags
    if (tags && Array.isArray(tags)) {
      const tagInserts = tags.map((t: any) => ({
        id: 'tag_' + Math.random().toString(36).substring(2, 9),
        machine_id: machineId,
        name: t.name,
        data_type: t.dataType,
        address: t.address,
        source: t.source,
        description: t.description || '',
        created_at: new Date()
      }));
      if (tagInserts.length > 0) {
        await trx('tags').insert(tagInserts);
      }
    }

    // 3. Insert Alarms
    if (alarms && Array.isArray(alarms)) {
      const alarmInserts = alarms.map((a: any) => ({
        id: 'alm_' + Math.random().toString(36).substring(2, 9),
        machine_id: machineId,
        name: a.name,
        tag_ref: a.tagRef,
        condition: a.condition,
        priority: a.priority,
        state: 'cleared',
        raised_at: null,
        acked_at: null,
        cleared_at: null
      }));
      if (alarmInserts.length > 0) {
        await trx('alarms').insert(alarmInserts);
      }
    }

    // 4. Insert Sequences
    if (sequences && Array.isArray(sequences)) {
      const seqInserts = sequences.map((s: any) => ({
        id: 'seq_' + Math.random().toString(36).substring(2, 9),
        machine_id: machineId,
        name: s.name,
        steps: JSON.stringify(s.steps || []),
        created_at: new Date()
      }));
      if (seqInserts.length > 0) {
        await trx('sequences').insert(seqInserts);
      }
    }

    // 5. Add initial event log
    await trx('event_logs').insert({
      machine_id: machineId,
      timestamp: new Date(),
      source: 'system',
      actor: 'system',
      new_value: 'Machine created: ' + name
    });

    await trx.commit();
    
    // Fetch and return the fully created machine
    const newMachine = await getMachineDetailsFromDb(machineId);
    res.status(201).json(newMachine);
  } catch (error: any) {
    await trx.rollback();
    res.status(500).json({ error: error.message });
  }
}

export async function getMachine(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const machine = await getMachineDetailsFromDb(id);
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }
    res.json(machine);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

async function getMachineDetailsFromDb(id: string) {
  const machine = await db('machines').where('id', id).first();
  if (!machine) return null;

  const tags = await db('tags').where('machine_id', id).select('*');
  const alarms = await db('alarms').where('machine_id', id).select('*');
  const sequences = await db('sequences').where('machine_id', id).select('*');

  return {
    ...machine,
    program: JSON.parse(machine.program),
    tags: tags.map(t => ({
      name: t.name,
      dataType: t.data_type,
      address: t.address,
      source: t.source,
      description: t.description
    })),
    alarms: alarms.map(a => ({
      id: a.id,
      name: a.name,
      tagRef: a.tag_ref,
      condition: a.condition,
      priority: a.priority,
      state: a.state,
      raisedAt: a.raised_at,
      ackedAt: a.acked_at,
      clearedAt: a.cleared_at
    })),
    sequences: sequences.map(s => ({
      id: s.id,
      name: s.name,
      steps: JSON.parse(s.steps)
    }))
  };
}

// ----------------- Simulation Control Endpoints -----------------

export async function startSimulation(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const machine = await getMachineDetailsFromDb(id);
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    // Call Python Sim Engine API
    const response = await axios.post(`${SIM_ENGINE_URL}/api/simulation/start`, {
      machineId: machine.id,
      machineType: machine.machine_type,
      scanPeriodMs: machine.scan_period_ms,
      tags: machine.tags,
      program: machine.program
    });

    // Log start event
    await db('event_logs').insert({
      machine_id: id,
      timestamp: new Date(),
      source: 'system',
      actor: req.body.actor || 'operator',
      new_value: 'Simulation started'
    });

    res.json({ message: 'Simulation started successfully', simState: response.data });
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
}

export async function stopSimulation(req: Request, res: Response) {
  const { id } = req.params;
  try {
    // Call Python Sim Engine API
    await axios.post(`${SIM_ENGINE_URL}/api/simulation/stop`, { machineId: id });

    // Log stop event
    await db('event_logs').insert({
      machine_id: id,
      timestamp: new Date(),
      source: 'system',
      actor: req.body.actor || 'operator',
      new_value: 'Simulation stopped'
    });

    res.json({ message: 'Simulation stopped successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
}

export async function writeTag(req: Request, res: Response) {
  const { id } = req.params;
  const { tagName, value, actor } = req.body;

  try {
    // 1. Send request to Simulation Engine
    await axios.post(`${SIM_ENGINE_URL}/api/simulation/write`, {
      machineId: id,
      tagName,
      value
    });

    // 2. Log tag write
    await db('event_logs').insert({
      machine_id: id,
      timestamp: new Date(),
      source: 'operator',
      tag_ref: tagName,
      new_value: String(value),
      actor: actor || 'operator'
    });

    res.json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
}

export async function forceTag(req: Request, res: Response) {
  const { id } = req.params;
  const { tagName, value, actor } = req.body;

  try {
    await axios.post(`${SIM_ENGINE_URL}/api/simulation/force`, {
      machineId: id,
      tagName,
      value
    });

    await db('event_logs').insert({
      machine_id: id,
      timestamp: new Date(),
      source: 'operator',
      tag_ref: tagName,
      new_value: `FORCED:${value}`,
      actor: actor || 'operator'
    });

    res.json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
}

export async function unforceTag(req: Request, res: Response) {
  const { id } = req.params;
  const { tagName, actor } = req.body;

  try {
    await axios.post(`${SIM_ENGINE_URL}/api/simulation/unforce`, {
      machineId: id,
      tagName
    });

    await db('event_logs').insert({
      machine_id: id,
      timestamp: new Date(),
      source: 'operator',
      tag_ref: tagName,
      new_value: `UNFORCED`,
      actor: actor || 'operator'
    });

    res.json({ status: 'success' });
  } catch (error: any) {
    res.status(500).json({ error: error.response?.data?.detail || error.message });
  }
}
