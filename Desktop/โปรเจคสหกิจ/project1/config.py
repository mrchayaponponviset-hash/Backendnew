import os
from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()

# API Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY:
    print("WARNING: OPENROUTER_API_KEY not found in environment or .env file.")

# Model Configuration
EMBEDDING_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
LLM_MODEL_NAME = "openai/gpt-oss-120b:free"

# Path Configuration
DATA_DIR = "data"
VECTOR_STORE_PATH = "faiss_index"

# Text Processing Configuration
CHUNK_SIZE = 10000
CHUNK_OVERLAP = 2000
