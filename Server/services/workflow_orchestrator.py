# services/workflow_orchestrator.py

import json
from db.supabase import get_supabase_client
from datetime import datetime
from fastapi import HTTPException
from utils.encryption import decrypt
from typing import Dict, Any
# Import your node services (ensure these are now async def functions)
from services.nodes.user_query_node import process_query as user_query_processor
from services.nodes.knowledge_base_node import process_knowledge_retrieval as knowledge_base_processor
from services.nodes.llm_engine_node import generate_response as llm_engine_processor
from services.nodes.output_node import process_output as output_processor # Ensure this is imported

class WorkflowOrchestrator:
    def __init__(self):
        self.supabase_client = get_supabase_client()
        self.node_map = {
            "userQueryNode": user_query_processor, # Use frontend type names directly for mapping
            "knowledgeBaseNode": knowledge_base_processor,
            "llmNode": llm_engine_processor,
            "outputNode": output_processor,
        }

    async def execute_workflow(self, workflow_id: str, user_query: str) -> Dict[str, Any]:
        print(f"[{datetime.now()}] Orchestrator: Starting execution for workflow ID: {workflow_id} with query: '{user_query}'")

        try:
            response = self.supabase_client.table("workflows").select("*").eq("id", workflow_id).single().execute()
            workflow_data = response.data
            if not workflow_data:
                raise HTTPException(status_code=404, detail="Workflow not found")
            print(f"[{datetime.now()}] Orchestrator: Workflow definition fetched successfully.")
        except Exception as e:
            print(f"[{datetime.now()}] Orchestrator: ERROR fetching workflow definition: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch workflow definition: {str(e)}")

        nodes_data = workflow_data["nodes"]
        edges_data = workflow_data["edges"]
        config_data = workflow_data["config"]

        decrypted_config = config_data.copy()
        for key in ["llm_api_key", "embedding_api_key", "serp_api_key"]:
            if key in decrypted_config and decrypted_config[key]:
                try:
                    decrypted_config[key] = decrypt(decrypted_config[key])
                    print(f"[{datetime.now()}] Orchestrator: Decrypted {key}. Length: {len(decrypted_config[key]) if decrypted_config[key] else 0}")
                except Exception as e:
                    print(f"[{datetime.now()}] Orchestrator: WARNING - Failed to decrypt {key}: {e}")
                    decrypted_config[key] = None

        # Build adjacency list for easier graph traversal
        adj_list = {node["id"]: [] for node in nodes_data}
        for edge in edges_data:
            if isinstance(edge, dict) and "source" in edge and "target" in edge:
                adj_list[edge["source"]].append({
                    "target": edge["target"],
                    "sourceHandle": edge.get("sourceHandle"), # Output port name
                    "targetHandle": edge.get("targetHandle")  # Input port name
                })
            else:
                print(f"[{datetime.now()}] Orchestrator: WARNING - Malformed edge found: {edge}")

        # Identify the starting node (User Query)
        start_node_id = None
        for node in nodes_data:
            if node.get("type") == "userQueryNode": # Assuming frontend always sends "userQueryNode"
                start_node_id = node["id"]
                break
        
        if not start_node_id:
            raise HTTPException(status_code=400, detail="Workflow must contain a 'User Query' node as the entry point.")

        # `current_node_inputs` will hold the inputs for the next node to be executed
        # Initialize with the user's query for the first node
        current_node_inputs: Dict[str, Any] = {"query": user_query}
        
        # Keep track of the node currently being processed
        current_node_id = start_node_id
        
        # Store outputs of all executed nodes for potential debugging or future complex routing
        all_node_outputs: Dict[str, Dict[str, Any]] = {}
        
        # Track visited nodes to prevent cycles in simple linear flows
        processed_node_ids = set()
        
        final_response_data = None

        while current_node_id:
            if current_node_id in processed_node_ids:
                print(f"[{datetime.now()}] Orchestrator: WARNING - Detected a cycle or revisiting node '{current_node_id}'. Stopping to prevent infinite loop.")
                break
            processed_node_ids.add(current_node_id)

            current_node_info = next((node for node in nodes_data if node["id"] == current_node_id), None)
            if not current_node_info:
                print(f"[{datetime.now()}] Orchestrator: ERROR - Node with ID '{current_node_id}' not found in workflow definition.")
                raise HTTPException(status_code=500, detail=f"Node '{current_node_id}' not found in workflow definition.")

            node_type = current_node_info.get("type")
            node_config = current_node_info.get("config", {})

            node_processor_func = self.node_map.get(node_type)

            if not node_processor_func:
                print(f"[{datetime.now()}] Orchestrator: ERROR - No service implemented for node type '{node_type}'.")
                raise HTTPException(status_code=501, detail=f"Node type '{node_type}' not implemented.")

            print(f"[{datetime.now()}] Orchestrator: Executing node: '{node_type}' (ID: {current_node_id}) with input keys: {current_node_inputs.keys()}")
            
            node_output = {}
            try:
                if node_type == "userQueryNode":
                    node_output = await user_query_processor(query=current_node_inputs["query"])
                    # UserQueryNode's output is just {"query": ...}, which is already in current_node_inputs
                    # No need to update current_node_inputs with this specific output, as 'query' is primary input
                    
                elif node_type == "knowledgeBaseNode":
                    if "query" not in current_node_inputs:
                        raise ValueError("KnowledgeBaseNode requires 'query' input from previous node.")
                    
                    embedding_api_key_to_use = node_config.get("apiKey") or decrypted_config.get("embedding_api_key")
                    if not embedding_api_key_to_use:
                        raise ValueError("KnowledgeBaseNode requires 'embedding_api_key' in config.")
                    
                    node_output = await knowledge_base_processor(
                        query=current_node_inputs["query"],
                        workflow_id=workflow_id,
                        embedding_api_key=embedding_api_key_to_use
                    )
                    # KnowledgeBaseNode's output is {"context": ...}
                    current_node_inputs["context"] = node_output.get("context", "") # Add context to inputs for next node

                elif node_type == "llmNode":
                    # LLM node can take 'query' and 'context' as inputs
                    if "query" not in current_node_inputs:
                        raise ValueError("LLMNode requires 'query' input.")
                    
                    llm_api_key_to_use = node_config.get("apiKey") or decrypted_config.get("llm_api_key")
                    serp_api_key_to_use = node_config.get("serpApiKey") or decrypted_config.get("serp_api_key")

                    if not llm_api_key_to_use:
                        raise ValueError("LLMNode requires 'llm_api_key' in config.")

                    model_name = node_config.get("model") or config_data.get("model", "gemini-1.5-flash")
                    temperature = float(node_config.get("temperature") or config_data.get("temperature", 0.7))
                    web_search_enabled = node_config.get("webSearchEnabled") or config_data.get("web_search_enabled", False)
                    custom_prompt = node_config.get("prompt")

                    node_output = await llm_engine_processor(
                        query=current_node_inputs["query"],
                        context=current_node_inputs.get("context"), # Pass context if available
                        custom_prompt=custom_prompt,
                        model_name=model_name,
                        llm_api_key=llm_api_key_to_use,
                        serp_api_key=serp_api_key_to_use,
                        web_search_enabled=web_search_enabled,
                        temperature=temperature
                    )
                    # LLMNode's output is {"response": ...}
                    current_node_inputs["llm_response"] = node_output.get("response", "") # Add LLM response to inputs

                elif node_type == "outputNode":
                    # CRITICAL FIX: Pass the entire current_node_inputs dictionary to output_processor
                    # This allows the output node to dynamically choose what to display.
                    node_output = await output_processor(input_data=current_node_inputs)
                    final_response_data = node_output # Capture the final output
                    print(f"[{datetime.now()}] Orchestrator: Workflow execution completed at OutputNode.")
                    return final_response_data # Return immediately if output node is reached

                else:
                    print(f"[{datetime.now()}] Orchestrator: WARNING - Unhandled node type '{node_type}'.")
                    raise HTTPException(status_code=501, detail=f"Unhandled node type: {node_type}")
                
                print(f"[{datetime.now()}] Orchestrator: Node '{node_type}' (ID: {current_node_id}) executed. Output keys: {node_output.keys() if isinstance(node_output, dict) else 'Not a dictionary'}")
                print(f"[{datetime.now()}] Orchestrator: Node '{node_type}' (ID: {current_node_id}) Output Content (first 200 chars): {str(node_output)[:200]}...")

            except ValueError as ve:
                print(f"[{datetime.now()}] Orchestrator: ERROR - Data input error for node '{node_type}' (ID: {current_node_id}): {ve}")
                raise HTTPException(status_code=400, detail=f"Workflow execution error at node '{node_type}': {ve}")
            except HTTPException:
                raise
            except Exception as e:
                print(f"[{datetime.now()}] Orchestrator: CRITICAL ERROR - Unhandled exception during node '{node_type}' (ID: {current_node_id}) execution: {e}")
                raise HTTPException(status_code=500, detail=f"Internal server error during workflow execution at node '{node_type}': {e}")

            all_node_outputs[current_node_id] = node_output # Store the output of the current node

            # Determine the next node to execute based on edges
            next_edges = adj_list.get(current_node_id, [])
            
            next_node_id = None
            if next_edges:
                primary_next_edge = next_edges[0] 
                next_node_id = primary_next_edge["target"]
                
                target_handle = primary_next_edge.get("targetHandle")
                
                # --- Dynamic Input Mapping for the NEXT node ---
                # This logic ensures the correct output from the current node
                # is mapped to the expected input of the next node based on targetHandle.
                if target_handle == "query" and "response" in node_output:
                    # If an LLM output ('response') is connected to another node's 'query' input
                    current_node_inputs["query"] = node_output["response"]
                    print(f"[{datetime.now()}] Orchestrator: Mapped previous node's 'response' to next node's 'query'.")
                elif target_handle == "context" and "context" in node_output:
                    # If a Knowledge Base output ('context') is connected to an LLM's 'context' input
                    current_node_inputs["context"] = node_output["context"]
                    print(f"[{datetime.now()}] Orchestrator: Mapped previous node's 'context' to next node's 'context'.")
                elif target_handle == "query" and "query" in node_output:
                    # If User Query output ('query') is connected to another node's 'query' input
                    current_node_inputs["query"] = node_output["query"]
                    print(f"[{datetime.now()}] Orchestrator: Mapped previous node's 'query' to next node's 'query'.")
                elif target_handle == "target":
                    # For generic 'target' handle, try to pass the most relevant output
                    if "response" in node_output: # E.g., LLM to Output
                        current_node_inputs["llm_response"] = node_output["response"]
                        print(f"[{datetime.now()}] Orchestrator: Mapped previous node's 'response' to 'llm_response' for generic target.")
                    elif "context" in node_output: # E.g., KB to Output (if no LLM)
                        current_node_inputs["context"] = node_output["context"]
                        print(f"[{datetime.now()}] Orchestrator: Mapped previous node's 'context' for generic target.")
                    elif "query" in node_output: # E.g., User Query to Output (direct)
                        current_node_inputs["query"] = node_output["query"]
                        print(f"[{datetime.now()}] Orchestrator: Mapped previous node's 'query' for generic target.")
                    else:
                        print(f"[{datetime.now()}] Orchestrator: WARNING - Unhandled generic target mapping for node type {node_type}.")
                else:
                    # Fallback for unhandled specific target handles or if output is not a dict
                    if isinstance(node_output, dict):
                        current_node_inputs.update(node_output)
                        print(f"[{datetime.now()}] Orchestrator: Merged all previous node's dict output into next node's input as fallback.")
                    else:
                        print(f"[{datetime.now()}] Orchestrator: WARNING - Unhandled output type for dynamic input mapping (not a dict).")

                print(f"[{datetime.now()}] Orchestrator: Moving to next node: '{next_node_id}'. Current inputs for next node: {current_node_inputs.keys()}")
                current_node_id = next_node_id
            else:
                print(f"[{datetime.now()}] Orchestrator: No outgoing edge from node '{current_node_id}'. Ending workflow.")
                current_node_id = None

        print(f"[{datetime.now()}] Orchestrator: Workflow finished without explicitly reaching an Output node or generating a final response.")
        return final_response_data or {"message": "Workflow completed, but no explicit final response was generated by an Output node."}

# Instantiate the orchestrator
workflow_orchestrator = WorkflowOrchestrator()
