import WebSocket from 'ws';
import db from '../config/database';

const SIM_ENGINE_WS = process.env.SIM_ENGINE_WS || 'ws://localhost:8000/ws';

interface CachedAlarm {
  id: string;
  name: string;
  tagRef: string;
  condition: string;
  priority: string;
  state: 'unacknowledged' | 'acknowledged' | 'cleared';
}

export class WebSocketRelay {
  private clientWsServer: WebSocket.Server;
  private simWs: WebSocket | null = null;
  private clients: Set<WebSocket> = new Set();
  
  // Cache for machine alarms to avoid hammering the DB every 100ms
  private alarmCache: Map<string, CachedAlarm[]> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();

  constructor(port: number) {
    this.clientWsServer = new WebSocket.Server({ port });
    console.log(`WebSocket Relay server listening for clients on port ${port}`);

    this.clientWsServer.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`Web client connected. Total clients: ${this.clients.size}`);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`Web client disconnected. Total clients: ${this.clients.size}`);
      });
    });

    this.connectToSimEngine();
  }

  private connectToSimEngine() {
    console.log(`Connecting to Simulation Engine WS at ${SIM_ENGINE_WS}...`);
    this.simWs = new WebSocket(SIM_ENGINE_WS);

    this.simWs.on('open', () => {
      console.log('Connected to Simulation Engine WebSocket.');
    });

    this.simWs.on('message', async (messageData) => {
      try {
        const payload = JSON.parse(messageData.toString());
        if (payload.type === 'tag_update') {
          const machineId = payload.machineId;
          const simData = payload.data;

          // 1. Evaluate alarms based on the new tag values
          const updatedAlarms = await this.evaluateAlarms(machineId, simData.tags);

          // 2. Relay the message to all connected web clients, embedding current alarms
          const relayPayload = JSON.stringify({
            type: 'tag_update',
            machineId,
            scanTimeMs: simData.actualScanTimeMs,
            cycleOverrun: simData.cycleOverrun,
            tags: simData.tags,
            alarms: updatedAlarms
          });

          for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(relayPayload);
            }
          }
        }
      } catch (err: any) {
        console.error('Error processing message from Sim Engine:', err.message);
      }
    });

    this.simWs.on('close', () => {
      console.warn('Simulation Engine WS closed. Reconnecting in 5s...');
      this.simWs = null;
      setTimeout(() => this.connectToSimEngine(), 5000);
    });

    this.simWs.on('error', (err) => {
      console.error('Simulation Engine WS connection error:', err.message);
    });
  }

  private async evaluateAlarms(machineId: string, tags: Record<string, any>): Promise<any[]> {
    const now = new Date();
    
    // Refresh alarms cache every 5 seconds
    const lastCached = this.cacheTimestamps.get(machineId) || 0;
    if (Date.now() - lastCached > 5000 || !this.alarmCache.has(machineId)) {
      const rows = await db('alarms').where('machine_id', machineId).select('*');
      const alarms: CachedAlarm[] = rows.map(r => ({
        id: r.id,
        name: r.name,
        tagRef: r.tag_ref,
        condition: r.condition,
        priority: r.priority,
        state: r.state
      }));
      this.alarmCache.set(machineId, alarms);
      this.cacheTimestamps.set(machineId, Date.now());
    }

    const cachedAlarms = this.alarmCache.get(machineId) || [];
    const alarmStatesUpdated: any[] = [];

    for (const alarm of cachedAlarms) {
      const tagObj = tags[alarm.tagRef];
      if (!tagObj) continue;

      const tagVal = tagObj.forced ? tagObj.forcedValue : tagObj.value;
      const isTriggered = this.checkCondition(tagVal, alarm.condition);

      let stateChanged = false;
      let newState = alarm.state;

      if (isTriggered) {
        if (alarm.state === 'cleared') {
          newState = 'unacknowledged';
          stateChanged = true;

          // Write to DB
          await db('alarms')
            .where('id', alarm.id)
            .update({
              state: 'unacknowledged',
              raised_at: now,
              cleared_at: null
            });

          // Log event
          await db('event_logs').insert({
            machine_id: machineId,
            timestamp: now,
            source: 'simulation',
            tag_ref: alarm.tagRef,
            new_value: `ALARM_ACTIVE: ${alarm.name}`,
            actor: 'alarm-manager'
          });
        }
      } else {
        if (alarm.state !== 'cleared') {
          newState = 'cleared';
          stateChanged = true;

          // Write to DB
          await db('alarms')
            .where('id', alarm.id)
            .update({
              state: 'cleared',
              cleared_at: now
            });

          // Log event
          await db('event_logs').insert({
            machine_id: machineId,
            timestamp: now,
            source: 'simulation',
            tag_ref: alarm.tagRef,
            new_value: `ALARM_CLEARED: ${alarm.name}`,
            actor: 'alarm-manager'
          });
        }
      }

      if (stateChanged) {
        alarm.state = newState;
        // Invalidate cache immediately so DB writes are preserved
        this.cacheTimestamps.set(machineId, 0); 
      }

      alarmStatesUpdated.push({
        id: alarm.id,
        name: alarm.name,
        tagRef: alarm.tagRef,
        condition: alarm.condition,
        priority: alarm.priority,
        state: alarm.state
      });
    }

    return alarmStatesUpdated;
  }

  private checkCondition(val: any, condStr: string): boolean {
    const parts = condStr.trim().split(/\s+/);
    if (parts.length < 2) return false;
    const operator = parts[0];
    const compareValStr = parts[1];

    let compareVal: any;
    if (compareValStr.toLowerCase() === 'true') compareVal = true;
    else if (compareValStr.toLowerCase() === 'false') compareVal = false;
    else compareVal = parseFloat(compareValStr);

    if (operator === '==') return val === compareVal;
    if (operator === '!=') return val !== compareVal;
    if (operator === '>') return val > compareVal;
    if (operator === '<') return val < compareVal;
    if (operator === '>=') return val >= compareVal;
    if (operator === '<=') return val <= compareVal;
    return false;
  }
}
