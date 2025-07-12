import React from "react";
import { Save } from "lucide-react";
import { useWorkflowStore } from "../../store/workflowStore";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const Header: React.FC = () => {
  const saveWorkflow = useWorkflowStore((state) => state.saveWorkflow);

  const handleSave = async () => {
    try {
      const success = await saveWorkflow();
      if (success) {
        toast.success("Workflow saved successfully!");
      } else {
        toast.error("Failed to save workflow. Please try again.");
      }
    } catch (e: any) {
      toast.error(e.message || "Error saving workflow");
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">G</span>
        </div>
        <span className="font-semibold text-lg">GenAI Stack</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">S</span>
        </div>
      </div>
    </div>
  );
};
