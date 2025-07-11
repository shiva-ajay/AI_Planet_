# services/nodes/llm_engine_node.py

from typing import Optional, Dict, Any
import requests
import json
import google.generativeai as genai
from utils.gemini_client import get_gemini_model
from fastapi import HTTPException

async def perform_serp_search(query: str, serp_api_key: str, num_results: int = 3) -> str:
    """
    Performs a web search using SerpAPI and returns concatenated snippets.
    Made async.
    """
    if not serp_api_key:
        print("SerpAPI: No API key provided for web search.")
        return ""

    url = "https://serpapi.com/search"
    params = {
        "api_key": serp_api_key,
        "q": query,
        "num": num_results,
        "engine": "google",
        "output": "json"
    }
    print(f"SerpAPI: Initiating search for query: '{query}'")
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        search_results = response.json()

        snippets = []
        if "organic_results" in search_results:
            for result in search_results["organic_results"]:
                if "snippet" in result:
                    snippets.append(result["snippet"])
        
        if snippets:
            print(f"SerpAPI: Found {len(snippets)} snippets.")
            return "\n\n".join(snippets)
        else:
            print("SerpAPI: No organic results or snippets found.")
            return ""
    except requests.exceptions.RequestException as e:
        print(f"SerpAPI Error: Failed to perform web search: {e}")
        raise HTTPException(status_code=500, detail=f"SerpAPI web search failed: {str(e)}")
    except json.JSONDecodeError as e:
        print(f"SerpAPI Error: Failed to parse JSON response: {e}")
        raise HTTPException(status_code=500, detail=f"SerpAPI response parsing failed: {str(e)}")
    except Exception as e:
        print(f"SerpAPI Error: An unexpected error occurred during web search: {e}")
        raise HTTPException(status_code=500, detail=f"SerpAPI encountered an unexpected error: {str(e)}")


async def generate_response(
    query: str,
    context: Optional[str],
    custom_prompt: Optional[str],
    model_name: str,
    llm_api_key: str,
    serp_api_key: Optional[str],
    web_search_enabled: bool,
    temperature: float
) -> Dict[str, Any]:
    """
    Generates a response using the Gemini LLM, optionally incorporating web search results.
    Made async.
    """
    print(f"LLMEngineNode: Generating response for query: '{query}' with model '{model_name}')")
    full_prompt_parts = []
    web_search_context = ""

    if web_search_enabled and serp_api_key:
        print("LLMEngineNode: Web search enabled. Performing search...")
        web_search_context = await perform_serp_search(query=query, serp_api_key=serp_api_key)
        if web_search_context:
            full_prompt_parts.append(f"Web Search Results:\n{web_search_context}\n\n")
            print("LLMEngineNode: Web search results incorporated.")
        else:
            print("LLMEngineNode: No useful web search results found.")
    elif web_search_enabled and not serp_api_key:
        print("LLMEngineNode: Web search enabled but SerpAPI key is missing.")

    if custom_prompt:
        full_prompt_parts.append(f"Custom Instruction: {custom_prompt}\n\n")
    
    if context:
        full_prompt_parts.append(f"Knowledge Base Context:\n{context}\n\n")
    
    full_prompt_parts.append(f"User Query: {query}")

    final_prompt = "".join(full_prompt_parts).strip()
    print(f"LLMEngineNode: Final prompt (first 200 chars): '{final_prompt[:200]}...'")

    llm_response = "Error: Could not generate response."
    try:
        model = get_gemini_model(api_key=llm_api_key, model_name=model_name if model_name else "gemini-1.5-flash")
        print(f"LLMEngineNode: Gemini LLM model '{model_name if model_name else 'gemini-1.5-flash'}' obtained.")

        # CRITICAL FIX: Removed 'await' here because model.generate_content is synchronous.
        response = model.generate_content(
            final_prompt,
            generation_config=genai.types.GenerationConfig(temperature=temperature)
        )
        llm_response = response.text
        print(f"LLMEngineNode: LLM generated response (first 200 chars): '{llm_response[:200]}...'")

    except Exception as e:
        print(f"LLMEngineNode Error: An error occurred during LLM generation: {e}")
        llm_response = f"Error from LLM: {e}"
        raise HTTPException(status_code=500, detail=f"Error in LLMEngineNode: {str(e)}")

    return {"response": llm_response}

