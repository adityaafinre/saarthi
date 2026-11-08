import os
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from app.config import settings

_vector_db = None

def get_vector_store():
    global _vector_db
    if _vector_db is not None:
        return _vector_db
        
    index_path = os.path.abspath(settings.FAISS_INDEX_PATH)
    
    # We use a lightweight and efficient embedding model locally
    embeddings = HuggingFaceEmbeddings(
        model_name="all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"}
    )
    
    if os.path.exists(os.path.join(index_path, "index.faiss")):
        print(f"Loading existing FAISS index from: {index_path}")
        # allow_dangerous_deserialization is required to load FAISS pickle metadata files
        _vector_db = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
    else:
        print(f"FAISS index not found at: {index_path}. Creating a temporary index.")
        from langchain_core.documents import Document
        dummy_doc = Document(
            page_content="Sarthi CSR compliance platforms help NGOs and corporates track projects.",
            metadata={"source": "system"}
        )
        _vector_db = FAISS.from_documents([dummy_doc], embeddings)
        
    return _vector_db

def query_vector_store(query: str, k: int = 3):
    try:
        db = get_vector_store()
        results = db.similarity_search(query, k=k)
        return results
    except Exception as e:
        print(f"Error querying FAISS vector store: {e}")
        return []
