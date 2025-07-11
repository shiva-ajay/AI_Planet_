# services/nodes/output_node.py

from typing import Dict, Any

async def process_output(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Processes the final output for display. This node is typically the last in the workflow.
    It can now dynamically accept various inputs and prioritize what to display.

    Args:
        input_data (Dict[str, Any]): A dictionary containing data from previous nodes.
                                     Expected keys might include 'llm_response', 'context', 'query'.

    Returns:
        Dict[str, Any]: A dictionary containing the final response for the frontend display.
    """
    print(f"OutputNode: Finalizing response with input keys: {input_data.keys()}")

    final_response_text = ""

    # Prioritize LLM response, then knowledge base context, then original query
    if "llm_response" in input_data and input_data["llm_response"]:
        final_response_text = input_data["llm_response"]
        print("OutputNode: Using 'llm_response' as final output.")
    elif "context" in input_data and input_data["context"]:
        final_response_text = "Knowledge Base Context:\n" + input_data["context"]
        print("OutputNode: Using 'context' as final output.")
    elif "query" in input_data and input_data["query"]:
        final_response_text = "Original Query:\n" + input_data["query"]
        print("OutputNode: Using 'query' as final output.")
    else:
        final_response_text = "No relevant output found from previous nodes."
        print("OutputNode: No relevant data found in input_data.")

    print(f"OutputNode: Final output content (first 200 chars): '{final_response_text[:200]}...'")
    return {"final_response": final_response_text}

