import React from 'react';
import { Tag } from '../types';

interface MimicDisplayProps {
  tags: Record<string, Tag>;
}

export const MimicDisplay: React.FC<MimicDisplayProps> = ({ tags }) => {
  // Safe helper to extract tag properties
  const getTag = (name: string) => {
    const t = tags[name];
    if (!t) return { value: false, forced: false, forcedValue: null, dataType: 'bool' };
    return {
      value: t.forced ? t.forcedValue : t.value,
      forced: t.forced,
      rawVal: t.value
    };
  };

  const xv101 = getTag('XV_101');
  const xv102 = getTag('XV_102');
  const p101 = getTag('P_101');
  const htr101 = getTag('HTR_101');
  
  const lt101 = getTag('LT_101');
  const tt101 = getTag('TT_101');
  const lsh101 = getTag('LSH_101');
  const lsl101 = getTag('LSL_101');
  
  const seqStep = getTag('SEQ_STEP');

  // Convert level percentage to tank fill height (max height is 120px)
  const levelPct = typeof lt101.value === 'number' ? lt101.value : 0;
  const fillHeight = (levelPct / 100) * 120;
  const fillY = 220 - fillHeight; // Tank bottom is at y=220

  const tempVal = typeof tt101.value === 'number' ? tt101.value : 20.0;
  const stepIdx = typeof seqStep.value === 'number' ? seqStep.value : 0;

  // Step name descriptions
  const stepNames = ["IDLE", "FILLING", "HEATING", "DWELLING", "DRAINING"];

  return (
    <div className="bg-panel-700 border border-panel-500 p-4 h-full flex flex-col font-sans relative">
      {/* Mimic Header */}
      <div className="flex items-center justify-between border-b border-panel-500 pb-2 mb-4 select-none">
        <span className="text-xs uppercase font-mono font-bold tracking-wider text-panel-100 flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-running-teal mr-2"></span>
          RT_01 mimic diagram
        </span>
        <div className="flex space-x-3 text-[10px] font-mono">
          <span className="text-panel-500">SEQUENCE STATE:</span>
          <span className="text-running-teal font-bold">{stepNames[stepIdx] || 'UNKNOWN'} (STEP {stepIdx})</span>
        </div>
      </div>

      {/* SVG Canvas Schematic */}
      <div className="flex-grow flex items-center justify-center min-h-[300px]">
        <svg viewBox="0 0 600 340" className="w-full max-w-[600px] h-auto">
          {/* PIPING: INLET */}
          <path d="M 40,80 L 170,80" className={xv101.value ? "mimic-line-active" : "mimic-line"} />
          <path d="M 170,80 L 170,100" className={xv101.value ? "mimic-line-active" : "mimic-line"} />
          
          {/* PIPING: DRAINING */}
          <path d="M 230,220 L 230,280" className={(xv102.value && p101.value) ? "mimic-line-active" : "mimic-line"} />
          <path d="M 230,280 L 360,280" className={(xv102.value && p101.value) ? "mimic-line-active" : "mimic-line"} />
          <path d="M 360,280 L 480,280" className={(xv102.value && p101.value) ? "mimic-line-active" : "mimic-line"} />

          {/* INLET VALVE: XV_101 */}
          <g transform="translate(155, 65)">
            <polygon 
              points="0,5 30,5 15,15 0,25 30,25 15,15" 
              className={`stroke-2 ${xv101.value ? 'fill-running-teal stroke-running-teal' : 'fill-panel-900 stroke-panel-100'}`} 
            />
            {/* Actuator box */}
            <rect x="10" y="-12" width="10" height="12" className="fill-panel-900 stroke-panel-100 stroke-2" />
            <text x="25" y="-3" className="font-mono text-[9px] fill-panel-100 uppercase">XV_101</text>
            <text x="25" y="6" className={`font-mono text-[8px] ${xv101.value ? 'fill-running-teal font-bold' : 'fill-panel-500'}`}>
              {xv101.value ? 'OPEN' : 'CLSD'}
            </text>
            {xv101.forced && <rect x="-3" y="-15" width="40" height="42" className="fill-none stroke-alarm-medium stroke-1 stroke-dasharray-[2,2]" />}
          </g>

          {/* REACTOR TANK OUTLINE */}
          <rect x="150" y="100" width="160" height="120" className="fill-none stroke-panel-100 stroke-2" />
          
          {/* TANK LIQUID LEVEL DYNAMIC FILL */}
          <rect 
            x="152" 
            y={fillY} 
            width="156" 
            height={fillHeight} 
            className="fill-panel-500/35 transition-all duration-300" 
          />

          {/* HEATER COIL: HTR_101 */}
          <g transform="translate(195, 140)">
            <path 
              d="M 10,0 L 60,0 C 65,0 65,10 60,10 L 10,10 C 5,10 5,20 10,20 L 60,20 C 65,20 65,30 60,30 L 10,30" 
              className={`fill-none stroke-2 ${htr101.value ? 'stroke-running-teal' : 'stroke-panel-500'}`} 
            />
            <text x="10" y="45" className="font-mono text-[9px] fill-panel-100 uppercase">HTR_101</text>
            <text x="10" y="54" className={`font-mono text-[8px] ${htr101.value ? 'fill-running-teal font-bold' : 'fill-panel-500'}`}>
              {htr101.value ? 'ON' : 'OFF'}
            </text>
            {htr101.forced && <rect x="0" y="-8" width="70" height="68" className="fill-none stroke-alarm-medium stroke-1 stroke-dasharray-[2,2]" />}
          </g>

          {/* LEVEL TRANSMITTER: LT_101 */}
          <g transform="translate(325, 120)">
            <circle cx="10" cy="10" r="10" className="fill-panel-900 stroke-panel-100 stroke-2" />
            <line x1="10" y1="20" x2="-15" y2="20" className="stroke-panel-100 stroke-2" />
            <text x="25" y="8" className="font-mono text-[9px] fill-panel-100">LT_101</text>
            <text x="25" y="19" className="font-mono text-[11px] text-panel-100 font-semibold bg-panel-900 px-1 py-0.5 border border-panel-500">
              {levelPct.toFixed(1)} %
            </text>
            {lt101.forced && <rect x="-10" y="-5" width="80" height="30" className="fill-none stroke-alarm-medium stroke-1 stroke-dasharray-[2,2]" />}
          </g>

          {/* TEMP TRANSMITTER: TT_101 */}
          <g transform="translate(325, 170)">
            <circle cx="10" cy="10" r="10" className="fill-panel-900 stroke-panel-100 stroke-2" />
            <line x1="10" y1="20" x2="-15" y2="20" className="stroke-panel-100 stroke-2" />
            <text x="25" y="8" className="font-mono text-[9px] fill-panel-100">TT_101</text>
            <text x="25" y="19" className="font-mono text-[11px] text-panel-100 font-semibold bg-panel-900 px-1 py-0.5 border border-panel-500">
              {tempVal.toFixed(1)} °C
            </text>
            {tt101.forced && <rect x="-10" y="-5" width="85" height="30" className="fill-none stroke-alarm-medium stroke-1 stroke-dasharray-[2,2]" />}
          </g>

          {/* LEVEL SWITCH HIGH: LSH_101 */}
          <g transform="translate(290, 110)">
            <circle cx="5" cy="5" r="5" className={lsh101.value ? 'fill-running-teal stroke-running-teal' : 'fill-panel-900 stroke-panel-100'} />
            <text x="-48" y="8" className="font-mono text-[8px] fill-panel-500">LSH_101</text>
          </g>

          {/* LEVEL SWITCH LOW: LSL_101 */}
          <g transform="translate(290, 200)">
            <circle cx="5" cy="5" r="5" className={lsl101.value ? 'fill-running-teal stroke-running-teal' : 'fill-panel-900 stroke-panel-100'} />
            <text x="-48" y="8" className="font-mono text-[8px] fill-panel-500">LSL_101</text>
          </g>

          {/* OUTLET VALVE: XV_102 */}
          <g transform="translate(215, 240)">
            <polygon 
              points="0,5 30,5 15,15 0,25 30,25 15,15" 
              className={`stroke-2 ${xv102.value ? 'fill-running-teal stroke-running-teal' : 'fill-panel-900 stroke-panel-100'}`} 
            />
            <rect x="10" y="-12" width="10" height="12" className="fill-panel-900 stroke-panel-100 stroke-2" />
            <text x="-42" y="-3" className="font-mono text-[9px] fill-panel-100 uppercase">XV_102</text>
            <text x="-42" y="6" className={`font-mono text-[8px] ${xv102.value ? 'fill-running-teal font-bold' : 'fill-panel-500'}`}>
              {xv102.value ? 'OPEN' : 'CLSD'}
            </text>
            {xv102.forced && <rect x="-3" y="-15" width="40" height="42" className="fill-none stroke-alarm-medium stroke-1 stroke-dasharray-[2,2]" />}
          </g>

          {/* PUMP: P_101 */}
          <g transform="translate(340, 260)">
            <circle cx="20" cy="20" r="18" className={`stroke-2 ${p101.value ? 'fill-running-teal/15 stroke-running-teal' : 'fill-panel-900 stroke-panel-100'}`} />
            {/* Pump impeller design */}
            <path d="M 20,2 L 20,38" className={p101.value ? 'stroke-running-teal' : 'stroke-panel-100'} />
            <path d="M 2,20 L 38,20" className={p101.value ? 'stroke-running-teal' : 'stroke-panel-100'} />
            <text x="45" y="16" className="font-mono text-[9px] fill-panel-100 uppercase">P_101</text>
            <text x="45" y="27" className={`font-mono text-[8px] ${p101.value ? 'fill-running-teal font-bold' : 'fill-panel-500'}`}>
              {p101.value ? 'RUNNING' : 'STOPPED'}
            </text>
            {p101.forced && <rect x="-2" y="-2" width="44" height="44" className="fill-none stroke-alarm-medium stroke-1 stroke-dasharray-[2,2]" />}
          </g>
        </svg>
      </div>

      {/* Forced Warning indicator */}
      {Object.values(tags).some(t => t.forced) && (
        <div className="absolute bottom-2 left-2 border border-alarm-medium/50 bg-alarm-medium/10 text-alarm-medium font-mono text-[9px] px-2 py-0.5 select-none">
          WARNING: SYSTEM HAS ACTIVE TAG FORCES
        </div>
      )}
    </div>
  );
};
