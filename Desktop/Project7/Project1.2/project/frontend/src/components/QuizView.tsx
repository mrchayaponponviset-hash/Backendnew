"use client";

import { useState, useEffect } from "react";
import { apiService } from "@/services/api";

interface QuizViewProps {
  userId?: string;
  lessons: any[];
}

export default function QuizView({ userId, lessons }: QuizViewProps) {
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [quizData, setQuizData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"select" | "quiz" | "result">("select");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [score, setScore] = useState(0);

  const startQuiz = async () => {
    if (!selectedLesson) return;
    setLoading(true);
    try {
      const lessonTitle = lessons.find(l => l.id === selectedLesson)?.title || selectedLesson;
      const data = await apiService.generateQuiz(lessonTitle);
      setQuizData(data);
      setCurrentStep("quiz");
      setCurrentIndex(0);
      setAnswers(new Array(data.questions.length).fill(null));
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      alert("เกิดข้อผิดพลาดในการสร้างข้อสอบ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (index: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = index;
    setAnswers(newAnswers);
  };

  const goToNext = () => {
    if (currentIndex < quizData.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const finishQuiz = () => {
    // Check if all answered
    if (answers.includes(null)) {
      if (!confirm("คุณยังทำข้อสอบไม่ครบทุกข้อ ยืนยันที่จะส่งคำตอบหรือไม่?")) return;
    }

    // Calculate score
    let finalScore = 0;
    quizData.questions.forEach((q: any, i: number) => {
      if (q.correctIndex === answers[i]) finalScore++;
    });
    setScore(finalScore);
    setCurrentStep("result");
    
    // Save score to Supabase
    if (userId) {
      apiService.saveScore({
        userId,
        lessonId: selectedLesson,
        type: "quiz",
        score: finalScore,
        totalQuestions: quizData.questions.length
      });
    }
  };

  if (currentStep === "select") {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">ทบทวนความรู้ด้วย Quiz</h2>
        <p className="text-gray-500 mb-8 text-center max-w-md">เลือกบทเรียนที่คุณเรียนจบแล้ว เพื่อทำแบบทดสอบ 10 ข้อที่สร้างโดย AI</p>
        
        <div className="w-full max-w-xs mb-8">
          <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">เลือกบทเรียน</label>
          <select 
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all cursor-pointer"
          >
            <option value="">-- เลือกบทเรียน --</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
            ))}
          </select>
        </div>

        <button
          onClick={startQuiz}
          disabled={!selectedLesson || loading}
          className={`px-10 py-4 rounded-full font-bold text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
            !selectedLesson || loading ? 'bg-gray-300 cursor-not-allowed' : 'bg-[var(--color-primary)] hover:brightness-110'
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              กำลังสร้างข้อสอบ...
            </div>
          ) : "เริ่มทำ Quiz"}
        </button>
      </div>
    );
  }

  if (currentStep === "quiz") {
    const q = quizData.questions[currentIndex];
    const selectedAnswer = answers[currentIndex];

    return (
      <div className="w-full max-w-3xl mx-auto p-6 md:p-10 bg-white rounded-[32px] border border-gray-100 shadow-xl animate-fade-in">
        <div className="flex justify-between items-center mb-10">
          <div className="px-4 py-1.5 bg-gray-100 rounded-full text-[12px] font-bold text-gray-500">
             QUESTION {currentIndex + 1} OF {quizData.questions.length}
          </div>
          <div className="text-[12px] font-bold text-[var(--color-primary)] uppercase tracking-widest">
            {q.domain}
          </div>
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-10 leading-relaxed">
          {q.question}
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {q.options.map((option: string, idx: number) => (
            <button
              key={idx}
              onClick={() => handleSelectAnswer(idx)}
              className={`p-5 text-left border rounded-2xl transition-all duration-200 font-medium group flex items-center gap-4 ${
                selectedAnswer === idx 
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md' 
                  : 'bg-gray-50 hover:bg-gray-100 border-gray-100'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                selectedAnswer === idx 
                  ? 'bg-white text-[var(--color-primary)]' 
                  : 'bg-white/50 text-gray-500 group-hover:bg-white'
              }`}>
                {String.fromCharCode(65 + idx)}
              </div>
              {option}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-12 flex justify-between items-center">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${
              currentIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            ย้อนกลับ
          </button>

          {currentIndex === quizData.questions.length - 1 ? (
            <button
              onClick={finishQuiz}
              className="px-10 py-3 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition-all shadow-lg active:scale-95"
            >
              ส่งคำตอบ
            </button>
          ) : (
            <button
              onClick={goToNext}
              className="px-10 py-3 bg-[var(--color-primary)] text-white rounded-full font-bold hover:brightness-110 transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              ข้อถัดไป
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          )}
        </div>

        <div className="mt-8 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[var(--color-primary)] transition-all duration-500" 
            style={{ width: `${((currentIndex + 1) / quizData.questions.length) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  if (currentStep === "result") {
    return (
      <div className="text-center p-12 bg-white rounded-[40px] border border-gray-100 shadow-2xl animate-fade-in max-w-2xl mx-auto">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">ทำ Quiz สำเร็จ!</h2>
        <p className="text-gray-400 mb-8 font-medium">คะแนนของคุณถูกบันทึกเรียบร้อยแล้ว</p>
        
        <div className="text-6xl font-black text-[var(--color-primary)] mb-10">
          {score}<span className="text-2xl text-gray-300"> / {quizData.questions.length}</span>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setCurrentStep("select")}
            className="px-8 py-3.5 bg-gray-100 text-gray-600 rounded-full font-bold hover:bg-gray-200 transition-all"
          >
            เลือกบทอื่น
          </button>
          <button
            onClick={startQuiz}
            className="px-8 py-3.5 bg-[var(--color-primary)] text-white rounded-full font-bold hover:brightness-110 shadow-lg transition-all"
          >
            ทำอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return null;
}
