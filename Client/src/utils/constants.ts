// import { Node, Edge } from 'reactflow';

// export const NODE_TYPES = {
//   USER_QUERY: 'userQuery',
//   KNOWLEDGE_BASE: 'knowledgeBase',
//   LLM_ENGINE: 'llmEngine',
//   OUTPUT: 'output',
// } as const;

// export const INITIAL_NODES: Node[] = [
//   {
//     id: 'query-1',
//     type: NODE_TYPES.USER_QUERY,
//     position: { x: 250, y: 0 },
//     data: { query: '' },
//   },
//   {
//     id: 'kb-1',
//     type: NODE_TYPES.KNOWLEDGE_BASE,
//     position: { x: 250, y: 100 },
//     data: { sources: [] },
//   },
//   {
//     id: 'llm-1',
//     type: NODE_TYPES.LLM_ENGINE,
//     position: { x: 250, y: 200 },
//     data: { model: '', temperature: 0.7 },
//   },
//   {
//     id: 'output-1',
//     type: NODE_TYPES.OUTPUT,
//     position: { x: 250, y: 300 },
//     data: { output: '' },
//   },
// ];

// export const INITIAL_EDGES: Edge[] = [
//   {
//     id: 'edge-1',
//     source: 'query-1',
//     target: 'kb-1',
//   },
//   {
//     id: 'edge-2',
//     source: 'kb-1',
//     target: 'llm-1',
//   },
//   {
//     id: 'edge-3',
//     source: 'llm-1',
//     target: 'output-1',
//   },
// ];
