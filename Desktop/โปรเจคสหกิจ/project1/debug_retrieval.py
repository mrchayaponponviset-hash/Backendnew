from vector_store import VectorStore
from config import VECTOR_STORE_PATH

def test_retrieval():
    vs = VectorStore()
    if not vs.load(VECTOR_STORE_PATH):
        print("Failed to load vector store.")
        return

    query = "ปี 1 มีกี่วิชา"
    results = vs.search(query, top_k=5)
    
    with open("debug_results.txt", "w", encoding="utf-8") as f:
        f.write(f"Query: {query}\n")
        f.write(f"Found {len(results)} results:\n")
        for i, res in enumerate(results):
            f.write(f"\n--- Result {i+1} ---\n")
            f.write(res + "\n")
    print("Debug results written to debug_results.txt")

if __name__ == "__main__":
    test_retrieval()
