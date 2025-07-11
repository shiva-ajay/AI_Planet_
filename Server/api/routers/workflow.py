# api/routers/workflow.py

import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
import tempfile
from api.models.workflow import WorkflowCreateRequest, WorkflowUpdateRequest, WorkflowConfig
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from db.supabase import get_supabase_client
from utils.chroma_client import get_chroma_collection # This is now assumed to return the Collection directly
from utils.encryption import encrypt, decrypt
from utils.pdf_parser import extract_text_from_pdf
from utils.text_splitter import split_text_into_chunks
from utils.gemini_client import embed_document_gemini

router = APIRouter()

@router.post("/create")
async def create_workflow(payload: WorkflowCreateRequest):
    """
    Creates a new workflow entry in the database.
    """
    client = get_supabase_client()
    data = {
        "name": payload.name,
        "description": payload.description
    }
    try:
        response = client.table("workflows").insert(data).execute()
        return response.data
    except Exception as e:
        print(f"[{datetime.now()}] ERROR: Failed to create workflow: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")

@router.patch("/update/{workflow_id}")
async def update_workflow(
    workflow_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    nodes: str = Form(...),
    edges: str = Form(...),
    config: str = Form(...),
    document_file: Optional[UploadFile] = File(None),
    document_name: Optional[str] = Form(None),
):
    """
    Updates an existing workflow's definition, configuration, and optionally processes an uploaded document.
    """
    client = get_supabase_client()

    # Parse JSON strings from form data
    try:
        parsed_nodes = json.loads(nodes)
        parsed_edges = json.loads(edges)
        parsed_config = json.loads(config)
        print(f"[{datetime.now()}] Parsed nodes, edges, and config from form data.")
    except json.JSONDecodeError as e:
        print(f"[{datetime.now()}] ERROR: Failed to parse JSON from form data: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON format in form data: {e}")


    updates = {}
    if name is not None:
        updates["name"] = name
    if description is not None:
        updates["description"] = description
    updates["nodes"] = parsed_nodes
    updates["edges"] = parsed_edges
    updates["config"] = parsed_config

    temp_pdf_path = None

    # --- Document Processing Logic ---
    if document_file:
        print(f"[{datetime.now()}] Document file received: {document_file.filename}")
        try:
            file_content = await document_file.read()
            print(f"[{datetime.now()}] File content read, size: {len(file_content)} bytes")

            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(file_content)
                temp_pdf_path = tmp.name
            print(f"[{datetime.now()}] Temporary file created at: {temp_pdf_path}")

            document_extracted_text = ""
            try:
                document_extracted_text = extract_text_from_pdf(temp_pdf_path)
                print(f"[{datetime.now()}] Text extracted from PDF. Length: {len(document_extracted_text)} (approx)")
                if len(document_extracted_text) < 50:
                    print(f"[{datetime.now()}] WARNING: Extracted text seems very short or empty.")
            except Exception as pdf_extract_e:
                print(f"[{datetime.now()}] ERROR: Failed to extract text from PDF: {pdf_extract_e}")
                raise HTTPException(status_code=500, detail=f"PDF extraction failed: {str(pdf_extract_e)}")

            raw_embedding_api_key_for_embedding = parsed_config.get("embedding_api_key")
            print(f"[{datetime.now()}] Raw embedding API key from parsed config (for immediate embedding): '{raw_embedding_api_key_for_embedding[:20] if raw_embedding_api_key_for_embedding else 'None' }...'")

            if not raw_embedding_api_key_for_embedding:
                raise HTTPException(status_code=400, detail="Embedding API key is missing in config to process document.")
            
            chunks = []
            try:
                chunks = split_text_into_chunks(document_extracted_text)
                print(f"[{datetime.now()}] Text split into {len(chunks)} chunks.")
                if not chunks:
                    print(f"[{datetime.now()}] WARNING: No chunks generated from extracted text.")
            except Exception as chunk_e:
                print(f"[{datetime.now()}] ERROR: Failed to split text into chunks: {chunk_e}")
                raise HTTPException(status_code=500, detail=f"Text chunking failed: {str(chunk_e)}")

            # CRITICAL FIX: Call get_chroma_collection with the collection name directly
            try:
                collection = get_chroma_collection(collection_name="doc_chunks")
                print(f"[{datetime.now()}] ChromaDB collection 'doc_chunks' accessed/created.")
            except Exception as chroma_client_e:
                print(f"[{datetime.now()}] ERROR: Failed to get ChromaDB collection: {chroma_client_e}")
                raise HTTPException(status_code=500, detail=f"Failed to initialize ChromaDB collection: {str(chroma_client_e)}")
            
            metadatas = []
            embeddings = []
            ids = []
            documents_to_store = []

            for i, chunk in enumerate(chunks):
                try:
                    print(f"[{datetime.now()}] Attempting to embed chunk {i} (first 50 chars): '{chunk[:50]}...'")
                    embedding = embed_document_gemini(text_chunk=chunk, api_key=raw_embedding_api_key_for_embedding)
                    embeddings.append(embedding)
                    chunk_id = f"{workflow_id}-{document_name or document_file.filename}-{i}-{uuid.uuid4().hex[:8]}"
                    ids.append(chunk_id)
                    documents_to_store.append(chunk)
                    metadatas.append({
                        "workflow_id": workflow_id,
                        "document_name": document_name or document_file.filename,
                        "chunk_index": i,
                    })
                    print(f"[{datetime.now()}] Successfully embedded chunk {i}.")
                except Exception as embed_e:
                    print(f"[{datetime.now()}] ERROR: Failed to embed chunk {i} for workflow {workflow_id}: {embed_e}")
                    pass 

            if embeddings:
                print(f"[{datetime.now()}] Attempting to add {len(embeddings)} embeddings to ChromaDB.")
                try:
                    collection.add(
                        embeddings=embeddings,
                        documents=documents_to_store,
                        metadatas=metadatas,
                        ids=ids
                    )
                    print(f"[{datetime.now()}] Successfully added {len(embeddings)} chunks to ChromaDB for workflow {workflow_id}")
                except Exception as chroma_e:
                    print(f"[{datetime.now()}] ERROR: Failed to add document chunks to ChromaDB: {chroma_e}")
                    raise HTTPException(status_code=500, detail=f"Failed to add document chunks to ChromaDB: {str(chroma_e)}")
            else:
                print(f"[{datetime.now()}] WARNING: No embeddings generated for workflow {workflow_id}. Document might be empty or processing failed.")

        except HTTPException:
            raise
        except Exception as e:
            print(f"[{datetime.now()}] CRITICAL ERROR (outer catch) during document processing for workflow {workflow_id}: {e}")
            error_detail = str(e) if str(e) else "An unknown error occurred during document processing."
            raise HTTPException(status_code=500, detail=f"Error processing document: {error_detail}")
        finally:
            if temp_pdf_path and os.path.exists(temp_pdf_path):
                print(f"[{datetime.now()}] Cleaning up temporary file: {temp_pdf_path}")
                os.remove(temp_pdf_path)

    # --- API Key Encryption before saving to Supabase ---
    if updates["config"].get("llm_api_key"):
        raw_llm_key = updates["config"]["llm_api_key"]
        print(f"[{datetime.now()}] Raw LLM API key from frontend (first 5 chars): '{raw_llm_key[:5]}...'")
        updates["config"]["llm_api_key"] = encrypt(raw_llm_key)
        print(f"[{datetime.now()}] LLM API key encrypted (first 5 chars): '{updates['config']['llm_api_key'][:5]}...'")

    if updates["config"].get("embedding_api_key"):
        raw_embedding_key = updates["config"]["embedding_api_key"]
        print(f"[{datetime.now()}] Raw Embedding API key from frontend (first 5 chars): '{raw_embedding_key[:5]}...'")
        updates["config"]["embedding_api_key"] = encrypt(raw_embedding_key)
        print(f"[{datetime.now()}] Embedding API key encrypted (first 5 chars): '{updates['config']['embedding_api_key'][:5]}...'")

    if updates["config"].get("serp_api_key"):
        raw_serp_key = updates["config"]["serp_api_key"]
        print(f"[{datetime.now()}] Raw SerpAPI key from frontend (first 5 chars): '{raw_serp_key[:5]}...'")
        updates["config"]["serp_api_key"] = encrypt(raw_serp_key)
        print(f"[{datetime.now()}] SerpAPI key encrypted (first 5 chars): '{updates['config']['serp_api_key'][:5]}...'")

    updates["updated_at"] = datetime.utcnow().isoformat()

    # --- Supabase Update ---
    try:
        response = client.table("workflows").update(updates).eq("id", workflow_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Workflow not found or update failed")

        print(f"[{datetime.now()}] Workflow {workflow_id} updated successfully in Supabase.")
        return {
            "message": "Workflow updated successfully",
            "updated_fields": list(updates.keys())
        }
    except Exception as e:
        print(f"[{datetime.now()}] ERROR: Failed to update workflow {workflow_id} in Supabase: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update workflow in Supabase: {str(e)}")


@router.get("/list", response_model=List[Dict[str, str]])
async def list_workflows():
    """
    Retrieves a list of all workflows with their basic metadata.
    """
    client = get_supabase_client()
    try:
        response = client.table("workflows").select("id, name, description").execute()
        
        if not response.data:
            return []

        workflows_data = response.data
        return workflows_data
    except Exception as e:
        print(f"[{datetime.now()}] ERROR: Error fetching workflows: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch workflows: {str(e)}")

@router.get("/{workflow_id}", response_model=Dict[str, Any])
async def get_workflow(workflow_id: str):
    """
    Retrieves a single workflow's complete definition by ID.
    """
    client = get_supabase_client()
    try:
        response = client.table("workflows").select("*").eq("id", workflow_id).single().execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Workflow not found")

        workflow_data = response.data
        
        # --- Decrypt API keys before returning to frontend (for display/re-editing) ---
        if workflow_data.get("config"):
            if workflow_data["config"].get("llm_api_key"):
                encrypted_llm_key_from_db = workflow_data["config"]["llm_api_key"]
                print(f"[{datetime.now()}] Encrypted LLM API key from DB (first 20 chars): '{encrypted_llm_key_from_db[:20] if encrypted_llm_key_from_db else 'None'}...'")
                try:
                    workflow_data["config"]["llm_api_key"] = decrypt(encrypted_llm_key_from_db)
                    print(f"[{datetime.now()}] Decrypted LLM API key for workflow {workflow_id}.")
                except Exception as de:
                    print(f"[{datetime.now()}] WARNING: Could not decrypt LLM API key for workflow {workflow_id}: {de}")
                    workflow_data["config"]["llm_api_key"] = "DECRYPTION_ERROR"
            
            if workflow_data["config"].get("embedding_api_key"):
                encrypted_embedding_key_from_db = workflow_data["config"]["embedding_api_key"]
                print(f"[{datetime.now()}] Encrypted Embedding API key from DB (first 20 chars): '{encrypted_embedding_key_from_db[:20] if encrypted_embedding_key_from_db else 'None'}...'")
                try:
                    workflow_data["config"]["embedding_api_key"] = decrypt(encrypted_embedding_key_from_db)
                    print(f"[{datetime.now()}] Decrypted Embedding API key for workflow {workflow_id}.")
                except Exception as de:
                    print(f"[{datetime.now()}] WARNING: Could not decrypt Embedding API key for workflow {workflow_id}: {de}")
                    workflow_data["config"]["embedding_api_key"] = "DECRYPTION_ERROR"

            if workflow_data["config"].get("serp_api_key"):
                encrypted_serp_key_from_db = workflow_data["config"]["serp_api_key"]
                print(f"[{datetime.now()}] Encrypted SerpAPI key from DB (first 20 chars): '{encrypted_serp_key_from_db[:20] if encrypted_serp_key_from_db else 'None'}...'")
                try:
                    workflow_data["config"]["serp_api_key"] = decrypt(encrypted_serp_key_from_db)
                    print(f"[{datetime.now()}] Decrypted SerpAPI key for workflow {workflow_id}.")
                except Exception as de:
                    print(f"[{datetime.now()}] WARNING: Could not decrypt SerpAPI key for workflow {workflow_id}: {de}")
                    workflow_data["config"]["serp_api_key"] = "DECRYPTION_ERROR"

        return workflow_data
    except Exception as e:
        print(f"[{datetime.now()}] ERROR: Error fetching workflow {workflow_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch workflow: {str(e)}")

