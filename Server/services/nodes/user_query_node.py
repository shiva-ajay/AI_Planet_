# services/nodes/user_query_node.py

from typing import Dict, Any

async def process_query(query: str) -> Dict[str, Any]:
    """
    Processes the user query. This node primarily serves as the entry point
    for the workflow, taking the raw user query and passing it along.
    Made async for consistency with other node processors.

    Args:
        query (str): The user's input query.

    Returns:
        Dict[str, Any]: A dictionary containing the processed query.
    """
    print(f"UserQueryNode: Processing query: '{query}'")
    return {"query": query}

