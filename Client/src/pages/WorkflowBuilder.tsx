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
import { useWorkflowStore, type NodeData } from "../store/workflowStore";
import { KnowledgeBaseNode } from "../components/NodeTypes/KnowledgeBaseNode";
import { LLMNode } from "../components/NodeTypes/LLMEngineNode";
import { OutputNode } from "../components/NodeTypes/OutputNode";
import { UserQueryNode } from "../components/NodeTypes/UserQueryNode";
import { Header } from "../components/Layout/Header";
import { Sidebar } from "../components/Layout/SideBar";
import { Brain, Database, FileOutput, MessageSquare } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Chatbot from "../components/Chat/Chatbot";
import { useParams } from "react-router-dom";

// Define a simple ErrorBoundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error in component:", error, errorInfo);
    this.setState({ errorInfo: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 bg-red-50 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong.</h2>
          <p className="text-red-600 text-center mb-4">
            We're sorry for the inconvenience. Please try refreshing the page.
          </p>
          {this.state.error && (
            <details className="text-sm text-red-500 bg-red-100 p-3 rounded-md overflow-auto max-h-40 w-full">
              <summary>Error Details</summary>
              <pre className="whitespace-pre-wrap break-words">
                {this.state.error.toString()}
                <br />
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const { workflowId } = useParams<{ workflowId: string }>();

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
    setSelectedWorkflowId,
    workflowName,
    workflowDescription,
  } = useWorkflowStore();

  const { screenToFlowPosition } = useReactFlow();
  const [reactFlowNodes, setReactFlowNodes] = useNodesState(nodes);
  const [reactFlowEdges, setReactFlowEdges] = useEdgesState(edges);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (workflowId && workflowId !== selectedWorkflowId) {
      setSelectedWorkflowId(workflowId);
    }
  }, [workflowId, selectedWorkflowId, setSelectedWorkflowId]);

  useEffect(() => {
    const fetchWorkflow = async () => {
      if (workflowId) {
        if (workflowId.startsWith('temp_') && nodes.length > 0) {
          setIsLoading(false);
          return;
        }

        if (selectedWorkflowId === workflowId && nodes.length > 0) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        try {
          const success = await loadWorkflow(workflowId);
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
  }, [workflowId, selectedWorkflowId, loadWorkflow, nodes.length]);

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

        // Initialize config as an empty object first, then merge specific properties
        const defaultNodeData: NodeData = {
          label: `${type} Node`,
          name: getNodeName(type),
          type: type,
          config: {}, // Always initialize config as an empty object
          workflowId: workflowId,
        };

        if (type === "llmNode") {
          defaultNodeData.label = "LLM Node";
          defaultNodeData.name = "LLMEngine";
          defaultNodeData.config = { // Merge specific config properties
            ...defaultNodeData.config,
            model: "gemini-1.5-flash",
            apiKey: "",
            temperature: "0.7",
            webSearchEnabled: true,
            serpApiKey: "",
          };
        } else if (type === "knowledgeBaseNode") {
          defaultNodeData.label = "Knowledge Base Node";
          defaultNodeData.name = "KnowledgeBase";
          defaultNodeData.config = { // Merge specific config properties
            ...defaultNodeData.config,
            embeddingModel: "text-embedding-3-large",
            apiKey: "",
            uploadedFileName: "",
            uploadedFile: null,
          };
        } else if (type === "userQueryNode") {
          defaultNodeData.label = "User Query Node";
          defaultNodeData.name = "UserQuery";
          defaultNodeData.config = { // Merge specific config properties
            ...defaultNodeData.config,
            query: "Write your query here"
          };
        } else if (type === "outputNode") {
          defaultNodeData.label = "Output Node";
          defaultNodeData.name = "Output";
          defaultNodeData.config = { // Merge specific config properties
            ...defaultNodeData.config,
            output: "Workflow output will appear here."
          };
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
    [screenToFlowPosition, draggedType, addNode, setDraggedType, workflowId]
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

  const handleRunWorkflow = async () => {
    if (!workflowId) {
      toast.error("No workflow ID found in URL to run.");
      return;
    }

    try {
      const userQueryNode = nodes.find((node) => node.type === "userQueryNode");
      const userQuery = userQueryNode?.data?.config?.query || "";

      const userId = "anonymous_user_" + Math.random().toString(36).substr(2, 9);

      const response = await fetch("http://127.0.0.1:8000/api/run/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow_id: workflowId,
          user_query: userQuery,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to execute workflow");
      }

      const data = await response.json();
      const finalResponse =
        data?.workflow_response?.final_response || "No response.";

      const outputNode = nodes.find((node) => node.type === "outputNode");
      if (outputNode) {
        const updateNodeConfig = useWorkflowStore.getState().updateNodeConfig;
        updateNodeConfig(outputNode.id, {
          output: finalResponse,
        });
      }
      toast.success("Workflow executed successfully");
    } catch (e: any) {
      console.error("Error running workflow:", e);
      toast.error(e.message || "Error running workflow");
    }
  };

  if (!workflowId) {
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
      <Header workflowName={workflowName} workflowDescription={workflowDescription} />
      <div className="flex flex-grow overflow-hidden relative">
        <Sidebar componentTypes={componentTypes} onDragStart={onDragStart} />
        <div
          className="flex-grow h-full relative"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ErrorBoundary>
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
          </ErrorBoundary>
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
          workflowId={selectedWorkflowId || workflowId}
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
