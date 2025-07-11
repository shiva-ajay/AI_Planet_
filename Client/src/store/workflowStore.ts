// src/store/useWorkflowStore.ts (or workflowStore.ts)
import { create } from "zustand";
import type {
  Edge,
  Node,
  OnEdgesChange,
  OnNodesChange,
  OnConnect,
} from "reactflow";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "reactflow";
import axios from "axios";
import { v4 as uuidv4 } from "uuid"; // For generating unique IDs

export interface NodeData {
  label: string;
  type: string;
  // Specific configs for each node type
  config?: {
    // Common config props
    apiKey?: string;
    // LLM Node specific
    model?: string;
    temperature?: string; // Stored as string in UI
    webSearchEnabled?: boolean;
    serpApiKey?: string;
    // Knowledge Base Node specific
    embeddingModel?: string;
    // For file uploads, we'll store temporary info or just trigger upload
    uploadedFile?: File | null;
    uploadedFileName?: string | null;
  };
  workflowId?: string; // To link nodes to a specific workflow
}

interface WorkflowState {
  selectedWorkflowId: string | null;
  nodes: Node[];
  edges: Edge[];
  workflowName: string;
  workflowDescription: string;

  setSelectedWorkflowId: (id: string | null) => void;
  // `setNodes` and `setEdges` are still useful for explicit updates
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  draggedType: string | null;
  setDraggedType: (type: string | null) => void;
  resetWorkflowBuilder: () => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node) => void;
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
  createWorkflow: (name: string, description: string) => Promise<string | null>;
  saveWorkflow: () => Promise<boolean>;
  // REMOVE THIS: updateWorkflowNameAndDescription: (name: string, description: string) => void;
}

const API_BASE_URL = "http://127.0.0.1:8000/api/workflow";

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  selectedWorkflowId: null,
  nodes: [],
  edges: [],
  workflowName: "",
  workflowDescription: "",
  draggedType: null,

  setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
  setNodes: (nodes) => set({ nodes }), // Still useful for setting just nodes
  setEdges: (edges) => set({ edges }), // Still useful for setting just edges
  setDraggedType: (type) => set({ draggedType: type }),

  resetWorkflowBuilder: () =>
    set({
      selectedWorkflowId: null,
      nodes: [],
      edges: [],
      workflowName: "",
      workflowDescription: "",
    }),

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));
  },
  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },
  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(connection, state.edges),
    }));
  },
  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
    }));
  },
  updateNodeConfig: (nodeId, config) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, config } } : node
      ),
    }));
  },
  // REMOVE THIS ACTION:
  // updateWorkflowNameAndDescription: (name, description) => {
  //   set({ workflowName: name, workflowDescription: description });
  // },

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
        // When creating, the Zustand state is updated here.
        // The `setNodes([])` and `setEdges([])` are still good as they explicitly confirm empty.
        set({
          selectedWorkflowId: newId,
          workflowName: name,
          workflowDescription: description,
          nodes: [],
          edges: [],
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

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/update/${state.selectedWorkflowId}`,
        {
          name: state.workflowName, // This comes directly from Zustand's `workflowName`
          description: state.workflowDescription, // This comes directly from Zustand's `workflowDescription`
          nodes: JSON.stringify(state.nodes),
          edges: JSON.stringify(state.edges),
          config: JSON.stringify({}),
        }
      );
      return response.status === 200;
    } catch (error) {
      console.error("Error saving workflow:", error);
      return false;
    }
  },
}));
