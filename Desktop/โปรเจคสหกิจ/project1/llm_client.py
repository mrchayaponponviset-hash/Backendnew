from openai import OpenAI
from config import OPENROUTER_API_KEY, LLM_MODEL_NAME

class LLMClient:
    def __init__(self):
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )

    def generate_response(self, query, context):
        prompt = f"""
คุณเป็นผู้ช่วยอัจฉริยะที่รอบรู้ 
1. หากคำถามเกี่ยวข้องกับ "หลักสูตร" หรือ "เนื้อหาวิชา" ให้ความสำคัญกับข้อมูลใน "บริบท (Context)" เป็นอันดับแรก
2. หากใน "บริบท (Context)" ไม่มีข้อมูลที่เกี่ยวข้อง หรือเป็นคำถามทั่วไป (เช่น การเขียนโปรแกรม, การใช้ชีวิต, ความรู้อื่นๆ) ให้คุณตอบโดยใช้ความรู้ทั่วไปของคุณเองอย่างเต็มที่
3. หากตอบจากบริบท ให้ระบุข้อมูลตามจริง แต่ถ้าตอบจากความรู้ทั่วไป ให้ตอบอย่างสุภาพและมีสาระ

บริบท (Context):
{context}

คำถาม (Question):
{query}

คำตอบ (Answer):
"""
        
        try:
            response = self.client.chat.completions.create(
                model=LLM_MODEL_NAME,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                # Optional: tracking headers (recommended by OpenRouter)
                extra_headers={
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "RAG System Local"
                }
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"เกิดข้อผิดพลาดในการเชื่อมต่อ LLM: {str(e)}"

if __name__ == "__main__":
    # Test LLM
    client = LLMClient()
    print(client.generate_response("สวัสดี", "ไม่ต้องทำอะไร"))
