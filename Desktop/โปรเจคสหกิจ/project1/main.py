import os
from config import DATA_DIR, VECTOR_STORE_PATH
from document_processor import load_documents, split_text
from vector_store import VectorStore
from llm_client import LLMClient

def main():
    print("--- ระบบ RAG กำลังเริ่มต้น ---")
    
    # 1. Initialize models and vector store
    vs = VectorStore()
    llm = LLMClient()
    
    # 2. Check if vector store exists, else load documents
    re_index = False
    if os.path.exists(VECTOR_STORE_PATH):
        choice = input(f"พบฐานข้อมูลเก่ายังคงอยู่ ต้องการทำ Index ใหม่จากข้อมูลล่าสุดใน '{DATA_DIR}' หรือไม่? (y/n): ")
        if choice.lower() == 'y':
            print("กำลังทำการลบและทำ Index ใหม่...")
            re_index = True
        else:
            print(f"กำลังโหลดข้อมูลจากเวกเตอร์สโตร์เดิม: {VECTOR_STORE_PATH}...")
            vs.load(VECTOR_STORE_PATH)
    
    if not os.path.exists(VECTOR_STORE_PATH) or re_index:
        if not re_index:
            print(f"ไม่พบเวกเตอร์สโตร์ กำลังประมวลผลเอกสารใน '{DATA_DIR}'...")
            
        documents = load_documents(DATA_DIR)
        
        if not documents:
            print(f"คำเตือน: ไม่พบไฟล์เอกสาร (.txt) ในโฟลเดอร์ '{DATA_DIR}' กรุณาเพิ่มไฟล์ก่อนเริ่มรัน")
            # If re-indexing failed due to no documents, try to load old index if it exists
            if re_index and os.path.exists(VECTOR_STORE_PATH):
                print("กลับไปใช้ข้อมูลที่มีอยู่เดิม...")
                vs.load(VECTOR_STORE_PATH)
        else:
            chunks = split_text(documents)
            print(f"ทำการแบ่งข้อความออกเป็น {len(chunks)} ส่วน...")
            
            # If re-index, start with a fresh vs
            if re_index:
                vs = VectorStore()
            
            vs.add_chunks(chunks)
            vs.save(VECTOR_STORE_PATH)
            print("บันทึกฐานข้อมูลลงเวกเตอร์สโตร์เสร็จสมบูรณ์!")

    print("\n--- ระบบพร้อมใช้งาน (พิมพ์ 'exit' หรือ 'quit' เพื่อออก) ---")
    
    # 3. Interactive Loop
    while True:
        query = input("\nคุณ: ")
        
        if query.lower() in ['exit', 'quit', 'ออก']:
            print("ขอบคุณที่ใช้บริการครับ!")
            break
            
        if not query.strip():
            continue
            
        print("กำลังค้นหาคำตอบ...")
        
        # Search relevant chunks
        context_chunks = vs.search(query, top_k=10)
        context = "\n---\n".join(context_chunks)
        
        # if not context_chunks:
        #     print("AI: ขออภัย ฉันไม่พบข้อมูลที่เกี่ยวข้องในเอกสารครับ")
        #     continue
            
        # Generate response
        response = llm.generate_response(query, context)
        print(f"\nAI: {response}")

if __name__ == "__main__":
    main()
