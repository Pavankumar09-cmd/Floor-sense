import express from 'express';
import cors from 'cors';
import { getProjects, getProject, createProject, deleteProject } from './modules/projectController';
import { 
  createMachine, 
  getMachine, 
  startSimulation, 
  stopSimulation, 
  writeTag, 
  forceTag, 
  unforceTag 
} from './modules/machineController';
import { getLogs, getAlarms, acknowledgeAlarm } from './modules/logController';
import { createTestPlan, getTestPlans, runTestPlan } from './modules/testPlanController';

const app = express();

app.use(cors());
app.use(express.json());

// Projects API
app.get('/api/projects', getProjects);
app.get('/api/projects/:id', getProject);
app.post('/api/projects', createProject);
app.delete('/api/projects/:id', deleteProject);

// Machines API
app.post('/api/machines', createMachine);
app.get('/api/machines/:id', getMachine);
app.post('/api/machines/:id/start', startSimulation);
app.post('/api/machines/:id/stop', stopSimulation);
app.post('/api/machines/:id/write-tag', writeTag);
app.post('/api/machines/:id/force-tag', forceTag);
app.post('/api/machines/:id/unforce-tag', unforceTag);

// Alarms and Logs API
app.get('/api/machines/:machineId/logs', getLogs);
app.get('/api/machines/:machineId/alarms', getAlarms);
app.post('/api/alarms/:alarmId/acknowledge', acknowledgeAlarm);

// Test Plans API
app.post('/api/test-plans', createTestPlan);
app.get('/api/machines/:machineId/test-plans', getTestPlans);
app.post('/api/test-plans/:id/run', runTestPlan);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'floorsense-backend' });
});

export default app;
