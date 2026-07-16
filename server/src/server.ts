import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { initDatabase } from './models/schema';
import { seedDatabase } from './models/seed';
import { WebSocketRelay } from './ws/relay';

const port = process.env.PORT || 5000;
const wsPort = parseInt(process.env.WS_PORT || '5001');

async function main() {
  try {
    // 1. Initialize Database Schema
    await initDatabase();

    // 2. Seed default data if database is empty
    await seedDatabase();

    // 3. Start REST HTTP Server
    app.listen(port, () => {
      console.log(`FloorSense backend REST API listening on port ${port}`);
    });

    // 3. Start WS Relay Server
    new WebSocketRelay(wsPort);

  } catch (error) {
    console.error('Fatal initialization error in backend server:', error);
    process.exit(1);
  }
}

main();
