import React, { useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Brain, Settings } from "lucide-react";
import type { NodeData } from "../../store/workflowStore";
import { useWorkflowStore } from "../../store/workflowStore";

export const LLMNode: React.FC<NodeProps<NodeData>> = ({
  id,
  selected,
  data,
}) => {
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);

  const [model, setModel] = useState(data.config?.model || "gemini-1.5-flash");
  const [apiKey, setApiKey] = useState(data.config?.apiKey || "");
  const [temperature, setTemperature] = useState(
    data.config?.temperature || "0.7"
  );
  const [webSearch, setWebSearch] = useState(
    data.config?.webSearchEnabled ?? true
  );
  const [serpApi, setSerpApi] = useState(data.config?.serpApiKey || "");
  const [prompt, setPrompt] = useState(data.config?.prompt || "");

  useEffect(() => {
    updateNodeConfig(id, {
      model: model,
      apiKey: apiKey,
      temperature: temperature,
      webSearchEnabled: webSearch,
      serpApiKey: serpApi,
      prompt: prompt,
      name: data.name || "LLMEngine",
    });
  }, [
    model,
    apiKey,
    temperature,
    webSearch,
    serpApi,
    prompt,
    id,
    updateNodeConfig,
    data.name,
  ]);

  return (
    <div
      className={`bg-white rounded-lg border-2 p-4 min-w-[280px] ${
        selected ? "border-blue-500" : "border-gray-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="context"
        className="w-4 h-4 bg-gray-400"
        style={{
          top: "59%",
          position: "absolute",
          width: "8px",
          height: "8px",
          backgroundColor: "#4FF02F",
          border: "1px solid #64748b",
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="query"
        className="w-4 h-4 bg-blue-500"
        style={{
          top: "64%",
          position: "absolute",
          width: "8px",
          height: "8px",
          backgroundColor: "#4FF02F",
          border: "1px solid #64748b",
        }}
      />
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-sm">LLM (OpenAI)</span>
        <Settings className="w-4 h-4 text-gray-400 ml-auto" />
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600">Run a query with LLM</label>
        </div>
        <div>
          <label className="text-xs font-medium">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full mt-1 p-2 border rounded text-sm"
          >
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-pro">Gemini Pro</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full mt-1 p-2 border rounded text-sm"
            placeholder="API Key"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full mt-1 p-2 border rounded text-sm resize-y"
            rows={3}
            placeholder="Enter your prompt here..."
          />
          <div className="mt-1 p-2 border rounded text-sm bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                CONTEXT
              </span>
              <span className="text-xs text-gray-600">(context)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                User Query
              </span>
              <span className="text-xs text-gray-600">(query)</span>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium">Temperature</label>
          <input
            type="text"
            value={temperature}
            onChange={(e) => {
              const val = e.target.value;
              if (
                val === "" ||
                (parseFloat(val) >= 0 &&
                  parseFloat(val) <= 1 &&
                  !isNaN(parseFloat(val)))
              ) {
                setTemperature(val);
              }
            }}
            className="w-full mt-1 p-2 border rounded text-sm"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">WebSearch Tool</label>
          <button
            type="button"
            aria-pressed={webSearch}
            onClick={() => setWebSearch((prev) => !prev)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              webSearch
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {webSearch ? "ON" : "OFF"}
          </button>
        </div>
        <div>
          <label className="text-xs font-medium">SERP API</label>
          <input
            type="password"
            value={serpApi}
            onChange={(e) => setSerpApi(e.target.value)}
            className="w-full mt-1 p-2 border rounded text-sm"
            placeholder="API Key"
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
