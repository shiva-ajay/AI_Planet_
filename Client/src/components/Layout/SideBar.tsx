import React from "react";
import { MessageSquare } from "lucide-react";

interface SidebarProps {
  componentTypes: { type: string; label: string; icon: React.ElementType }[];
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  componentTypes,
  onDragStart,
}) => (
  <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-gray-600" />
        <span className="font-medium">Chat With AI</span>
      </div>
    </div>

    <div className="p-4">
      <h3 className="font-medium text-sm text-gray-700 mb-3">Components</h3>
      <div className="space-y-2">
        {componentTypes.map((component) => (
          <div
            key={component.type}
            draggable
            onDragStart={(e) => onDragStart(e, component.type)}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-move hover:bg-gray-100 transition-colors"
          >
            <component.icon className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-700">{component.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);
