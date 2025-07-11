import React from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { FileOutput, Settings } from 'lucide-react';
// Remove the import if NodeData is not exported or replace with the correct type if available

export const OutputNode: React.FC<NodeProps> = ({ selected }) => {
  return (
    <div className={`bg-white rounded-lg border-2 p-4 min-w-[280px] ${selected ? 'border-blue-500' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      <div className="flex items-center gap-2 mb-3">
        <FileOutput className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-sm">Output</span>
        <Settings className="w-4 h-4 text-gray-400 ml-auto" />
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600">Output of the result nodes as text</label>
        </div>
        <div>
          <label className="text-xs font-medium">Output Text</label>
          <div className="mt-1 p-2 border rounded text-sm bg-gray-50 text-gray-600">
            Output will be generated based on query
          </div>
        </div>
      </div>
    </div>
  );
};