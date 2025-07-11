# utils/gemini_client.py

import google.generativeai as genai
from typing import List, Dict, Any
import os

def _configure_gemini(api_key: str):
    """
    Configures the Gemini API with the provided API key.
    This needs to be called before using any Gemini models.
    """
    if not api_key:
        print("Gemini Client: ERROR - API key is empty or missing during configuration.")
        raise ValueError("Gemini API key is missing.")
    try:
        genai.configure(api_key=api_key)
        print("Gemini Client: Configured successfully.")
    except Exception as e:
        print(f"Gemini Client: ERROR - Failed to configure Gemini API: {e}")
        raise genai.APIError(f"Failed to configure Gemini API: {e}")


def get_gemini_model(api_key: str, model_name: str = "gemini-pro"):
    """
    Initializes and returns a configured Gemini GenerativeModel instance.

    Args:
        api_key (str): The decrypted Gemini API key.
        model_name (str): The name of the Gemini model to use (e.g., "gemini-pro", "gemini-1.5-flash").

    Returns:
        google.generativeai.GenerativeModel: An instance of the Gemini model.

    Raises:
        ValueError: If the API key is missing.
        genai.APIError: If there's an issue configuring or accessing the model.
    """
    _configure_gemini(api_key)
    try:
        model = genai.GenerativeModel(model_name)
        print(f"Gemini LLM model '{model_name}' obtained.")
        return model
    except Exception as e:
        print(f"Error obtaining Gemini LLM model '{model_name}': {e}")
        raise genai.APIError(f"Failed to get Gemini LLM model: {e}")


def get_gemini_embedding_model(api_key: str):
    """
    Initializes and returns a configured Gemini Embedding model instance.
    This function primarily ensures configuration and returns the genai module
    for direct use of genai.embed_content.

    Args:
        api_key (str): The decrypted Gemini API key.

    Returns:
        module: The google.generativeai module, configured for embeddings.

    Raises:
        ValueError: If the API key is missing.
        genai.APIError: If there's an issue configuring or accessing the model.
    """
    _configure_gemini(api_key)
    try:
        print("Gemini Embedding model configured for use.")
        return genai # Return the genai module itself
    except Exception as e:
        print(f"Error configuring Gemini embedding model: {e}")
        raise genai.APIError(f"Failed to configure Gemini embedding model: {e}")


# IMPORTANT: This function is now a regular 'def' (synchronous)
def embed_document_gemini(text_chunk: str, api_key: str, model_name: str = "models/text-embedding-004") -> List[float]:
    """
    Generates an embedding for a given text chunk using Gemini's embedding model.

    Args:
        text_chunk (str): The text content to embed.
        api_key (str): The decrypted Gemini API key.
        model_name (str): The name of the embedding model to use.
                          Default is "models/text-embedding-004".

    Returns:
        List[float]: A list of floats representing the embedding vector.

    Raises:
        ValueError: If the text chunk is empty or API key is missing.
        genai.APIError: If the embedding generation fails.
    """
    if not text_chunk:
        print("Embed Document Gemini: ERROR - Text chunk is empty.")
        raise ValueError("Text chunk cannot be empty for embedding.")
    if not api_key:
        print("Embed Document Gemini: ERROR - API key is empty or missing.")
        raise ValueError("Gemini API key is missing for embedding.")

    _configure_gemini(api_key)

    try:
        print(f"Embed Document Gemini: Attempting to embed chunk (length: {len(text_chunk)}) using model '{model_name}'.")
        # genai.embed_content is a synchronous call
        response = genai.embed_content(model=model_name, content=text_chunk)
        if "embedding" in response:
            print(f"Embed Document Gemini: Successfully embedded text chunk.")
            return response["embedding"]
        else:
            print("Embed Document Gemini: ERROR - Gemini embedding response missing 'embedding' field.")
            raise genai.APIError("Gemini embedding response missing 'embedding' field.")
    except Exception as e: # Catching general Exception as genai.APIError might not be directly available
        print(f"Embed Document Gemini: ERROR - An error occurred during embedding: {e}")
        raise genai.APIError(f"Error during embedding: {e}")

