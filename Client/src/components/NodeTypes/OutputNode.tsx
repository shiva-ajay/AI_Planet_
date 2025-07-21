import React from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { FileOutput, Settings } from "lucide-react";

export interface NodeData {
  config?: Record<string, unknown>;
}

export const OutputNode: React.FC<NodeProps<NodeData>> = ({ selected, data }) => {
  const outputText = typeof data?.config?.output === "string"
    ? data.config.output
    : "Output will be generated based on query";
  
  return (
    <div
      className={`bg-white rounded-lg border-2 p-4 w-[280px] ${
        selected ? "border-blue-500" : "border-gray-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        className="w-4 h-4 bg-gray-400"
        style={{
          position: "absolute",
          width: "8px",
          height: "8px",
          backgroundColor: "#4FF02F",
          border: "1px solid #64748b",
        }}
      />
      <div className="flex items-center gap-2 mb-3">
        <FileOutput className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-sm">Output</span>
        <Settings className="w-4 h-4 text-gray-400 ml-auto" />
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600">
            Output of the result nodes as text
          </label>
        </div>
        <div>
          <label className="text-xs font-medium">Output Text</label>
          <div className="mt-1 p-2 border rounded text-sm bg-gray-50 text-gray-600 h-20 overflow-y-auto break-words">
            {outputText}
          </div>
        </div>
      </div>
    </div>
  );
};