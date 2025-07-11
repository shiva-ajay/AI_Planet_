// import { Node } from 'reactflow';

// export const validateWorkflow = (nodes: Node[]) => {
//   // Check if all required node types are present
//   const nodeTypes = new Set(nodes.map((node) => node.type));
//   const requiredTypes = ['userQuery', 'knowledgeBase', 'llmEngine', 'output'];
  
//   const missingTypes = requiredTypes.filter((type) => !nodeTypes.has(type));
//   if (missingTypes.length > 0) {
//     return {
//       valid: false,
//       error: `Missing required nodes: ${missingTypes.join(', ')}`,
//     };
//   }

//   // Add more validation rules here

//   return { valid: true };
// };

// export const getNodeConfig = (node: Node) => {
//   const baseConfig = {
//     userQuery: {
//       label: 'User Query',
//       fields: ['query'],
//     },
//     knowledgeBase: {
//       label: 'Knowledge Base',
//       fields: ['sources'],
//     },
//     llmEngine: {
//       label: 'LLM Engine',
//       fields: ['model', 'temperature'],
//     },
//     output: {
//       label: 'Output',
//       fields: ['output'],
//     },
//   };

//   return baseConfig[node.type as keyof typeof baseConfig] || null;
// };
