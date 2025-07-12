import React, { useState, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Database, Upload, Settings, Trash2 } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore";

export type NodeData = {
  label: string;
  name: string;
  type: string;
  config?: {
    embeddingModel?: string;
    apiKey?: string;
    uploadedFileName?: string;
    uploadedFile?: File | null;
  };
};

export const KnowledgeBaseNode: React.FC<NodeProps<NodeData>> = ({
  id,
  selected,
  data,
}) => {
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);

  const [embedding, setEmbedding] = useState(
    data.config?.embeddingModel || "text-embedding-3-large"
  );
  const [apiKey, setApiKey] = useState(data.config?.apiKey || "");
  const [uploadedFileName, setUploadedFileName] = useState(
    data.config?.uploadedFileName || ""
  );

  useEffect(() => {
    updateNodeConfig(id, {
      embeddingModel: embedding,
      apiKey: apiKey,
      uploadedFileName: uploadedFileName,
      name: data.name || "KnowledgeBase", // Ensure name is set
    });
  }, [embedding, apiKey, uploadedFileName, id, updateNodeConfig, data.name]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setUploadedFileName(file.name);
        updateNodeConfig(id, {
          uploadedFile: file,
          uploadedFileName: file.name,
          name: "KnowledgeBase",
        });
      }
    },
    [id, updateNodeConfig]
  );

  const handleDeleteFile = useCallback(() => {
    setUploadedFileName("");
    updateNodeConfig(id, {
      uploadedFile: null,
      uploadedFileName: "",
      name: "KnowledgeBase",
    });
  }, [id, updateNodeConfig]);

  return (
    <div
      className={`bg-white rounded-lg border-2 p-4 min-w-[280px] ${
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
        <Database className="w-4 h-4 text-gray-600" />
        <span className="font-medium text-sm">Knowledge Base</span>
        <Settings className="w-4 h-4 text-gray-400 ml-auto" />
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-600">
            Let LLM search info in your file
          </label>
        </div>
        <div>
          <label className="text-xs font-medium">File for Knowledge Base</label>
          {uploadedFileName ? (
            // Show uploaded file with delete option
            <div className="mt-1 p-3 border-2 border-dashed border-green-300 rounded bg-green-50 flex items-center justify-between">
              <span className="text-sm text-green-700 font-medium">
                {uploadedFileName}
              </span>
              <button
                onClick={handleDeleteFile}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Delete file"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ) : (
            // Show upload area
            <div className="mt-1 p-3 border-2 border-dashed border-gray-300 rounded text-center cursor-pointer relative hover:border-gray-400 transition-colors">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                accept=".pdf,.txt,.docx"
              />
              <Upload className="w-4 h-4 mx-auto text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Upload File</span>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-medium">Embedding Model</label>
          <select
            value={embedding}
            onChange={(e) => setEmbedding(e.target.value)}
            className="w-full mt-1 p-2 border rounded text-sm"
          >
            <option value="text-embedding-3-large">
              text-embedding-3-large
            </option>
            <option value="models/text-embedding-004">
              Gemini (text-embedding-004)
            </option>
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
