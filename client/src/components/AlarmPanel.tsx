import React from 'react';
import { AlertCircle, CheckCircle, Flame } from 'lucide-react';
import { Alarm } from '../types';

interface AlarmPanelProps {
  alarms: Alarm[];
  onAcknowledge: (alarmId: string) => void;
}

export const AlarmPanel: React.FC<AlarmPanelProps> = ({ alarms, onAcknowledge }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-alarm-high border-alarm-high';
      case 'medium':
        return 'text-alarm-medium border-alarm-medium';
      case 'low':
        return 'text-alarm-low border-alarm-low';
      default:
        return 'text-panel-500 border-panel-500';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-alarm-high/10';
      case 'medium':
        return 'bg-alarm-medium/10';
      case 'low':
        return 'bg-alarm-low/10';
      default:
        return 'bg-panel-900';
    }
  };

  // Sort: unacknowledged alarms first, then acknowledged, then cleared
  const sortedAlarms = [...alarms].sort((a, b) => {
    if (a.state === 'unacknowledged' && b.state !== 'unacknowledged') return -1;
    if (a.state !== 'unacknowledged' && b.state === 'unacknowledged') return 1;
    if (a.state === 'acknowledged' && b.state === 'cleared') return -1;
    if (a.state === 'cleared' && b.state === 'acknowledged') return 1;
    return 0;
  });

  return (
    <div className="bg-panel-700 border border-panel-500 p-4 h-full flex flex-col font-sans">
      <div className="border-b border-panel-500 pb-2 mb-3 select-none flex justify-between items-center">
        <span className="text-xs uppercase font-mono font-bold tracking-wider text-panel-100 flex items-center">
          <Flame className="h-4 w-4 mr-1.5 text-alarm-high" />
          Active alarm status panel
        </span>
        <span className="text-[10px] font-mono text-panel-500">
          ACTIVE_COUNT: {alarms.filter(a => a.state !== 'cleared').length}
        </span>
      </div>

      <div className="flex-grow overflow-y-auto max-h-[220px]">
        {sortedAlarms.length === 0 ? (
          <div className="h-full flex items-center justify-center border border-dashed border-panel-500 p-8 text-center">
            <div className="text-xs text-panel-500 font-mono">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-panel-500" />
              NO ACTIVE PROCESS ALARMS
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse font-mono text-[11px]">
            <thead>
              <tr className="border-b border-panel-500 text-panel-500 select-none">
                <th className="py-1.5 px-2 font-medium">ACK</th>
                <th className="py-1.5 px-2 font-medium">SEV</th>
                <th className="py-1.5 px-2 font-medium">SOURCE</th>
                <th className="py-1.5 px-2 font-medium">ALARM NAME</th>
                <th className="py-1.5 px-2 font-medium">CONDITION</th>
                <th className="py-1.5 px-2 font-medium">STATE</th>
              </tr>
            </thead>
            <tbody>
              {sortedAlarms.map((alarm) => {
                const isActive = alarm.state !== 'cleared';
                const isUnacked = alarm.state === 'unacknowledged';

                return (
                  <tr
                    key={alarm.id}
                    className={`border-b border-panel-500/50 transition-colors ${
                      isUnacked ? getPriorityBg(alarm.priority) : ''
                    }`}
                  >
                    <td className="py-2 px-2">
                      {isUnacked ? (
                        <button
                          onClick={() => onAcknowledge(alarm.id)}
                          className="px-1.5 py-0.5 border border-panel-100 hover:bg-panel-100 hover:text-panel-900 transition-colors uppercase text-[9px] font-bold"
                        >
                          ACK
                        </button>
                      ) : (
                        <span className="text-panel-500 select-none">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2 font-bold select-none">
                      <span className={`px-1 border ${getPriorityColor(alarm.priority)} uppercase text-[9px]`}>
                        {alarm.priority}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-panel-100">{alarm.tagRef}</td>
                    <td className="py-2 px-2 font-bold text-panel-100">{alarm.name}</td>
                    <td className="py-2 px-2 text-panel-500">{alarm.condition}</td>
                    <td className="py-2 px-2">
                      <span
                        className={`font-semibold flex items-center space-x-1 uppercase text-[10px] ${
                          alarm.state === 'unacknowledged'
                            ? getPriorityColor(alarm.priority) + ' animate-pulse'
                            : alarm.state === 'acknowledged'
                            ? 'text-panel-100'
                            : 'text-panel-500'
                        }`}
                      >
                        {alarm.state === 'unacknowledged' && <AlertCircle className="h-3 w-3" />}
                        <span>{alarm.state}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
