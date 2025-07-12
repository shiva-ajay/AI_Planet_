
from typing import Dict, Any

async def process_output(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Processes the final output for display, prioritizing available inputs.

    Args:
        input_data (Dict[str, Any]): A dictionary containing data from previous nodes.

    Returns:
        Dict[str, Any]: A dictionary containing the final response for the frontend display.
    """
    print(f"Finalizing response with keys: {input_data.keys()}")

    final_response_text = ""

    if "llm_response" in input_data and input_data["llm_response"]:
        final_response_text = input_data["llm_response"]
        print("Using 'llm_response' as output.")
    elif "context" in input_data and input_data["context"]:
        final_response_text = "Knowledge Base Context:\n" + input_data["context"]
        print("Using 'context' as output.")
    elif "query" in input_data and input_data["query"]:
        final_response_text = "Original Query:\n" + input_data["query"]
        print("Using 'query' as output.")
    else:
        final_response_text = "No relevant output found."
        print("No relevant data found.")

    print(f"Final output: '{final_response_text[:200]}...'")
    return {"final_response": final_response_text}