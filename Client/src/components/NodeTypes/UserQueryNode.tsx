import React, { useEffect, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { MessageSquare } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore";

export interface NodeData {
  name: string;
  type: string;
  config?: Record<string, unknown>;
}

export const UserQueryNode: React.FC<NodeProps<NodeData>> = ({
  id,
  selected,
  data,
}) => {
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const [query, setQuery] = useState(
    data.config?.query || "Write your query here"
  );

  useEffect(() => {
    updateNodeConfig(id, {
      query: query,
      name: data.name || "UserQuery",
    });
  }, [query, id, updateNodeConfig, data.name]);

  return (
    <div
      className={`bg-white rounded-lg border-2 p-4 min-w-[280px] ${
        selected ? "border-blue-500" : "border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-sm">User Query</span>
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-600">Entry point for queries</label>
        <div className="space-y-1">
          <label className="text-xs font-medium">User Query</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-2 border rounded text-sm resize-none"
            rows={3}
          />
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        className="w-4 h-4 bg-orange-500"
        style={{
          position: "absolute",
          width: "8px",
          height: "8px",
          backgroundColor: "#F58421",
          border: "1px solid #64748b",
        }}
      />
    </div>
  );
};
