# services/nodes/knowledge_base_node.py

from typing import List, Dict, Any
import google.generativeai as genai
import chromadb
from utils.gemini_client import embed_document_gemini # This is a synchronous function
from utils.chroma_client import get_chroma_collection
from fastapi import HTTPException

async def process_knowledge_retrieval(
    query: str,
    workflow_id: str,
    embedding_api_key: str,
    top_n_results: int = 5
) -> Dict[str, Any]:
    """
    Retrieves relevant context from the ChromaDB knowledge base based on the user query.

    Args:
        query (str): The user's input query.
        workflow_id (str): The ID of the current workflow, used to scope document retrieval.
        embedding_api_key (str): Decrypted API key for Gemini Embeddings.
        top_n_results (int): The number of top relevant document chunks to retrieve.

    Returns:
        Dict[str, Any]: A dictionary containing the concatenated relevant context.
                        Returns an empty string if no context is found or on error.
    """
    print(f"KnowledgeBaseNode: Processing query for context: '{query}' for workflow '{workflow_id}'")
    relevant_context = ""
    try:
        # CRITICAL FIX: Ensure NO 'await' is used here, as embed_document_gemini is synchronous.
        query_embedding = embed_document_gemini(text_chunk=query, api_key=embedding_api_key)
        print("KnowledgeBaseNode: Query embedded.")

        # ChromaDB operations are typically synchronous.
        collection = get_chroma_collection(collection_name="doc_chunks")
        print("KnowledgeBaseNode: ChromaDB collection accessed.")

        results = collection.query(
            query_embeddings=[query_embedding], # query_embedding is a list, so [query_embedding] is a list of lists, which ChromaDB expects.
            n_results=top_n_results,
            where={"workflow_id": workflow_id}
        )
        print(f"KnowledgeBaseNode: ChromaDB query returned {len(results.get('documents', []))} results.")

        if results and results.get("documents"):
            relevant_docs = results['documents'][0]
            relevant_context = "\n\n".join(relevant_docs)
            print(f"KnowledgeBaseNode: Retrieved context (first 200 chars): '{relevant_context[:200]}...'")
        else:
            print("KnowledgeBaseNode: No relevant documents found in ChromaDB.")

    except Exception as e:
        print(f"KnowledgeBaseNode Error: An error occurred during knowledge retrieval (Gemini API or other): {e}")
        raise HTTPException(status_code=500, detail=f"Error in KnowledgeBaseNode: {str(e)}")

    return {"context": relevant_context}

