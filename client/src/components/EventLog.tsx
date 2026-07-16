import React, { useState } from 'react';
import { Terminal, ShieldAlert, Edit3, ArrowRight } from 'lucide-react';
import { EventLog as EventLogType } from '../types';

interface EventLogProps {
  logs: EventLogType[];
}

export const EventLog: React.FC<EventLogProps> = ({ logs }) => {
  const [filter, setFilter] = useState<'all' | 'alarms' | 'forces' | 'operator'>('all');

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'alarms') {
      return log.new_value?.includes('ALARM_');
    }
    if (filter === 'forces') {
      return log.new_value?.includes('FORCED') || log.new_value?.includes('UNFORCED');
    }
    if (filter === 'operator') {
      return log.source === 'operator';
    }
    return true;
  });

  return (
    <div className="bg-panel-700 border border-panel-500 p-4 h-full flex flex-col font-sans">
      {/* Log Header with filter buttons */}
      <div className="flex items-center justify-between border-b border-panel-500 pb-2 mb-3 select-none">
        <span className="text-xs uppercase font-mono font-bold tracking-wider text-panel-100 flex items-center">
          <Terminal className="h-4 w-4 mr-1.5 text-running-teal" />
          Historical Event Log Audit
        </span>
        <div className="flex space-x-1 font-mono text-[9px]">
          {(['all', 'alarms', 'forces', 'operator'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-1.5 py-0.5 border ${
                filter === type
                  ? 'bg-running-teal text-panel-900 border-running-teal font-bold'
                  : 'border-panel-500 text-panel-500 hover:text-panel-100 hover:border-panel-100'
              } uppercase`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Log stream list */}
      <div className="flex-grow overflow-y-auto max-h-[220px] font-mono text-[10px] space-y-1.5 pr-1">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8 text-panel-500 border border-dashed border-panel-500">
            NO AUDIT RECORDS FOUND FOR FILTER
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const isAlarm = log.new_value?.includes('ALARM_');
            const isForce = log.new_value?.includes('FORCED') || log.new_value?.includes('UNFORCED');
            
            // Format timestamp (just time for compactness)
            const timeStr = log.timestamp 
              ? new Date(log.timestamp).toISOString().substring(11, 19)
              : '--:--:--';

            return (
              <div 
                key={log.id || index} 
                className="flex items-start space-x-2 py-1 px-1.5 border-b border-panel-500/20 hover:bg-panel-900/45 transition-colors"
              >
                {/* Time */}
                <span className="text-panel-500 shrink-0 select-none">[{timeStr}]</span>
                
                {/* Source Identifier */}
                <span className="shrink-0">
                  {isAlarm ? (
                    <span className="text-alarm-high flex items-center">
                      <ShieldAlert className="h-3 w-3 mr-0.5" />
                      [ALM]
                    </span>
                  ) : isForce ? (
                    <span className="text-alarm-medium flex items-center">
                      <Edit3 className="h-3 w-3 mr-0.5" />
                      [FRC]
                    </span>
                  ) : (
                    <span className="text-panel-500">[SYS]</span>
                  )}
                </span>

                {/* Log Description */}
                <div className="flex-grow flex flex-wrap items-center gap-x-1.5">
                  {log.actor && (
                    <span className="text-running-teal font-semibold">[{log.actor}]</span>
                  )}
                  {log.tag_ref && (
                    <span className="text-panel-100 underline decoration-panel-500">{log.tag_ref}:</span>
                  )}
                  <span className="text-panel-100">{log.new_value}</span>
                  {log.old_value && (
                    <span className="text-panel-500 flex items-center">
                      (was <ArrowRight className="h-2 w-2 mx-0.5 inline" /> {log.old_value})
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
