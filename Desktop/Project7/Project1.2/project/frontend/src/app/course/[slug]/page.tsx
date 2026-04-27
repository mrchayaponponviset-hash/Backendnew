"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import courses_data from "@/data/courses.json";
import { apiService } from "@/services/api";
import { InlineAIChat } from "@/components/InlineAIChat";
import { useAuth } from "@/contexts/AuthContext";
import QuizView from "@/components/QuizView";
import FlashcardView from "@/components/FlashcardView";
import ExamView from "@/components/ExamView";

const tabs = ["Content", "Flashcards", "Quiz", "Exam"];

export default function CoursePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  // Find course and its year courses
  let course: any = null;
  let yearCourses: any[] = [];
  courses_data.years.forEach((y) => {
    const found = y.courses.find((c) => c.slug === slug);
    if (found) {
      course = found;
      yearCourses = y.courses;
    }
  });

  const [activeTab, setActiveTab] = useState("Content");
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isChatVisibleOnMobile, setIsChatVisibleOnMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const { user } = useAuth();
  const [lessons, setLessons] = useState<any[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(true);

  useEffect(() => {
    async function loadLessons() {
      try {
        const data = await apiService.getLessons();
        setLessons(data);
      } catch (err) {
        console.error("Failed to load lessons:", err);
      } finally {
        setLoadingLessons(false);
      }
    }
    loadLessons();
  }, []);

  // Fetch completed lessons when user is available
  useEffect(() => {
    async function loadProgress() {
      if (user?.uid) {
        try {
          const completedIds = await apiService.getUserProgress(user.uid);
          setCompletedLessonIds(completedIds);
        } catch (err) {
          console.error("Failed to load user progress:", err);
        }
      }
    }
    loadProgress();
  }, [user]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!course && typeof window !== "undefined") {
      router.push("/");
    }
  }, [course, router]);

  if (!course) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  const toggleAccordion = (idx: number) => {
    setActiveAccordion(activeAccordion === idx ? null : idx);
  };

  const handleCompleteLesson = async (lessonId: string) => {
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนบันทึกความก้าวหน้า");
      return;
    }
    try {
      await apiService.completeLesson(user.uid, lessonId);
      setCompletedLessonIds([...completedLessonIds, lessonId]);
    } catch (err) {
      console.error("Failed to complete lesson:", err);
    }
  };

  return (
    <>
      {/* 1. Center Content Column */}
      <section className="flex-1 bg-white rounded-[20px] md:rounded-[24px] lg:rounded-[32px] border border-[var(--color-gray-300)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden relative">
        {/* Fixed Header & Tabs */}
        <div className="px-6 md:px-8 lg:px-14 pt-5 md:pt-8 shrink-0 bg-white z-20">
          <div className="mb-4 md:mb-8">
            <div className="text-[9px] md:text-[10px] font-bold tracking-[0.2em] text-[var(--color-gray-400)] uppercase mb-2 md:mb-3">
              Course Module • {course.code}
            </div>
            <h1 className="text-xl md:text-2xl lg:text-4xl font-bold text-[var(--color-primary)] tracking-tight leading-[1.2]">
              {course.name_en}
            </h1>
          </div>
          <div className="border-t border-b border-[var(--color-gray-200)] flex w-full overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-6 md:px-12 py-4 md:py-5 text-sm md:text-lg font-bold transition-all relative whitespace-nowrap ${activeTab === tab
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-gray-400)] hover:text-[var(--color-primary)]'
                  }`}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-primary)] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 relative overflow-hidden pr-1 md:pr-3">
          {/* 🛡️ THE COVER TRICK */}
          <div className="absolute top-0 right-0 w-4 md:w-8 h-8 md:h-12 bg-white z-50 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-4 md:w-8 h-8 md:h-12 bg-white z-50 pointer-events-none" />

          <div className="h-full overflow-y-auto custom-scrollbar px-6 md:px-8 lg:px-14 pb-14 pt-4 md:pt-6">
            <div className="animate-fade-in-up">
              {activeTab === "Content" && (
                <div className="flex flex-col gap-3 md:gap-4">
                  {course.topics.map((topic: string, idx: number) => {
                    const isOpen = activeAccordion === idx;
                    const matchingLesson = lessons.find(l => l.title === topic);
                    const isCompleted = matchingLesson ? completedLessonIds.includes(matchingLesson.id) : false;
                    return (
                      <div
                        key={idx}
                        className={`border rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? "border-[var(--color-gray-300)] shadow-sm" : "border-[var(--color-gray-100)] hover:border-[var(--color-gray-200)] bg-[var(--color-gray-50)]/30"
                          }`}
                      >
                        <button
                          onClick={() => toggleAccordion(idx)}
                          className={`flex items-center justify-between w-full px-4 md:px-6 py-3.5 md:py-5 text-left transition-colors ${isOpen ? 'bg-white' : ''}`}
                        >
                          <div className="flex items-center gap-3 md:gap-4">
                            <span className={`text-[14px] md:text-[15px] transition-colors ${isOpen ? "text-[var(--color-primary)] font-bold" : "text-[var(--color-gray-700)] font-normal"}`}>
                              <span className={`mr-2 md:mr-3 font-mono text-[12px] md:text-[14px] transition-colors ${isOpen ? "text-[var(--color-primary)]" : "text-[var(--color-gray-400)]"}`}>{idx + 1}</span>
                              {topic}
                            </span>
                          </div>
                          <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            className={`transition-colors transform duration-300 ${isOpen ? "rotate-180 text-[var(--color-primary)]" : "text-[var(--color-gray-300)]"}`}
                          >
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                        <div className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] bg-white ${isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                          }`}>
                          <div className="px-4 md:px-6 pb-6 md:pb-8 pt-1 md:pt-2">
                              {matchingLesson ? (
                                <div className="text-[13.5px] md:text-[14.5px] text-[var(--color-gray-600)] leading-[1.8] mb-6 whitespace-pre-wrap">
                                  {matchingLesson.content}
                                </div>
                              ) : (
                                <div className="text-[13px] md:text-[14px] text-gray-400 italic mb-6">
                                  ยังไม่มีเนื้อหาสำหรับบทเรียนนี้
                                </div>
                              )}
                              
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  if (matchingLesson) handleCompleteLesson(matchingLesson.id);
                                  else alert("ไม่พบข้อมูลบทเรียนในระบบ Supabase");
                                }}
                                disabled={isCompleted}
                                className={`px-6 md:px-8 py-2 md:py-2.5 rounded-full font-black text-[12px] md:text-[13px] transition-all shadow-md ${
                                  isCompleted
                                    ? "bg-[var(--color-gray-200)] text-[var(--color-gray-500)] cursor-not-allowed shadow-none"
                                    : "bg-green-500 border-green-500 text-white hover:bg-green-600"
                                }`}
                              >
                                {isCompleted ? "✓ เรียนจบแล้ว" : "Mark as Complete"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                  })}
                </div>
              )}

              {activeTab === "Flashcards" && (
                <FlashcardView 
                  userId={user?.uid} 
                  lessons={lessons.filter(l => completedLessonIds.includes(l.id))} 
                />
              )}

              {activeTab === "Quiz" && (
                <QuizView 
                  userId={user?.uid} 
                  lessons={lessons.filter(l => completedLessonIds.includes(l.id))} 
                />
              )}

              {activeTab === "Exam" && (
                <ExamView 
                  userId={user?.uid} 
                  lessons={lessons} 
                  courseName={course.name_en}
                />
              )}
            </div>
          </div>
        </div>

        {/* Floating AI Button for Mobile */}
        <button 
          onClick={() => setIsChatVisibleOnMobile(true)}
          className="md:hidden fixed bottom-8 right-8 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-xl flex items-center justify-center z-50 animate-bounce"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </button>
      </section>

      {/* 2. Right Sidebar Box (AI Chatbox) */}
      {/* Mobile Drawer Backdrop */}
      {isChatVisibleOnMobile && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] md:hidden"
          onClick={() => setIsChatVisibleOnMobile(false)}
        />
      )}

      {/* ปรับความกว้าง AI Chat ให้ยืดหยุ่นขึ้นตามขนาดหน้าจอ (Flexible Width) */}
      <aside className={`
        group fixed md:relative top-4 md:top-0 right-4 md:right-0 bottom-4 md:bottom-0 z-[110] md:z-20
        ${isChatVisibleOnMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${isChatExpanded ? 'w-[calc(100%-32px)] md:w-[50%]' : 'w-[calc(100%-32px)] md:w-[280px] lg:w-[320px] xl:w-[380px]'} 
        shrink-0 transition-all duration-400 ease-in-out flex flex-col bg-white rounded-[24px] md:rounded-[32px] border border-[var(--color-gray-300)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)]
      `}>
        {/* Toggle Expand Button (Desktop only) */}
        <button
          onClick={() => setIsChatExpanded(!isChatExpanded)}
          className="hidden md:flex absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-7 h-7 items-center justify-center bg-white border border-[var(--color-gray-200)] rounded-full shadow-sm text-[var(--color-gray-500)] hover:text-[var(--color-black)] z-40 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-105 cursor-pointer"
          title={isChatExpanded ? "Collapse Chat" : "Expand Chat"}
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            className={`transform transition-transform duration-500 ${isChatExpanded ? '' : 'rotate-180'}`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Close Button (Mobile only) */}
        <button 
          onClick={() => setIsChatVisibleOnMobile(false)}
          className="md:hidden absolute top-4 right-4 p-2 text-[var(--color-gray-400)] hover:text-black z-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="w-full h-full overflow-hidden rounded-[24px] md:rounded-[32px] flex flex-col">
          <InlineAIChat
            courseName={course.name_en}
            initialTopic={course.topics_en ? course.topics_en[0] : course.topics[0]}
          />
        </div>
      </aside>
    </>
  );
}
