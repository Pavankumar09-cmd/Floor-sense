import React from 'react';
import { Cpu, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Project, Machine } from '../types';

interface HeaderProps {
  currentProject: Project | null;
  currentMachine: Machine | null;
  isConnected: boolean;
  scanTimeMs: number;
  cycleOverrun: boolean;
  isSimulating: boolean;
  onToggleSim: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  currentMachine,
  isConnected,
  scanTimeMs,
  cycleOverrun,
  isSimulating,
  onToggleSim,
}) => {
  return (
    <header className="bg-panel-900 border-b border-panel-500 px-4 py-3 flex items-center justify-between font-sans select-none">
      {/* Brand & Project Info */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="bg-panel-700 border border-panel-500 p-1">
            <Cpu className={`h-5 w-5 ${isSimulating ? 'text-running-teal animate-pulse' : 'text-panel-100'}`} />
          </div>
          <div>
            <span className="font-mono font-bold tracking-tight text-panel-100 text-lg uppercase">FloorSense</span>
            <span className="text-[10px] text-panel-500 font-mono block leading-none">V_COMMISSIONING_SYS_2.0</span>
          </div>
        </div>

        {currentProject && (
          <div className="hidden md:flex flex-col border-l border-panel-500 pl-6">
            <span className="text-xs text-panel-500 uppercase tracking-wider font-mono">Project</span>
            <span className="text-sm font-semibold text-panel-100">{currentProject.name}</span>
          </div>
        )}

        {currentMachine && (
          <div className="hidden md:flex flex-col border-l border-panel-500 pl-6">
            <span className="text-xs text-panel-500 uppercase tracking-wider font-mono">Active PLC Node</span>
            <span className="text-sm font-mono text-running-teal">{currentMachine.name}</span>
          </div>
        )}
      </div>

      {/* Diagnostics / Status bar */}
      <div className="flex items-center space-x-4">
        {/* Connection State */}
        <div className="flex items-center bg-panel-700 border border-panel-500 px-3 py-1.5 space-x-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-running-teal" />
              <span className="text-xs font-mono font-medium text-running-teal uppercase tracking-wider">LIVE_COMMS</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-alarm-high animate-pulse" />
              <span className="text-xs font-mono font-medium text-alarm-high uppercase tracking-wider animate-pulse">COMM_FAIL</span>
            </>
          )}
        </div>

        {/* Scan Cycle Diagnostics */}
        {isSimulating && (
          <div className="hidden lg:flex items-center bg-panel-700 border border-panel-500 px-3 py-1 text-xs font-mono space-x-4">
            <div className="flex flex-col">
              <span className="text-[9px] text-panel-500 uppercase">SCAN_TGT</span>
              <span className="text-panel-100">{currentMachine?.scan_period_ms || 100}ms</span>
            </div>
            <div className="flex flex-col border-l border-panel-500 pl-4">
              <span className="text-[9px] text-panel-500 uppercase">SCAN_ACT</span>
              <span className={`font-semibold ${cycleOverrun ? 'text-alarm-medium' : 'text-running-teal'}`}>
                {scanTimeMs.toFixed(2)}ms
              </span>
            </div>
            <div className="flex flex-col border-l border-panel-500 pl-4">
              <span className="text-[9px] text-panel-500 uppercase">CPU_STATE</span>
              {cycleOverrun ? (
                <span className="text-alarm-medium flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>OVERRUN</span>
                </span>
              ) : (
                <span className="text-running-teal">OK</span>
              )}
            </div>
          </div>
        )}

        {/* Start / Stop Simulation */}
        <button
          onClick={onToggleSim}
          className={`px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors duration-150 rounded-sm border ${
            isSimulating
              ? 'bg-alarm-high/15 border-alarm-high text-alarm-high hover:bg-alarm-high/35'
              : 'bg-running-teal/15 border-running-teal text-running-teal hover:bg-running-teal/35'
          }`}
        >
          {isSimulating ? 'HALT_SIM' : 'RUN_SIM'}
        </button>
      </div>
    </header>
  );
};
