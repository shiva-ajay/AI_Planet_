import React, { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Controls,
  useReactFlow,
} from "reactflow";
import type { Connection } from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowStore } from "../store/workflowStore";
import { KnowledgeBaseNode } from "../components/NodeTypes/KnowledgeBaseNode";
import { LLMNode } from "../components/NodeTypes/LLMEngineNode";
import { OutputNode } from "../components/NodeTypes/OutputNode";
import { UserQueryNode } from "../components/NodeTypes/UserQueryNode";
import { Header } from "../components/Layout/Header";
import { Sidebar } from "../components/Layout/SideBar";
import { Brain, Database, FileOutput, MessageSquare } from "lucide-react";
import { ToastContainer, toast } from "react-toastify"; // Import react-toastify
import "react-toastify/dist/ReactToastify.css"; // Import toastify styles
import Chatbot from "../components/Chat/Chatbot";

const nodeTypes = {
  knowledgeBaseNode: KnowledgeBaseNode,
  llmNode: LLMNode,
  outputNode: OutputNode,
  userQueryNode: UserQueryNode,
};

const componentTypes = [
  { type: "userQueryNode", label: "User Query", icon: MessageSquare },
  { type: "llmNode", label: "LLM (OpenAI)", icon: Brain },
  { type: "knowledgeBaseNode", label: "Knowledge Base", icon: Database },
  { type: "outputNode", label: "Output", icon: FileOutput },
];

const WorkflowBuilderPage: React.FC = () => {
  const {
    selectedWorkflowId,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    draggedType,
    setDraggedType,
    removeNode,
    removeEdge,
    loadWorkflow,
  } = useWorkflowStore();

  const { screenToFlowPosition } = useReactFlow();
  const [reactFlowNodes, setReactFlowNodes] = useNodesState(nodes);
  const [reactFlowEdges, setReactFlowEdges] = useEdgesState(edges);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false); // Chatbot auto-opens on page load

  // Load workflow when selectedWorkflowId is set
  useEffect(() => {
    const fetchWorkflow = async () => {
      if (selectedWorkflowId) {
        setIsLoading(true);
        try {
          const success = await loadWorkflow(selectedWorkflowId);
          if (!success) {
            toast.error("Failed to load workflow");
          }
        } catch (e: any) {
          toast.error(e.message || "Error loading workflow");
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchWorkflow();
  }, [selectedWorkflowId, loadWorkflow]);

  useEffect(() => {
    setReactFlowNodes(nodes);
  }, [nodes, setReactFlowNodes]);

  useEffect(() => {
    setReactFlowEdges(edges);
  }, [edges, setReactFlowEdges]);

  const handleNodesChange = useCallback(
    (changes: import("reactflow").NodeChange[]) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: import("reactflow").EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  const handleConnect = useCallback(
    (params: Connection) => {
      if (params.target && params.targetHandle) {
        onConnect({
          ...params,
          targetHandle: params.targetHandle,
        });
      }
    },
    [onConnect]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Delete") {
        const selectedNodes = reactFlowNodes.filter((node) => node.selected);
        selectedNodes.forEach((node) => {
          removeNode(node.id);
        });
        const selectedEdges = reactFlowEdges.filter((edge) => edge.selected);
        selectedEdges.forEach((edge) => {
          removeEdge(edge.id);
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [reactFlowNodes, reactFlowEdges, removeNode, removeEdge]);

  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: string) => {
      event.dataTransfer.setData("application/reactflow", nodeType);
      event.dataTransfer.effectAllowed = "move";
      setDraggedType(nodeType);
    },
    [setDraggedType]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = draggedType;
      if (type) {
        const reactFlowBounds = (
          event.target as HTMLElement
        ).getBoundingClientRect();
        const position = screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const defaultNodeData: Record<string, unknown> = {
          label: `${type} Node`,
          name: getNodeName(type),
          type: type,
          config: {},
        };
        if (type === "llmNode") {
          defaultNodeData.label = "LLM Node";
          defaultNodeData.name = "LLMEngine";
          defaultNodeData.config = {
            model: "gemini-1.5-flash",
            apiKey: "",
            temperature: "0.7",
            webSearchEnabled: true,
            serpApiKey: "",
          };
        } else if (type === "knowledgeBaseNode") {
          defaultNodeData.label = "Knowledge Base Node";
          defaultNodeData.name = "KnowledgeBase";
          defaultNodeData.config = {
            embeddingModel: "text-embedding-3-large",
            apiKey: "",
            uploadedFileName: "",
            uploadedFile: null,
          };
        } else if (type === "userQueryNode") {
          defaultNodeData.label = "User Query Node";
          defaultNodeData.name = "UserQuery";
          defaultNodeData.config = { query: "Write your query here" };
        } else if (type === "outputNode") {
          defaultNodeData.label = "Output Node";
          defaultNodeData.name = "Output";
          defaultNodeData.config = {};
        }

        const newNode = {
          id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: type,
          position,
          data: defaultNodeData,
        };

        addNode(newNode);
        setDraggedType(null);
      }
    },
    [screenToFlowPosition, draggedType, addNode, setDraggedType]
  );

  const getNodeName = (type: string): string => {
    switch (type) {
      case "userQueryNode":
        return "UserQuery";
      case "knowledgeBaseNode":
        return "KnowledgeBase";
      case "llmNode":
        return "LLMEngine";
      case "outputNode":
        return "Output";
      default:
        return type;
    }
  };

  // Run workflow and show output in OutputNode
  const handleRunWorkflow = async () => {
    if (!selectedWorkflowId) return;
    try {
      // Find the UserQuery node and get its query value
      const userQueryNode = nodes.find((node) => node.type === "userQueryNode");
      const userQuery = userQueryNode?.data?.config?.query || "";

      const response = await fetch("http://127.0.0.1:8000/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: selectedWorkflowId,
          user_query: userQuery,
        }),
      });
      const data = await response.json();
      const finalResponse =
        data?.workflow_response?.final_response || "No response.";

      // Update OutputNode config with the final response
      const outputNode = nodes.find((node) => node.type === "outputNode");
      if (outputNode) {
        // Use Zustand store action to update node config
        const updateNodeConfig = useWorkflowStore.getState().updateNodeConfig;
        updateNodeConfig(outputNode.id, {
          output: finalResponse,
        });
      }
      toast.success("Workflow executed successfully");
    } catch (e) {
      toast.error("Error running workflow");
    }
  };

  if (!selectedWorkflowId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl text-gray-700">
          No workflow selected. Please go back to My Stacks.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl text-gray-700">Loading workflow...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-grow overflow-hidden relative">
        <Sidebar componentTypes={componentTypes} onDragStart={onDragStart} />
        <div
          className="flex-grow h-full relative"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={reactFlowNodes}
            edges={reactFlowEdges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <MiniMap
              className="!absolute !top-4 !right-4 !z-20 shadow-lg rounded"
              style={{ width: 180, height: 120 }}
            />
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
          <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-10">
            <button
              onClick={handleRunWorkflow}
              className="bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 disabled:bg-blue-300 flex items-center justify-center"
              disabled={isLoading}
              title="Run Workflow"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v18l15-9-15-9z"
                />
              </svg>
            </button>
            <button
              onClick={() => setIsChatOpen(true)}
              className="bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 disabled:bg-green-300 flex items-center justify-center"
              disabled={isLoading}
              title="Open Chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      {isChatOpen && (
        <Chatbot
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          workflowId={selectedWorkflowId}
        />
      )}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default WorkflowBuilderPage;
