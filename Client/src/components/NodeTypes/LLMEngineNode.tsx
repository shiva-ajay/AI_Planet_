// src/NodeTypes/LLMEngineNode.tsx
import React, { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Brain, Settings } from 'lucide-react';
import type { NodeData } from '../../store/workflowStore';
import { useWorkflowStore } from '../../store/workflowStore'; // Import useWorkflowStore and NodeData

export const LLMNode: React.FC<NodeProps<NodeData>> = ({ id, selected, data }) => {
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);

  const [model, setModel] = useState(data.config?.model || 'GPT 4o - Mini');
  const [apiKey, setApiKey] = useState(data.config?.apiKey || '');
  const [temperature, setTemperature] = useState(data.config?.temperature || '0.7');
  const [webSearch, setWebSearch] = useState(data.config?.webSearchEnabled ?? true); // Default to true
  const [serpApi, setSerpApi] = useState(data.config?.serpApiKey || '');

  // Update store whenever local state changes
  useEffect(() => {
    updateNodeConfig(id, {
      model: model,
      apiKey: apiKey,
      temperature: temperature,
      webSearchEnabled: webSearch,
      serpApiKey: serpApi,
    });
  }, [model, apiKey, temperature, webSearch, serpApi, id, updateNodeConfig]);

  return (
    <div className={`bg-white rounded-lg border-2 p-4 min-w-[280px] ${selected ? 'border-blue-500' : 'border-gray-200'}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-gray-400" />
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-sm">LLM (OpenAI)</span>
        <Settings className="w-4 h-4 text-gray-400 ml-auto" />
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600">Run a query with OpenAI LLM</label>
        </div>
        <div>
          <label className="text-xs font-medium">Model</label>
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            className="w-full mt-1 p-2 border rounded text-sm"
          >
            <option value="GPT 4o - Mini">GPT 4o - Mini</option>
            {/* Add Gemini models if you want to support them */}
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
            placeholder="••••••••••••••••••••"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Prompt</label>
          <div className="mt-1 p-2 border rounded text-sm bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">CONTEXT</span>
              <span className="text-xs text-gray-600">(context)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">User Query</span>
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
              // Basic validation for temperature (0 to 1)
              if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 1 && !isNaN(parseFloat(val)))) {
                setTemperature(val);
              }
            }}
            className="w-full mt-1 p-2 border rounded text-sm"
          />
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">WebSearch Tool</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={webSearch}
              onChange={(e) => setWebSearch(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
          </label>
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
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-orange-500" />
    </div>
  );
};