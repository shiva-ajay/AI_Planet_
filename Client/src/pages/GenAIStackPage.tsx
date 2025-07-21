import React, { useState, useEffect } from "react";
import { Plus, Edit2, X, User } from "lucide-react";
import { useWorkflowStore } from "../store/workflowStore";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
  const [loading, setLoading] = useState(true);

  const { createWorkflow, resetWorkflowBuilder, setSelectedWorkflowId } =
    useWorkflowStore();

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

  const handleCreateStack = async () => {
    if (formData.name.trim() && formData.description.trim()) {
      setLoading(true);

      // Store the current workflow count before creation
      const initialWorkflowCount = stacks.length;

      try {
        const newWorkflowId = await createWorkflow(
          formData.name,
          formData.description
        );

        if (newWorkflowId) {
          // Success case - workflow created successfully
          setFormData({ name: "", description: "" });
          setIsModalOpen(false);
          resetWorkflowBuilder();
          setSelectedWorkflowId(newWorkflowId); // Set in store
          // Navigate to the new URL format
          navigate(`/workflows/${newWorkflowId}/edit`);
          toast.success("Workflow created successfully!");
        } else {
          // createWorkflow returned null/undefined, but check if it was created anyway
          await checkIfWorkflowWasCreated(initialWorkflowCount);
        }
      } catch (err) {
        console.error("Error creating workflow:", err);

        // Check if workflow was created despite the error
        await checkIfWorkflowWasCreated(initialWorkflowCount);
      } finally {
        setLoading(false);
      }
    } else {
      toast.error("Please fill in both name and description fields.");
    }
  };

  const checkIfWorkflowWasCreated = async (initialCount: number) => {
    try {
      // Wait a bit for the database to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      const response = await axios.get<Stack[]>(`${API_BASE_URL}/list`);
      const updatedStacks = response.data;

      // Check if a new workflow was added by looking for one with matching name and description
      const newWorkflow = updatedStacks.find(
        stack => stack.name.trim() === formData.name.trim() &&
                 stack.description.trim() === formData.description.trim()
      );

      if (newWorkflow || updatedStacks.length > initialCount) {
        // Workflow was created in DB despite the error
        setStacks(updatedStacks);
        setFormData({ name: "", description: "" });
        setIsModalOpen(false);
        resetWorkflowBuilder();

        if (newWorkflow) {
          setSelectedWorkflowId(newWorkflow.id); // Set in store
          navigate(`/workflows/${newWorkflow.id}/edit`);
        } else {
          navigate("/workflow-builder"); // Fallback
        }

        toast.success("Workflow created successfully!");
      } else {
        // Workflow was not created
        toast.error("Failed to create workflow. Please try again.");
      }
    } catch (refetchError) {
      console.error("Error checking workflow creation:", refetchError);
      toast.error("Failed to verify workflow creation. Please refresh the page.");
    }
  };

  const handleEditStack = async (stackId: string) => {
    resetWorkflowBuilder();
    setSelectedWorkflowId(stackId); 
    setLoading(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/${stackId}`);
      const workflowData = response.data;

      if (workflowData.name)
        useWorkflowStore.getState().workflowName = workflowData.name;
      if (workflowData.description)
        useWorkflowStore.getState().workflowDescription =
          workflowData.description;
      if (workflowData.nodes)
        useWorkflowStore.getState().setNodes(workflowData.nodes);
      if (workflowData.edges)
        useWorkflowStore.getState().setEdges(workflowData.edges);
      if (workflowData.config)
        useWorkflowStore.getState().setWorkflowConfig(workflowData.config);

      // Navigate to the new URL format
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
                onClick={handleCreateStack}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create"}
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