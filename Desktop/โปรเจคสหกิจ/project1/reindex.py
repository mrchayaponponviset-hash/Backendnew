from vector_store import VectorStore
from config import DATA_DIR, VECTOR_STORE_PATH
from document_processor import load_documents, split_text
import os

def force_reindex():
    print("Re-indexing started...")
    vs = VectorStore()
    documents = load_documents(DATA_DIR)
    chunks = split_text(documents)
    vs.add_chunks(chunks)
    vs.save(VECTOR_STORE_PATH)
    print(f"Re-indexing complete. Chunks: {len(chunks)}")

if __name__ == "__main__":
    force_reindex()
