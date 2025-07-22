import React, { useState, useEffect } from "react";
import { Plus, Edit2, X, User } from "lucide-react";
import { useWorkflowStore } from "../store/workflowStore";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { v4 as uuidv4 } from "uuid"; // Import uuid for temporary ID generation

interface Stack {
  id: string;
  name: string;
  description: string;
}

const API_BASE_URL = "http://127.0.0.1:8000/api/workflow";

const GenAIStackPage: React.FC = () => {
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true); // For initial fetch, not for optimistic creation button

  const {
    resetWorkflowBuilder,
    setSelectedWorkflowId,
    setWorkflowName, // Now available from store
    setWorkflowDescription, // Now available from store
  } = useWorkflowStore();

  const navigate = useNavigate();

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const response = await axios.get<Stack[]>(`${API_BASE_URL}/list`);
      setStacks(response.data);
    } catch (err) {
      console.error("Error fetching workflows:", err);
      toast.error("Failed to load workflows. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStackOptimistic = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error("Please fill in both name and description fields.");
      return;
    }

    // 1. Generate a temporary ID (client-side)
    const tempWorkflowId = uuidv4();
    const newWorkflowName = formData.name.trim();
    const newWorkflowDescription = formData.description.trim();

    // Optimistically update UI states
    setFormData({ name: "", description: "" }); // Clear modal form
    setIsModalOpen(false); // Close modal
    resetWorkflowBuilder(); // Clear any previous builder state

    // 2. Update the local store with the new, temporary workflow details
    setSelectedWorkflowId(tempWorkflowId);
    setWorkflowName(newWorkflowName);
    setWorkflowDescription(newWorkflowDescription);

    // 3. Optimistically add the new workflow to the local 'stacks' list for immediate display
    setStacks((prevStacks) => [
      ...prevStacks,
      {
        id: tempWorkflowId,
        name: newWorkflowName,
        description: newWorkflowDescription,
      },
    ]);

    // 4. Navigate immediately to the workflow builder page
    navigate(`/workflows/${tempWorkflowId}/edit`);
    toast.info("Creating workflow in the background..."); // Inform user

    try {
      // 5. Initiate the API call to create the workflow on the backend
      const response = await axios.post(`${API_BASE_URL}/create`, {
        id: tempWorkflowId, // Send the temporary ID to the backend
        name: newWorkflowName,
        description: newWorkflowDescription,
        nodes: "[]", 
        edges: "[]", 
        config: "{}",
      });

      const actualWorkflowId = response.data.id; 

      
      setStacks((prevStacks) =>
        prevStacks.map((stack) =>
          stack.id === tempWorkflowId
            ? { ...stack, id: actualWorkflowId }
            : stack
        )
      );

      setSelectedWorkflowId(actualWorkflowId);

      toast.success("Workflow created and synchronized!");
    } catch (err) {
      console.error("Error creating workflow in background:", err);
      toast.error(
        "Failed to create workflow on server. Please refresh or try again."
      );

      setStacks((prevStacks) => prevStacks.filter(stack => stack.id !== tempWorkflowId));

    }
  };

  const handleEditStack = async (stackId: string) => {
    resetWorkflowBuilder();
    setSelectedWorkflowId(stackId);
    setLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/${stackId}`);
      const workflowData = response.data;

      // Set workflow name and description in the store
      useWorkflowStore.getState().setWorkflowName(workflowData.name || "");
      useWorkflowStore.getState().setWorkflowDescription(workflowData.description || "");

      // Ensure nodes, edges, and config are parsed correctly if they come as strings
      const parsedNodes = typeof workflowData.nodes === 'string' && workflowData.nodes !== 'null' ? JSON.parse(workflowData.nodes) : (workflowData.nodes || []);
      const parsedEdges = typeof workflowData.edges === 'string' && workflowData.edges !== 'null' ? JSON.parse(workflowData.edges) : (workflowData.edges || []);
      const parsedConfig = typeof workflowData.config === 'string' && workflowData.config !== 'null' ? JSON.parse(workflowData.config) : (workflowData.config || {});


      useWorkflowStore.getState().setNodes(parsedNodes);
      useWorkflowStore.getState().setEdges(parsedEdges);
      useWorkflowStore.getState().setWorkflowConfig(parsedConfig);

      navigate(`/workflows/${stackId}/edit`);
    } catch (err) {
      console.error(`Error fetching workflow with ID ${stackId}:`, err);
      toast.error("Failed to load workflow. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", description: "" });
    setIsModalOpen(false);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                GenAI Stack
              </h1>
            </div>
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <User className="text-white" size={16} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">My Stacks</h2>
          {stacks.length > 0 && (
            <button
              onClick={openModal}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus size={16} />
              <span>New Stack</span>
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-gray-600 text-lg">Loading workflows...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && stacks.length === 0 && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Create New Stack
              </h3>
              <p className="text-gray-600 mb-8 max-w-md">
                Start building your generative AI apps with our essential tools
                and frameworks
              </p>
              <button
                onClick={openModal}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors mx-auto"
              >
                <Plus size={16} />
                <span>New Stack</span>
              </button>
            </div>
          </div>
        )}

        {/* Stack Cards - 4 per row grid */}
        {!loading && stacks.length > 0 && (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {stacks.map((stack) => (
              <div
                key={stack.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">
                    {stack.name}
                  </h3>
                  <button
                    onClick={() => handleEditStack(stack.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {stack.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Stack
              </h3>
              <button
                onClick={handleCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Chat With PDF"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Chat with your pdf docs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStackOptimistic}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
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

export default GenAIStackPage;
