# utils/chroma_client.py

import chromadb
import os

# Initialize ChromaDB client globally.
# For persistent storage, you'd configure a path or a client connection.
# For development, an in-memory client is often sufficient.
# If you're using a persistent client, ensure its path is correctly set.
# Example for persistent client:
# CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
# _chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
# For in-memory (good for quick testing, data is lost on restart):
_chroma_client = chromadb.Client()

print(f"ChromaDB Client: Initialized. Using {'in-memory' if not hasattr(_chroma_client, 'persist') else 'persistent'} client.")


def get_chroma_collection(collection_name: str):
    """
    Retrieves or creates a ChromaDB collection by name.

    Args:
        collection_name (str): The name of the collection to retrieve or create.

    Returns:
        chromadb.api.models.Collection.Collection: The ChromaDB collection object.
    """
    if not collection_name:
        raise ValueError("Collection name cannot be empty.")
    
    try:
        collection = _chroma_client.get_or_create_collection(name=collection_name)
        print(f"ChromaDB Client: Accessed/Created collection '{collection_name}'.")
        return collection
    except Exception as e:
        print(f"ChromaDB Client: ERROR - Failed to get or create collection '{collection_name}': {e}")
        raise

