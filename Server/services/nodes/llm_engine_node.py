
from typing import Optional, Dict, Any
import requests
import json
import google.generativeai as genai
from utils.gemini_client import get_gemini_model
from fastapi import HTTPException

async def perform_serp_search(query: str, serp_api_key: str, num_results: int = 3) -> str:
    """
    Performs a web search using SerpAPI and returns concatenated snippets.
    """
    if not serp_api_key:
        print("SerpAPI: No API key provided.")
        return ""

    url = "https://serpapi.com/search"
    params = {
        "api_key": serp_api_key,
        "q": query,
        "num": num_results,
        "engine": "google",
        "output": "json"
    }
    print(f"Searching for: '{query}'")
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
            print(f"Found {len(snippets)} snippets.")
            return "\n\n".join(snippets)
        print("No snippets found.")
        return ""
    except requests.exceptions.RequestException as e:
        print(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"SerpAPI search failed: {str(e)}")
    except json.JSONDecodeError as e:
        print(f"JSON parsing failed: {e}")
        raise HTTPException(status_code=500, detail=f"SerpAPI response parsing failed: {str(e)}")
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"SerpAPI unexpected error: {str(e)}")

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
    """
    print(f"Generating response for: '{query}' with model '{model_name}'")
    full_prompt_parts = []
    web_search_context = ""

    if web_search_enabled and serp_api_key:
        print("Performing web search...")
        web_search_context = await perform_serp_search(query=query, serp_api_key=serp_api_key)
        if web_search_context:
            full_prompt_parts.append(f"Web Search Results:\n{web_search_context}\n\n")
            print("Web search results added.")
        else:
            print("No web search results.")
    elif web_search_enabled and not serp_api_key:
        print("Web search enabled but no SerpAPI key.")

    if custom_prompt:
        full_prompt_parts.append(f"Custom Instruction: {custom_prompt}\n\n")
    
    if context:
        full_prompt_parts.append(f"Knowledge Base Context:\n{context}\n\n")
    
    full_prompt_parts.append(f"User Query: {query}")

    final_prompt = "".join(full_prompt_parts).strip()
    print(f"Final prompt: '{final_prompt[:200]}...'")

    llm_response = "Error: Could not generate response."
    try:
        model = get_gemini_model(api_key=llm_api_key, model_name=model_name if model_name else "gemini-1.5-flash")
        print(f"Using model: '{model_name if model_name else 'gemini-1.5-flash'}'")

        response = model.generate_content(
            final_prompt,
            generation_config=genai.types.GenerationConfig(temperature=temperature)
        )
        llm_response = response.text
        print(f"LLM response: '{llm_response[:200]}...'")

    except Exception as e:
        print(f"LLM error: {e}")
        llm_response = f"Error from LLM: {e}"
        raise HTTPException(status_code=500, detail=f"LLMEngineNode error: {str(e)}")

    return {"response": llm_response}