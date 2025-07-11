// src/hooks/useWorkflow.ts
import { useCallback, useState } from 'react';
import {
  type Node,
  type ReactFlowInstance,
} from 'reactflow';
import { useWorkflowStore } from '../store/workflowStore'; // Import from Zustand store
import type { NodeData } from '../store/workflowStore';

export const useWorkflow = () => {
  // Get all relevant state and actions from the Zustand store
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    draggedType,
    setDraggedType,
    setNodes, // We'll need these setters to initialize nodes on drop
  } = useWorkflowStore();

  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const onDragStart = useCallback((event: React.DragEvent, nodeType: string) => {
    setDraggedType(nodeType);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, [setDraggedType]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!draggedType || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      if (!position) {
        console.error("Could not determine drop position.");
        return;
      }

      const newNode: Node<NodeData> = { // Specify NodeData type
        id: `${draggedType}-${Date.now()}`,
        type: draggedType,
        position,
        data: { 
          label: draggedType, 
          type: draggedType,
          config: {}, // Initialize an empty config object for the node
        },
      };

      setNodes([
        ...nodes,
        newNode,
      ]);
      setTimeout(() => reactFlowInstance?.fitView({ nodes: [...nodes, newNode], duration: 500 }), 0);
      setDraggedType(null);
    },
    [draggedType, reactFlowInstance, setNodes, setDraggedType]
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDragOver,
    onDrop,
    onDragStart,
    reactFlowInstance,
    setReactFlowInstance,
  };
};