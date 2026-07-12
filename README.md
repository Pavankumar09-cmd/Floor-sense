# FloorSense

**Test the logic before you trust the line.**

FloorSense is a virtual commissioning platform that allows engineers to validate PLC control logic and HMI workflows before deploying them to physical production equipment.

The goal is to reduce commissioning time, identify logic errors early, and improve the reliability of industrial automation systems without requiring access to real hardware.

---

## Status

🚧 Work in Progress

This project is currently under active development.

The first version will focus on virtual PLC logic simulation and HMI interaction.

---

## Problem Statement

Testing PLC programs directly on production equipment can be time-consuming, expensive, and risky.

FloorSense provides a virtual environment where engineers can:

- Validate PLC control logic
- Test HMI screens
- Simulate sensors and actuators
- Detect sequencing issues
- Verify alarms and safety logic

before deploying to actual machines.

---

## Planned Features

- PLC Logic Simulation
- Interactive HMI Dashboard
- Virtual Sensors & Actuators
- Alarm Simulation
- Machine State Visualization
- Event Logging
- Multi-machine Simulation
- Production Sequence Testing
- Digital Commissioning Workflow

---

## Planned Tech Stack

### Frontend
- React
- TypeScript

### Backend
- Node.js
- Express.js

### Simulation
- Python

### Database
- PostgreSQL / SQLite

### DevOps
- Docker
- GitHub Actions

---

## Architecture

```
Operator
      │
      ▼
React HMI
      │
 REST API
      │
Node.js Backend
      │
PLC Logic Engine (Python)
      │
Virtual Sensors & Actuators
      │
Simulation Database
```

---

## Future Scope

- OPC UA Integration
- MQTT Communication
- IEC 61131-3 Logic Support
- Multi-Line Factory Simulation
- AI-based Fault Detection
- Predictive Diagnostics

---

## Motivation

FloorSense is inspired by the growing need for virtual commissioning in Industry 4.0 and Smart Manufacturing, helping engineers test machine behavior before physical deployment.

---

## Author

Pavankumar Balijireddi
