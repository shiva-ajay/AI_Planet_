import { create } from "zustand";
import type {
  Edge,
  Node,
  OnEdgesChange,
  OnNodesChange,
  OnConnect,
  Connection, // Import Connection type
} from "reactflow";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "reactflow";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

export interface NodeData {
  label: string;
  name: string;
  type: string;
  config?: {
    apiKey?: string;
    model?: string;
    temperature?: string;
    webSearchEnabled?: boolean;
    serpApiKey?: string;
    embeddingModel?: string;
    uploadedFile?: File | null;
    uploadedFileName?: string | null;
    query?: string;
  };
  workflowId?: string;
}

interface WorkflowOverallConfig {
  llm_api_key?: string;
  embedding_api_key?: string;
  serp_api_key?: string;
  web_search_enabled?: boolean;
  temperature?: number;
  model?: string;
  prompt?: string;
}

interface WorkflowState {
  selectedWorkflowId: string | null;
  nodes: Node<NodeData>[];
  edges: Edge[];
  workflowName: string;
  workflowDescription: string;
  workflowConfig: WorkflowOverallConfig;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  setSelectedWorkflowId: (id: string | null) => void;
  setNodes: (nodes: Node<NodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  draggedType: string | null;
  setDraggedType: (type: string | null) => void;
  resetWorkflowBuilder: () => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node<NodeData>) => void;
  updateNodeConfig: (
    nodeId: string,
    config: Partial<NodeData["config"]>
  ) => void;
  createWorkflow: (name: string, description: string) => Promise<string | null>;
  saveWorkflow: () => Promise<boolean>;
  loadWorkflow: (workflowId: string) => Promise<boolean>;
  setWorkflowConfig: (config: WorkflowOverallConfig) => void;
}

const API_BASE_URL = "http://127.0.0.1:8000/api/workflow";

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  selectedWorkflowId: null,
  nodes: [],
  edges: [],
  workflowName: "",
  workflowDescription: "",
  workflowConfig: {},
  draggedType: null,

  setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setDraggedType: (type) => set({ draggedType: type }),
  setWorkflowConfig: (config) => set({ workflowConfig: config }),

  resetWorkflowBuilder: () =>
    set({
      selectedWorkflowId: null,
      nodes: [],
      edges: [],
      workflowName: "",
      workflowDescription: "",
      workflowConfig: {},
    }),

  removeNode: (nodeId: string) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    })),

  removeEdge: (edgeId: string) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
    })),

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as Node<NodeData>[],
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  onConnect: (connection) => {
    set((state) => {
      const edgeName = determineEdgeName(connection, state.nodes);
      const newEdge = {
        id: `e${connection.source}-${connection.target}-${
          connection.targetHandle || "default"
        }-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle || null,
        targetHandle: connection.targetHandle || null,
        data: { name: edgeName },
      };
      return {
        edges: addEdge(newEdge, state.edges),
      };
    });
  },

  addNode: (node) => {
    set((state) => {
      const nodeWithName = {
        ...node,
        data: {
          ...node.data,
          name: getNodeName(node.data.type),
        },
      };
      return {
        nodes: [...state.nodes, nodeWithName],
      };
    });
  },

  updateNodeConfig: (nodeId, newConfig) => {
    set((state) => {
      const updatedNodes = state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                config: { ...node.data.config, ...newConfig },
              },
            }
          : node
      );

      const currentWorkflowConfig = { ...state.workflowConfig };
      const nodeBeingUpdated = updatedNodes.find((n) => n.id === nodeId);

      if (nodeBeingUpdated) {
        if (
          nodeBeingUpdated.data.type === "llmNode" &&
          nodeBeingUpdated.data.config
        ) {
          currentWorkflowConfig.llm_api_key =
            nodeBeingUpdated.data.config.apiKey;
          currentWorkflowConfig.model = nodeBeingUpdated.data.config.model;
          currentWorkflowConfig.temperature = parseFloat(
            nodeBeingUpdated.data.config.temperature || "0.7"
          );
          currentWorkflowConfig.web_search_enabled =
            nodeBeingUpdated.data.config.webSearchEnabled;
          currentWorkflowConfig.serp_api_key =
            nodeBeingUpdated.data.config.serpApiKey;
        } else if (
          nodeBeingUpdated.data.type === "knowledgeBaseNode" &&
          nodeBeingUpdated.data.config
        ) {
          currentWorkflowConfig.embedding_api_key =
            nodeBeingUpdated.data.config.apiKey;
        }
      }

      return {
        nodes: updatedNodes,
        workflowConfig: currentWorkflowConfig,
      };
    });
  },

  createWorkflow: async (name, description) => {
    const newId = uuidv4();
    try {
      const response = await axios.post(`${API_BASE_URL}/create`, {
        id: newId,
        name: name,
        description: description,
        nodes: "[]",
        edges: "[]",
        config: "{}",
      });
      if (response.status === 201) {
        set({
          selectedWorkflowId: newId,
          workflowName: name,
          workflowDescription: description,
          nodes: [],
          edges: [],
          workflowConfig: {},
        });
        return newId;
      }
      return null;
    } catch (error) {
      console.error("Error creating workflow:", error);
      return null;
    }
  },

  saveWorkflow: async () => {
    const state = get();
    if (!state.selectedWorkflowId) {
      console.error("No workflow selected to save.");
      return false;
    }

    // Format nodes with names
    const formattedNodes = state.nodes.map((node) => ({
      id: node.id,
      name: node.data.name || getNodeName(node.data.type),
      type: node.data.type,
      position: node.position,
      config: {
        ...node.data.config,
        uploadedFile: undefined, // Exclude file from JSON
      },
    }));

    // Format edges
    const formattedEdges = state.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      data: edge.data, // assuming edge.data already has the name
    }));

    // Prepare FormData
    const formData = new FormData();
    formData.append("name", state.workflowName);
    formData.append("description", state.workflowDescription);
    formData.append("nodes", JSON.stringify(formattedNodes));
    formData.append("edges", JSON.stringify(formattedEdges));
    formData.append("config", JSON.stringify(state.workflowConfig));

    // Handle file upload from KnowledgeBaseNode
    let fileToUpload: File | null = null;
    let documentName: string | null = null;

    for (const node of state.nodes) {
      if (
        node.data.type === "knowledgeBaseNode" &&
        node.data.config?.uploadedFile
      ) {
        fileToUpload = node.data.config.uploadedFile as File;
        documentName =
          (node.data.config.uploadedFileName as string) || fileToUpload.name;
        break;
      }
    }

    if (fileToUpload) {
      formData.append(
        "document_file",
        fileToUpload,
        documentName || fileToUpload.name
      );
      if (documentName) {
        formData.append("document_name", documentName);
      }
    }

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/update/${state.selectedWorkflowId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.status === 200;
    } catch (error: any) {
      console.error(
        "Error saving workflow:",
        error.response ? error.response.data : error.message
      );
      alert(
        `Error saving workflow: ${
          error.response?.data?.detail || error.message
        }`
      );
      return false;
    }
  },

  loadWorkflow: async (workflowId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${workflowId}`);
      console.log("Raw backend response:", response.data); // Log raw response for debugging
      if (response.status === 200) {
        const { name, description, nodes, edges, config } = response.data;

        // Parse nodes (handle string, array, and null cases)
        let parsedNodes: any[] = [];
        if (typeof nodes === "string" && nodes !== "null") {
          try {
            parsedNodes = JSON.parse(nodes);
          } catch (e) {
            console.error("Error parsing nodes:", e);
            return false;
          }
        } else if (Array.isArray(nodes)) {
          parsedNodes = nodes;
        } else if (nodes === null) {
          parsedNodes = []; // Treat null as an empty array
        } else {
          console.error("Nodes is neither a string, array, nor null:", nodes);
          return false;
        }

        const formattedNodes = parsedNodes.map((node: any) => ({
          id: node.id,
          type: node.type,
          position: node.position || { x: 0, y: 0 }, // Fallback position
          data: {
            label: node.name || getNodeName(node.type),
            name: node.name || getNodeName(node.type),
            type: node.type,
            config: {
              ...node.config,
              uploadedFile: null, // Files are not included in JSON
            },
            workflowId: workflowId,
          },
        }));

        // Parse edges (handle string, array, and null cases)
        let parsedEdges: any[] = [];
        if (typeof edges === "string" && edges !== "null") {
          try {
            parsedEdges = JSON.parse(edges);
          } catch (e) {
            console.error("Error parsing edges:", e);
            return false;
          }
        } else if (Array.isArray(edges)) {
          parsedEdges = edges;
        } else if (edges === null) {
          parsedEdges = []; // Treat null as an empty array
        } else {
          console.error("Edges is neither a string, array, nor null:", edges);
          return false;
        }

        const formattedEdges = parsedEdges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          sourceHandle: edge.sourceHandle || null,
          target: edge.target,
          targetHandle: edge.targetHandle || null,
          data: { name: edge.data?.name || "Unknown" }, // Access data.name
        }));

        // Parse config (handle string, object, and null cases)
        let parsedConfig: WorkflowOverallConfig = {};
        if (typeof config === "string" && config !== "null") {
          try {
            parsedConfig = JSON.parse(config);
          } catch (e) {
            console.error("Error parsing config:", e);
            return false;
          }
        } else if (typeof config === "object" && config !== null) {
          parsedConfig = config;
        } else if (config === null) {
          parsedConfig = {}; // Treat null as an empty object
        } else {
          console.error(
            "Config is neither a string, object, nor null:",
            config
          );
          return false;
        }

        set({
          selectedWorkflowId: workflowId,
          workflowName: name || "",
          workflowDescription: description || "",
          nodes: formattedNodes,
          edges: formattedEdges,
          workflowConfig: parsedConfig,
        });
        return true;
      }
      return false;
    } catch (error: any) {
      console.error(
        "Error loading workflow:",
        error.response ? error.response.data : error.message
      );
      alert(
        `Error loading workflow: ${
          error.response?.data?.detail || error.message
        }`
      );
      return false;
    }
  },
}));

// Helper function to assign predefined node names
function getNodeName(type: string): string {
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
}

// Helper function to determine edge name based on connection points
function determineEdgeName(
  connection: Connection,
  nodes: Node<NodeData>[]
): string {
  const { source, target, sourceHandle, targetHandle } = connection;
  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);

  if (!sourceNode || !targetNode) return "Unknown";

  // UserQueryNode output
  if (sourceNode.data.type === "userQueryNode" && sourceHandle === "source") {
    return "Query";
  }
  // KnowledgeBaseNode input/output
  if (
    targetNode.data.type === "knowledgeBaseNode" &&
    targetHandle === "target"
  ) {
    return "Query Intake";
  }
  if (
    sourceNode.data.type === "knowledgeBaseNode" &&
    sourceHandle === "source"
  ) {
    return "Context";
  }
  // LLMNode inputs/output
  if (targetNode.data.type === "llmNode" && targetHandle === "context") {
    return "Context";
  }
  if (targetNode.data.type === "llmNode" && targetHandle === "query") {
    return "Query";
  }
  if (sourceNode.data.type === "llmNode" && sourceHandle === "source") {
    return "Answer";
  }
  // OutputNode input
  if (targetNode.data.type === "outputNode" && targetHandle === "target") {
    return "Answer";
  }

  return "Unknown";
}
