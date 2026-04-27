"use client";

import { useState } from "react";
import { apiService } from "@/services/api";

interface FlashcardViewProps {
  userId?: string;
  lessons: any[];
}

export default function FlashcardView({ userId, lessons }: FlashcardViewProps) {
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"select" | "view">("select");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const startFlashcards = async () => {
    if (!selectedLesson) return;
    setLoading(true);
    try {
      const lessonTitle = lessons.find(l => l.id === selectedLesson)?.title || selectedLesson;
      const data = await apiService.generateFlashcards(lessonTitle);
      setCards(data.cards);
      setCurrentStep("view");
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error("Failed to generate flashcards:", error);
      alert("เกิดข้อผิดพลาดในการสร้าง Flashcards");
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      // Completed - Save completion to Supabase if desired
      alert("ทบทวนครบทั้ง 10 บัตรคำแล้ว!");
      setCurrentStep("select");
    }
  };

  if (currentStep === "select") {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">ทบทวนด้วย Flashcards</h2>
        <p className="text-gray-500 mb-8 text-center max-w-md">เน้นย้ำความจำด้วยบัตรคำถาม-คำตอบที่สร้างโดย AI</p>
        
        <div className="w-full max-w-xs mb-8">
          <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">เลือกบทเรียน</label>
          <select 
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
          >
            <option value="">-- เลือกบทเรียน --</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
            ))}
          </select>
        </div>

        <button
          onClick={startFlashcards}
          disabled={!selectedLesson || loading}
          className={`px-10 py-4 rounded-full font-bold text-white transition-all shadow-lg ${
            !selectedLesson || loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[var(--color-primary)] hover:brightness-110 active:scale-95'
          }`}
        >
          {loading ? "กำลังเตรียมบัตรคำ..." : "เริ่มใช้ Flashcards"}
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const goToNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => setCurrentStep("select")} className="text-sm font-bold text-gray-400 hover:text-gray-600 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          ย้อนกลับ
        </button>
        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
          CARD {currentIndex + 1} / {cards.length}
        </span>
      </div>

      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="relative w-full h-[350px] md:h-[400px] cursor-pointer group perspective"
      >
        <div className={`relative w-full h-full transition-all duration-700 preserve-3d shadow-xl rounded-[40px] ${isFlipped ? 'rotate-y-180' : ''}`}>
          {/* Front */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-white border-2 border-gray-50 rounded-[40px] flex flex-col items-center justify-center p-10 text-center">
            <div className="text-xs font-bold text-[var(--color-primary)] mb-6 tracking-[0.2em] uppercase">QUESTION</div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-800 leading-relaxed">{currentCard.front}</h3>
            <div className="absolute bottom-10 text-[10px] font-bold text-gray-300 animate-pulse uppercase tracking-widest">คลิกเพื่อดูคำตอบ</div>
          </div>
          
          {/* Back */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-[var(--color-primary)] rounded-[40px] flex flex-col items-center justify-center p-10 text-center text-white shadow-2xl">
            <div className="text-xs font-bold text-white/60 mb-6 tracking-[0.2em] uppercase">ANSWER</div>
            <p className="text-lg md:text-xl font-medium leading-relaxed">{currentCard.back}</p>
          </div>
        </div>
      </div>

      {/* Card indicator dots */}
      <div className="mt-6 flex justify-center gap-2 flex-wrap">
        {cards.map((_, idx) => (
          <button
            key={idx}
            onClick={() => { setCurrentIndex(idx); setIsFlipped(false); }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              idx === currentIndex 
                ? 'bg-[var(--color-primary)] scale-125' 
                : idx < currentIndex 
                  ? 'bg-[var(--color-primary)]/40' 
                  : 'bg-gray-200'
            }`}
            title={`Card ${idx + 1}`}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-center gap-4">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className={`px-8 py-4 rounded-full font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
            currentIndex === 0
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          ข้อก่อน
        </button>
        <button
          onClick={currentIndex === cards.length - 1 ? () => setCurrentStep("select") : goToNext}
          className="px-8 py-4 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition-all shadow-xl active:scale-95 flex items-center gap-2"
        >
          {currentIndex === cards.length - 1 ? "เสร็จสิ้น" : "ถัดไป"}
          {currentIndex < cards.length - 1 && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          )}
        </button>
      </div>
    </div>
  );
}
