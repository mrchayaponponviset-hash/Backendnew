import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from config import EMBEDDING_MODEL_NAME, VECTOR_STORE_PATH

class VectorStore:
    def __init__(self):
        self.model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        self.index = None
        self.chunks = []

    def add_chunks(self, chunks):
        if not chunks:
            return
        
        self.chunks.extend(chunks)
        embeddings = self.model.encode(chunks)
        
        # Initialize or update index
        dimension = embeddings.shape[1]
        if self.index is None:
            self.index = faiss.IndexFlatL2(dimension)
            
        self.index.add(np.array(embeddings).astype('float32'))

    def search(self, query, top_k=3):
        if self.index is None or not self.chunks:
            return []
            
        query_embedding = self.model.encode([query])
        distances, indices = self.index.search(np.array(query_embedding).astype('float32'), top_k)
        
        results = []
        for idx in indices[0]:
            if idx != -1 and idx < len(self.chunks):
                results.append(self.chunks[idx])
        return results

    def save(self, path=VECTOR_STORE_PATH):
        if self.index is None:
            return
        # Create directory if it doesn't exist
        os.makedirs(path, exist_ok=True)
        # Save FAISS index
        faiss.write_index(self.index, os.path.join(path, "index.faiss"))
        # Save chunks
        with open(os.path.join(path, "chunks.txt"), "w", encoding="utf-8") as f:
            for chunk in self.chunks:
                f.write(chunk.replace("\n", "[NEWLINE]") + "\n")

    def load(self, path=VECTOR_STORE_PATH):
        if not os.path.exists(os.path.join(path, "index.faiss")):
            print("No vector store found at location.")
            return False
            
        self.index = faiss.read_index(os.path.join(path, "index.faiss"))
        with open(os.path.join(path, "chunks.txt"), "r", encoding="utf-8") as f:
            self.chunks = [line.strip().replace("[NEWLINE]", "\n") for line in f]
        return True

if __name__ == "__main__":
    # Test vector store
    vs = VectorStore()
    test_chunks = ["Hello world", "RAG is awesome", "Hugging face is great"]
    vs.add_chunks(test_chunks)
    res = vs.search("What is RAG?")
    print(f"Search result: {res}")
