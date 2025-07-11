import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:3000',
});

interface ChatMessage {
  message: string;
}

interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export const workflowApi = {
  // Chat with the workflow
  chat: async (message: string) => {
    const response = await api.post<ChatMessage>('/chat', { message });
    return response.data;
  },

  // Save workflow configuration
  saveWorkflow: async (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
    const response = await api.post('/workflow', { nodes, edges });
    return response.data;
  },

  // Load workflow configuration
  loadWorkflow: async () => {
    const response = await api.get('/workflow');
    return response.data;
  },
};

export default workflowApi;
