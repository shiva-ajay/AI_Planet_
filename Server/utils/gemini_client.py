
import google.generativeai as genai
from typing import List

def _configure_gemini(api_key: str):
    """
    Configures the Gemini API with the provided API key.
    """
    if not api_key:
        print("Gemini: API key missing.")
        raise ValueError("Gemini API key missing.")
    try:
        genai.configure(api_key=api_key)
        print("Gemini: Configured successfully.")
    except Exception as e:
        print(f"Gemini: Failed to configure: {e}")
        raise genai.APIError(f"Failed to configure Gemini: {e}")

def get_gemini_model(api_key: str, model_name: str = "gemini-1.5-flash"):
    """
    Initializes and returns a configured Gemini GenerativeModel instance.

    Args:
        api_key (str): The decrypted Gemini API key.
        model_name (str): The name of the Gemini model to use.

    Returns:
        google.generativeai.GenerativeModel: An instance of the Gemini model.
    """
    _configure_gemini(api_key)
    try:
        model = genai.GenerativeModel(model_name)
        print(f"Gemini model '{model_name}' obtained.")
        return model
    except Exception as e:
        print(f"Error obtaining model '{model_name}': {e}")
        raise genai.APIError(f"Failed to get model: {e}")

def get_gemini_embedding_model(api_key: str):
    """
    Initializes and returns a configured Gemini Embedding model instance.

    Args:
        api_key (str): The decrypted Gemini API key.

    Returns:
        module: The google.generativeai module, configured for embeddings.
    """
    _configure_gemini(api_key)
    try:
        print("Gemini embedding model configured.")
        return genai
    except Exception as e:
        print(f"Error configuring embedding model: {e}")
        raise genai.APIError(f"Failed to configure embedding model: {e}")

def embed_document_gemini(text_chunk: str, api_key: str, model_name: str = "models/text-embedding-004") -> List[float]:
    """
    Generates an embedding for a given text chunk using Gemini's embedding model.

    Args:
        text_chunk (str): The text content to embed.
        api_key (str): The decrypted Gemini API key.
        model_name (str): The name of the embedding model to use.

    Returns:
        List[float]: A list of floats representing the embedding vector.
    """
    if not text_chunk:
        print("Gemini: Empty text chunk.")
        raise ValueError("Text chunk cannot be empty.")
    if not api_key:
        print("Gemini: API key missing.")
        raise ValueError("Gemini API key missing.")

    _configure_gemini(api_key)
    try:
        print(f"Embedding chunk (length: {len(text_chunk)}) with '{model_name}'.")
        response = genai.embed_content(model=model_name, content=text_chunk)
        if "embedding" in response:
            print("Text chunk embedded.")
            return response["embedding"]
        print("Gemini: Missing 'embedding' in response.")
        raise genai.APIError("Missing 'embedding' in response.")
    except Exception as e:
        print(f"Embedding error: {e}")
        raise genai.APIError(f"Error during embedding: {e}")