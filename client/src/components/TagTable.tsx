import React, { useState } from 'react';
import { Tag } from '../types';
import { Search, ShieldAlert, Edit2, Play } from 'lucide-react';

interface TagTableProps {
  tags: Record<string, Tag>;
  onWriteTag: (name: string, value: any) => void;
  onForceTag: (name: string, value: any) => void;
  onUnforceTag: (name: string) => void;
}

export const TagTable: React.FC<TagTableProps> = ({
  tags,
  onWriteTag,
  onForceTag,
  onUnforceTag,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [writeVals, setWriteVals] = useState<Record<string, string>>({});

  const filteredTags = Object.values(tags).filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (tagName: string, val: string) => {
    setWriteVals((prev) => ({ ...prev, [tagName]: val }));
  };

  const executeWrite = (tag: Tag) => {
    const rawVal = writeVals[tag.name];
    if (rawVal === undefined || rawVal === '') return;

    let parsedVal: any;
    if (tag.dataType === 'bool') {
      parsedVal = rawVal.toLowerCase() === 'true' || rawVal === '1';
    } else if (tag.dataType === 'int') {
      parsedVal = parseInt(rawVal, 10);
    } else {
      parsedVal = parseFloat(rawVal);
    }

    if (isNaN(parsedVal) && tag.dataType !== 'bool') return;
    onWriteTag(tag.name, parsedVal);
  };

  const executeForce = (tag: Tag) => {
    const rawVal = writeVals[tag.name];
    if (rawVal === undefined || rawVal === '') return;

    let parsedVal: any;
    if (tag.dataType === 'bool') {
      parsedVal = rawVal.toLowerCase() === 'true' || rawVal === '1';
    } else if (tag.dataType === 'int') {
      parsedVal = parseInt(rawVal, 10);
    } else {
      parsedVal = parseFloat(rawVal);
    }

    if (isNaN(parsedVal) && tag.dataType !== 'bool') return;
    onForceTag(tag.name, parsedVal);
  };

  return (
    <div className="bg-panel-700 border border-panel-500 p-4 h-full flex flex-col font-sans">
      {/* Search and Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-panel-500 pb-3 mb-3 gap-2 select-none">
        <span className="text-xs uppercase font-mono font-bold tracking-wider text-panel-100 flex items-center">
          <ShieldAlert className="h-4 w-4 mr-1.5 text-alarm-medium" />
          Tag database controller
        </span>
        <div className="relative w-full md:w-48">
          <input
            type="text"
            placeholder="FILTER TAGS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-panel-900 border border-panel-500 pl-7 pr-2 py-1 text-[10px] font-mono uppercase text-panel-100 focus:outline-none focus:border-running-teal rounded-sm"
          />
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-panel-500" />
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-grow overflow-y-auto max-h-[300px] border border-panel-500">
        <table className="w-full text-left border-collapse font-mono text-[10px] select-text">
          <thead>
            <tr className="bg-panel-900 border-b border-panel-500 text-panel-500 select-none">
              <th className="py-1 px-2 font-medium">TAG ADDRESS</th>
              <th className="py-1 px-2 font-medium">NAME</th>
              <th className="py-1 px-2 font-medium">TYPE</th>
              <th className="py-1 px-2 font-medium">LIVE VALUE</th>
              <th className="py-1 px-2 font-medium">FORCE STATE</th>
              <th className="py-1 px-2 font-medium text-right">ACTION COMMANDS</th>
            </tr>
          </thead>
          <tbody>
            {filteredTags.map((tag) => {
              const liveVal = tag.forced ? tag.forcedValue : tag.value;
              const isBool = tag.dataType === 'bool';

              return (
                <tr
                  key={tag.name}
                  className={`border-b border-panel-500/30 hover:bg-panel-900/30 transition-colors ${
                    tag.forced ? 'bg-alarm-medium/5' : ''
                  }`}
                >
                  {/* Address */}
                  <td className="py-1.5 px-2 text-panel-500 font-semibold">{tag.address}</td>
                  
                  {/* Name */}
                  <td className="py-1.5 px-2 font-bold text-panel-100">{tag.name}</td>
                  
                  {/* Data Type */}
                  <td className="py-1.5 px-2 uppercase text-panel-500">{tag.dataType}</td>
                  
                  {/* Value */}
                  <td className="py-1.5 px-2">
                    <span
                      className={`font-semibold ${
                        tag.forced
                          ? 'text-alarm-medium'
                          : isBool
                          ? liveVal
                            ? 'text-running-teal'
                            : 'text-panel-500'
                          : 'text-panel-100'
                      }`}
                    >
                      {String(liveVal).toUpperCase()}
                    </span>
                  </td>

                  {/* Force State */}
                  <td className="py-1.5 px-2 select-none">
                    {tag.forced ? (
                      <span className="inline-block px-1 border border-alarm-medium text-alarm-medium font-bold uppercase text-[8px] animate-pulse">
                        FORCED: {String(tag.forcedValue).toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-panel-500">DYNAMIC</span>
                    )}
                  </td>

                  {/* Actions (Write / Force inputs) */}
                  <td className="py-1.5 px-2 text-right">
                    <div className="inline-flex items-center space-x-1.5">
                      <input
                        type="text"
                        placeholder="VAL"
                        value={writeVals[tag.name] || ''}
                        onChange={(e) => handleInputChange(tag.name, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') executeWrite(tag);
                        }}
                        className="w-12 bg-panel-900 border border-panel-500 text-center py-0.5 text-[9px] text-panel-100 uppercase focus:outline-none focus:border-running-teal rounded-sm"
                      />
                      
                      {/* Write command */}
                      <button
                        onClick={() => executeWrite(tag)}
                        title="Write single scan value (will override unless forced)"
                        className="px-1 py-0.5 border border-panel-500 text-panel-500 hover:border-running-teal hover:text-running-teal text-[9px] font-bold"
                      >
                        WRITE
                      </button>

                      {/* Force / Unforce commands */}
                      {tag.forced ? (
                        <button
                          onClick={() => onUnforceTag(tag.name)}
                          className="px-1.5 py-0.5 bg-alarm-medium text-panel-900 font-bold text-[9px]"
                        >
                          RELEASE
                        </button>
                      ) : (
                        <button
                          onClick={() => executeForce(tag)}
                          title="Force value locks PLC evaluation of tag"
                          className="px-1 py-0.5 border border-panel-500 text-panel-500 hover:bg-alarm-medium hover:text-panel-900 hover:border-alarm-medium text-[9px] font-bold"
                        >
                          FORCE
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
