import { Request, Response } from 'express';
import db from '../config/database';

export async function getLogs(req: Request, res: Response) {
  const { machineId } = req.params;
  const limit = parseInt(req.query.limit as string) || 100;
  
  try {
    const logs = await db('event_logs')
      .where('machine_id', machineId)
      .select('*')
      .orderBy('timestamp', 'desc')
      .limit(limit);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getAlarms(req: Request, res: Response) {
  const { machineId } = req.params;
  try {
    const alarms = await db('alarms').where('machine_id', machineId).select('*');
    res.json(alarms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function acknowledgeAlarm(req: Request, res: Response) {
  const { alarmId } = req.params;
  const { actor } = req.body;

  try {
    const alarm = await db('alarms').where('id', alarmId).first();
    if (!alarm) {
      return res.status(404).json({ error: 'Alarm not found' });
    }

    if (alarm.state === 'unacknowledged') {
      await db('alarms')
        .where('id', alarmId)
        .update({
          state: 'acknowledged',
          acked_at: new Date()
        });

      // Log the operator action
      await db('event_logs').insert({
        machine_id: alarm.machine_id,
        timestamp: new Date(),
        source: 'operator',
        tag_ref: alarm.tag_ref,
        new_value: `ACKNOWLEDGED`,
        actor: actor || 'operator'
      });
    }

    const updatedAlarm = await db('alarms').where('id', alarmId).first();
    res.json(updatedAlarm);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
