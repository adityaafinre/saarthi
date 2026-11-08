import os
import glob
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from app.config import settings

def run_indexer(data_dir: str = None, output_dir: str = None):
    if not data_dir:
        # Resolve to backend/data relative to this file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.abspath(os.path.join(current_dir, "..", "..", "data"))
    
    if not output_dir:
        output_dir = os.path.abspath(settings.FAISS_INDEX_PATH)
        
    print(f"Reading documents from: {data_dir}")
    print(f"Output directory: {output_dir}")
    
    # 1. Load files
    txt_files = glob.glob(os.path.join(data_dir, "*.txt"))
    if not txt_files:
        print(f"No .txt documents found in {data_dir}. Indexing aborted.")
        return False
        
    documents = []
    for file_path in txt_files:
        print(f"Loading {file_path}...")
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                doc = Document(
                    page_content=content,
                    metadata={"source": os.path.basename(file_path)}
                )
                documents.append(doc)
        except Exception as e:
            print(f"Failed to read {file_path}: {e}")
            
    if not documents:
        print("No documents loaded. Indexing aborted.")
        return False
            
    # 2. Split documents
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
    split_docs = text_splitter.split_documents(documents)
    print(f"Created {len(split_docs)} chunks from {len(documents)} source files.")
    
    # 3. Create embeddings model
    print("Initializing embedding model (all-MiniLM-L6-v2)...")
    try:
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    except Exception as e:
        print(f"Failed to initialize HuggingFaceEmbeddings: {e}")
        return False
    
    # 4. Build FAISS index and save
    print("Building FAISS index...")
    try:
        db = FAISS.from_documents(split_docs, embeddings)
        db.save_local(output_dir)
        print(f"FAISS index successfully saved to: {output_dir}")
        return True
    except Exception as e:
        print(f"Failed to build or save FAISS index: {e}")
        return False

if __name__ == "__main__":
    import sys
    # Add project root to path to allow direct script execution
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
    run_indexer()
