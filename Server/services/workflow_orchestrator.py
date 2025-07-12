
import json
from db.supabase import get_supabase_client
from datetime import datetime
from fastapi import HTTPException
from utils.encryption import decrypt
from typing import Dict, Any
from services.nodes.user_query_node import process_query as user_query_processor
from services.nodes.knowledge_base_node import process_knowledge_retrieval as knowledge_base_processor
from services.nodes.llm_engine_node import generate_response as llm_engine_processor
from services.nodes.output_node import process_output as output_processor

class WorkflowOrchestrator:
    def __init__(self):
        self.supabase_client = get_supabase_client()
        self.node_map = {
            "userQueryNode": user_query_processor,
            "knowledgeBaseNode": knowledge_base_processor,
            "llmNode": llm_engine_processor,
            "outputNode": output_processor,
        }

    async def execute_workflow(self, workflow_id: str, user_query: str) -> Dict[str, Any]:
        print(f"[{datetime.now()}] Starting workflow: {workflow_id}, query: '{user_query}'")

        try:
            response = self.supabase_client.table("workflows").select("*").eq("id", workflow_id).single().execute()
            workflow_data = response.data
            if not workflow_data:
                raise HTTPException(status_code=404, detail="Workflow not found")
            print(f"[{datetime.now()}] Workflow fetched.")
        except Exception as e:
            print(f"[{datetime.now()}] Error fetching workflow: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to fetch workflow: {str(e)}")

        nodes_data = workflow_data["nodes"]
        edges_data = workflow_data["edges"]
        config_data = workflow_data["config"]

        decrypted_config = config_data.copy()
        for key in ["llm_api_key", "embedding_api_key", "serp_api_key"]:
            if key in decrypted_config and decrypted_config[key]:
                try:
                    decrypted_config[key] = decrypt(decrypted_config[key])
                    print(f"[{datetime.now()}] Decrypted {key}.")
                except Exception as e:
                    print(f"[{datetime.now()}] Failed to decrypt {key}: {e}")
                    decrypted_config[key] = None

        adj_list = {node["id"]: [] for node in nodes_data}
        for edge in edges_data:
            if isinstance(edge, dict) and "source" in edge and "target" in edge:
                adj_list[edge["source"]].append({
                    "target": edge["target"],
                    "sourceHandle": edge.get("sourceHandle"),
                    "targetHandle": edge.get("targetHandle")
                })
            else:
                print(f"[{datetime.now()}] Malformed edge: {edge}")

        start_node_id = next((node["id"] for node in nodes_data if node.get("type") == "userQueryNode"), None)
        if not start_node_id:
            raise HTTPException(status_code=400, detail="Workflow requires a 'User Query' node.")

        current_node_inputs: Dict[str, Any] = {"query": user_query}
        current_node_id = start_node_id
        all_node_outputs: Dict[str, Dict[str, Any]] = {}
        processed_node_ids = set()
        final_response_data = None

        while current_node_id:
            if current_node_id in processed_node_ids:
                print(f"[{datetime.now()}] Cycle detected at node '{current_node_id}'. Stopping.")
                break
            processed_node_ids.add(current_node_id)

            current_node_info = next((node for node in nodes_data if node["id"] == current_node_id), None)
            if not current_node_info:
                print(f"[{datetime.now()}] Node '{current_node_id}' not found.")
                raise HTTPException(status_code=500, detail=f"Node '{current_node_id}' not found.")

            node_type = current_node_info.get("type")
            node_config = current_node_info.get("config", {})
            node_processor_func = self.node_map.get(node_type)

            if not node_processor_func:
                print(f"[{datetime.now()}] Node type '{node_type}' not implemented.")
                raise HTTPException(status_code=501, detail=f"Node type '{node_type}' not implemented.")

            print(f"[{datetime.now()}] Executing node '{node_type}' (ID: {current_node_id}) with inputs: {current_node_inputs.keys()}")

            node_output = {}
            try:
                if node_type == "userQueryNode":
                    node_output = await user_query_processor(query=current_node_inputs["query"])

                elif node_type == "knowledgeBaseNode":
                    if "query" not in current_node_inputs:
                        raise ValueError("KnowledgeBaseNode requires 'query' input.")
                    embedding_api_key_to_use = node_config.get("apiKey") or decrypted_config.get("embedding_api_key")
                    if not embedding_api_key_to_use:
                        raise ValueError("KnowledgeBaseNode requires 'embedding_api_key'.")
                    node_output = await knowledge_base_processor(
                        query=current_node_inputs["query"],
                        workflow_id=workflow_id,
                        embedding_api_key=embedding_api_key_to_use
                    )
                    current_node_inputs["context"] = node_output.get("context", "")

                elif node_type == "llmNode":
                    if "query" not in current_node_inputs:
                        raise ValueError("LLMNode requires 'query' input.")
                    llm_api_key_to_use = node_config.get("apiKey") or decrypted_config.get("llm_api_key")
                    serp_api_key_to_use = node_config.get("serpApiKey") or decrypted_config.get("serp_api_key")
                    if not llm_api_key_to_use:
                        raise ValueError("LLMNode requires 'llm_api_key'.")
                    model_name = node_config.get("model") or config_data.get("model", "gemini-1.5-flash")
                    temperature = float(node_config.get("temperature") or config_data.get("temperature", 0.7))
                    web_search_enabled = node_config.get("webSearchEnabled") or config_data.get("web_search_enabled", False)
                    custom_prompt = node_config.get("prompt")
                    node_output = await llm_engine_processor(
                        query=current_node_inputs["query"],
                        context=current_node_inputs.get("context"),
                        custom_prompt=custom_prompt,
                        model_name=model_name,
                        llm_api_key=llm_api_key_to_use,
                        serp_api_key=serp_api_key_to_use,
                        web_search_enabled=web_search_enabled,
                        temperature=temperature
                    )
                    current_node_inputs["llm_response"] = node_output.get("response", "")

                elif node_type == "outputNode":
                    node_output = await output_processor(input_data=current_node_inputs)
                    final_response_data = node_output
                    print(f"[{datetime.now()}] Workflow completed at OutputNode.")
                    return final_response_data

                else:
                    print(f"[{datetime.now()}] Unhandled node type '{node_type}'.")
                    raise HTTPException(status_code=501, detail=f"Unhandled node type: {node_type}")

                print(f"[{datetime.now()}] Node '{node_type}' executed. Output keys: {node_output.keys() if isinstance(node_output, dict) else 'Not a dict'}")
                print(f"[{datetime.now()}] Node output: {str(node_output)[:200]}...")

            except ValueError as ve:
                print(f"[{datetime.now()}] Data input error at node '{node_type}': {ve}")
                raise HTTPException(status_code=400, detail=f"Error at node '{node_type}': {ve}")
            except HTTPException:
                raise
            except Exception as e:
                print(f"[{datetime.now()}] Unhandled error at node '{node_type}': {e}")
                raise HTTPException(status_code=500, detail=f"Error at node '{node_type}': {e}")

            all_node_outputs[current_node_id] = node_output

            next_edges = adj_list.get(current_node_id, [])
            next_node_id = None
            if next_edges:
                primary_next_edge = next_edges[0]
                next_node_id = primary_next_edge["target"]
                target_handle = primary_next_edge.get("targetHandle")

                if target_handle == "query" and "response" in node_output:
                    current_node_inputs["query"] = node_output["response"]
                    print(f"[{datetime.now()}] Mapped 'response' to next node's 'query'.")
                elif target_handle == "context" and "context" in node_output:
                    current_node_inputs["context"] = node_output["context"]
                    print(f"[{datetime.now()}] Mapped 'context' to next node's 'context'.")
                elif target_handle == "query" and "query" in node_output:
                    current_node_inputs["query"] = node_output["query"]
                    print(f"[{datetime.now()}] Mapped 'query' to next node's 'query'.")
                elif target_handle == "target":
                    if "response" in node_output:
                        current_node_inputs["llm_response"] = node_output["response"]
                        print(f"[{datetime.now()}] Mapped 'response' to 'llm_response' for target.")
                    elif "context" in node_output:
                        current_node_inputs["context"] = node_output["context"]
                        print(f"[{datetime.now()}] Mapped 'context' for target.")
                    elif "query" in node_output:
                        current_node_inputs["query"] = node_output["query"]
                        print(f"[{datetime.now()}] Mapped 'query' for target.")
                    else:
                        print(f"[{datetime.now()}] Unhandled target mapping for node type {node_type}.")
                else:
                    if isinstance(node_output, dict):
                        current_node_inputs.update(node_output)
                        print(f"[{datetime.now()}] Merged node output into next node's input.")
                    else:
                        print(f"[{datetime.now()}] Unhandled output type for mapping.")

                print(f"[{datetime.now()}] Moving to node: '{next_node_id}'. Inputs: {current_node_inputs.keys()}")
                current_node_id = next_node_id
            else:
                print(f"[{datetime.now()}] No outgoing edge from node '{current_node_id}'. Ending.")
                current_node_id = None

        print(f"[{datetime.now()}] Workflow finished without Output node.")
        return final_response_data or {"message": "Workflow completed, no final response from Output node."}

workflow_orchestrator = WorkflowOrchestrator()