
import chromadb

_chroma_client = chromadb.Client()

print(f"ChromaDB: Initialized {'in-memory' if not hasattr(_chroma_client, 'persist') else 'persistent'} client.")

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
        print(f"ChromaDB: Accessed/Created collection '{collection_name}'.")
        return collection
    except Exception as e:
        print(f"ChromaDB: Failed to access collection '{collection_name}': {e}")
        raise