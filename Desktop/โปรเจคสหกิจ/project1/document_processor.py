import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import CHUNK_SIZE, CHUNK_OVERLAP, DATA_DIR

def load_documents(directory):
    documents = []
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"Created directory: {directory}. Please add .txt files there.")
        return documents

    for filename in os.listdir(directory):
        if filename.endswith(".txt"):
            filepath = os.path.join(directory, filename)
            with open(filepath, "r", encoding="utf-8") as f:
                documents.append(f.read())
    return documents

def split_text(documents):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        separators=["\n## ", "\n---", "\n\n", "\n"], # Section-based separators
        add_start_index=True,
    )
    
    chunks = []
    for doc in documents:
        chunks.extend(text_splitter.split_text(doc))
    return chunks

if __name__ == "__main__":
    # Test loading
    docs = load_documents(DATA_DIR)
    print(f"Loaded {len(docs)} documents.")
    if docs:
        chunks = split_text(docs)
        print(f"Created {len(chunks)} chunks.")
