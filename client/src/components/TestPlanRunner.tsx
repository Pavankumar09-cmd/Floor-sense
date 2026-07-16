import React from 'react';
import { ClipboardList, Play, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { TestPlan } from '../types';

interface TestPlanRunnerProps {
  testPlans: TestPlan[];
  onRunTestPlan: (planId: string) => void;
  isRunning: boolean;
  activePlanId: string | null;
}

export const TestPlanRunner: React.FC<TestPlanRunnerProps> = ({
  testPlans,
  onRunTestPlan,
  isRunning,
  activePlanId,
}) => {
  return (
    <div className="bg-panel-700 border border-panel-500 p-4 h-full flex flex-col font-sans">
      <div className="border-b border-panel-500 pb-2 mb-3 select-none flex justify-between items-center">
        <span className="text-xs uppercase font-mono font-bold tracking-wider text-panel-100 flex items-center">
          <ClipboardList className="h-4 w-4 mr-1.5 text-running-teal" />
          Digital Commissioning Test Runner
        </span>
        {isRunning && (
          <span className="text-[10px] font-mono text-running-teal flex items-center animate-pulse">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            EXECUTING_RUN
          </span>
        )}
      </div>

      <div className="flex-grow overflow-y-auto space-y-4 max-h-[360px] pr-1">
        {testPlans.length === 0 ? (
          <div className="border border-dashed border-panel-500 p-6 text-center text-xs text-panel-500 font-mono">
            NO VALIDATION TEST PLANS DEFINED FOR THIS MACHINE
          </div>
        ) : (
          testPlans.map((plan) => {
            const isPlanRunning = isRunning && activePlanId === plan.id;
            
            return (
              <div key={plan.id} className="border border-panel-500 p-3 bg-panel-900/50 flex flex-col">
                {/* Plan Header */}
                <div className="flex justify-between items-start border-b border-panel-500/55 pb-2 mb-2 select-none">
                  <div>
                    <h3 className="text-xs font-bold text-panel-100 uppercase tracking-tight">{plan.name}</h3>
                    <p className="text-[9px] text-panel-500 font-mono mt-0.5">
                      PLAN_ID: {plan.id} | STEPS: {plan.steps.length}
                    </p>
                  </div>
                  
                  {/* Run / Status Controls */}
                  <div className="flex items-center space-x-2">
                    {plan.pass_fail && (
                      <span
                        className={`px-1.5 py-0.5 font-mono text-[9px] font-bold border uppercase select-none ${
                          plan.pass_fail === 'passed'
                            ? 'text-running-teal border-running-teal bg-running-teal/5'
                            : 'text-alarm-high border-alarm-high bg-alarm-high/5'
                        }`}
                      >
                        {plan.pass_fail}
                      </span>
                    )}

                    <button
                      disabled={isRunning}
                      onClick={() => onRunTestPlan(plan.id)}
                      className={`inline-flex items-center space-x-1 px-3 py-1 font-mono text-[10px] font-bold uppercase transition-colors rounded-sm border ${
                        isRunning
                          ? 'bg-panel-700 border-panel-500 text-panel-500 cursor-not-allowed'
                          : 'bg-running-teal/15 border-running-teal text-running-teal hover:bg-running-teal/35'
                      }`}
                    >
                      <Play className="h-3 w-3" />
                      <span>{isPlanRunning ? 'RUNNING' : 'RUN_TEST'}</span>
                    </button>
                  </div>
                </div>

                {/* Step List */}
                <div className="space-y-1.5">
                  {plan.steps.map((step: any, idx: number) => {
                    // Check execution results
                    const stepResult = plan.results?.find((r: any) => r.stepNumber === step.stepNumber);
                    const status = stepResult?.status || 'pending';

                    return (
                      <div
                        key={step.stepNumber}
                        className={`flex items-center justify-between py-1 px-2 border border-panel-500/30 text-[10px] font-mono ${
                          status === 'passed'
                            ? 'border-running-teal/30 bg-running-teal/5'
                            : status === 'failed'
                            ? 'border-alarm-high/30 bg-alarm-high/5'
                            : 'bg-panel-700/20'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate pr-2">
                          <span className="text-panel-500 font-semibold select-none">STEP {step.stepNumber}:</span>
                          <span className="text-panel-100 truncate">{step.name}</span>
                        </div>
                        
                        <div className="shrink-0 flex items-center">
                          {status === 'passed' ? (
                            <span className="text-running-teal flex items-center space-x-1">
                              <CheckCircle className="h-3 w-3" />
                              <span className="text-[9px] font-bold">PASS</span>
                            </span>
                          ) : status === 'failed' ? (
                            <span className="text-alarm-high flex items-center space-x-1" title={stepResult?.error}>
                              <XCircle className="h-3 w-3" />
                              <span className="text-[9px] font-bold">FAIL</span>
                            </span>
                          ) : isPlanRunning && plan.results?.length === idx ? (
                            <span className="text-running-teal flex items-center space-x-1 animate-pulse">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span className="text-[9px]">ACTIVE</span>
                            </span>
                          ) : (
                            <span className="text-panel-500 uppercase text-[9px] select-none">PENDING</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Last Run Info */}
                {plan.last_run_at && (
                  <div className="mt-2 text-right text-[8px] font-mono text-panel-500 select-none">
                    LAST RUN EXECUTION: {new Date(plan.last_run_at).toLocaleString()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
