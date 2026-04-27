"use client";

import { useState } from "react";
import { apiService } from "@/services/api";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ExamViewProps {
  userId?: string;
  lessons: any[];
  courseName?: string;
}

export default function ExamView({ userId, lessons, courseName }: ExamViewProps) {
  const [examData, setExamData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"start" | "exam" | "result">("start");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<any>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const startExam = async () => {
    if (lessons.length === 0) {
      alert("กรุณาเพิ่มบทเรียนในระบบก่อนเริ่มสอบ");
      return;
    }
    setLoading(true);
    try {
      const chapterTitles = lessons.map(l => l.title);
      const data = await apiService.generateExam(chapterTitles);
      setExamData(data);
      setCurrentStep("exam");
      setCurrentIndex(0);
      setAnswers(new Array(data.questions.length).fill(null));
    } catch (error) {
      console.error("Exam generation failed:", error);
      alert("เกิดข้อผิดพลาดในการสร้างข้อสอบจำลอง กรุณาลองใหม่อีกครั้ง");
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
    if (currentIndex < examData.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const finishExam = async () => {
    // Check if all answered
    if (answers.includes(null)) {
      if (!confirm("คุณยังทำข้อสอบไม่ครบทุกข้อ ยืนยันที่จะส่งข้อสอบหรือไม่?")) return;
    }

    setLoading(true);
    let score = 0;
    const radarData: any = {
      Remember: 0, Understand: 0, Apply: 0, Analyze: 0, Evaluate: 0, Create: 0
    };
    const totalPerDomain: any = {
      Remember: 0, Understand: 0, Apply: 0, Analyze: 0, Evaluate: 0, Create: 0
    };
    
    // Track scores per chapter
    const chapterStats: any = {};

    examData.questions.forEach((q: any, i: number) => {
      const domain = q.domain || "Remember";
      const chapter = q.chapterTitle || "General";
      
      if (!chapterStats[chapter]) {
        chapterStats[chapter] = { correct: 0, total: 0 };
      }
      
      totalPerDomain[domain]++;
      chapterStats[chapter].total++;
      
      if (q.correctIndex === answers[i]) {
        score++;
        radarData[domain]++;
        chapterStats[chapter].correct++;
      }
    });

    // Prepare Radar Data for Chart
    const chartData = Object.keys(radarData).map(key => ({
      subject: key,
      A: (radarData[key] / (totalPerDomain[key] || 1)) * 100,
      fullMark: 100
    }));

    try {
      // Get AI Recommendation
      const summaryData = await apiService.generatePdfSummary({
        quizScores: chapterStats, // Send chapter performance
        examResults: { score, total: examData.questions.length },
        radarScores: chartData
      });

      const finalResult = {
        score,
        total: examData.questions.length,
        chartData,
        chapterStats,
        recommendation: summaryData.summary
      };

      setResult(finalResult);
      setCurrentStep("result");

      // Save to Supabase
      if (userId) {
        apiService.saveExamResult({
          userId,
          totalScore: score,
          totalQuestions: examData.questions.length,
          categoryScores: chartData,
          recommendation: summaryData.summary
        });
      }
    } catch (err) {
      console.error("Failed to finish exam:", err);
      alert("เกิดข้อผิดพลาดในการประมวลผลสรุปคะแนน");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    const element = document.getElementById("result-container");
    if (!element) {
      alert("ไม่พบข้อมูลสำหรับการสร้าง PDF");
      return;
    }

    setGeneratingPdf(true);
    try {
      // Small delay to ensure Recharts animation is finished
      await new Promise(resolve => setTimeout(resolve, 800));

      // Use html-to-image instead of html2canvas for better modern CSS support
      const dataUrl = await toPng(element, { 
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2 // High resolution
      });
      
      const pdf = new jsPDF("p", "mm", "a4");
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgWidth = pdfWidth - 20; // 10mm margin each side
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 10; // Top margin

      pdf.addImage(dataUrl, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(dataUrl, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      const cleanCourseName = courseName ? courseName.replace(/[^a-zA-Z0-9_-]/g, '-') : 'Course';
      const fileName = `${cleanCourseName}-Exam-Report-${new Date().getTime()}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("PDF Export Detailed Error:", error);
      alert(`ไม่สามารถสร้าง PDF ได้: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (currentStep === "start") {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-900 rounded-[40px] text-white overflow-hidden relative shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 pointer-events-none" />
        <h2 className="text-4xl font-black mb-4">Final Exam</h2>
        <p className="text-gray-400 mb-10 text-center max-w-sm">แบบทดสอบรวมทุกบทเรียน จำนวน 20 ข้อ เพื่อวัดผลสัมฤทธิ์ทางการเรียน</p>
        <button
          onClick={startExam}
          disabled={loading}
          className="px-12 py-5 bg-white text-black rounded-full font-black text-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]"
        >
          {loading ? "กำลังสร้างข้อสอบ..." : "เริ่มทำการสอบ"}
        </button>
      </div>
    );
  }

  if (currentStep === "exam") {
    const q = examData.questions[currentIndex];
    const selectedAnswer = answers[currentIndex];

    return (
      <div className="w-full max-w-4xl mx-auto p-10 bg-white rounded-[40px] shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <span className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-full font-bold text-xs">
            EXAM QUESTION {currentIndex + 1} / {examData.questions.length}
          </span>
          <span className="text-[var(--color-primary)] font-bold text-xs uppercase tracking-widest">{q.chapterTitle}</span>
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-12">{q.question}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {q.options.map((opt: string, i: number) => (
            <button
              key={i}
              onClick={() => handleSelectAnswer(i)}
              className={`p-6 text-left border-2 rounded-3xl transition-all font-bold flex items-center gap-4 ${
                selectedAnswer === i 
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-lg' 
                  : 'border-gray-50 bg-gray-50/50 text-gray-700 hover:border-[var(--color-primary)] hover:bg-white'
              }`}
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                selectedAnswer === i 
                  ? 'bg-white text-[var(--color-primary)] border-white' 
                  : 'bg-white text-[var(--color-primary)] border-gray-100'
              }`}>
                {String.fromCharCode(65+i)}
              </span>
              {opt}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-12 flex justify-between items-center border-t border-gray-100 pt-8">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className={`px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all ${
              currentIndex === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            ย้อนกลับ
          </button>

          {currentIndex === examData.questions.length - 1 ? (
            <button
              onClick={finishExam}
              disabled={loading}
              className="px-12 py-3 bg-gray-900 text-white rounded-full font-black text-lg hover:bg-black transition-all shadow-xl active:scale-95"
            >
              {loading ? "กำลังประมวลผล..." : "ส่งข้อสอบ"}
            </button>
          ) : (
            <button
              onClick={goToNext}
              className="px-12 py-3 bg-[var(--color-primary)] text-white rounded-full font-black text-lg hover:brightness-110 transition-all shadow-xl active:scale-95 flex items-center gap-2"
            >
              ข้อถัดไป
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (currentStep === "result") {
    const overallPercentage = (result.score / result.total) * 100;

    return (
      <div className="w-full max-w-6xl mx-auto pb-20 animate-fade-in">
        <div id="result-container" className="bg-white p-8 md:p-12 rounded-[40px] border border-gray-100 shadow-2xl space-y-12 pdf-compat">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-gray-900 mb-2">Final Exam Results</h1>
              {courseName && <p className="text-xl font-bold text-[var(--color-primary)] mb-2">{courseName}</p>}
              <p className="text-gray-400 font-bold">{new Date().toLocaleDateString('th-TH', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Scores & Chapters */}
            <div className="lg:col-span-5 space-y-10">
              {/* Circular Overall Score */}
              <div className="bg-gray-50/50 p-8 rounded-[32px] border border-gray-100 flex items-center gap-10">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-gray-200" />
                    <circle 
                      cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="10" fill="transparent" 
                      strokeDasharray={364}
                      strokeDashoffset={364 - (364 * overallPercentage) / 100}
                      className="text-[var(--color-primary)] transition-all duration-1000" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-gray-900">{result.score}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase">/ {result.total}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-800 mb-1">Overall Score</h3>
                  <p className="text-sm font-medium text-gray-500">คุณทำคะแนนได้ {overallPercentage.toFixed(0)}% จากข้อสอบทั้งหมด</p>
                </div>
              </div>

              {/* Chapter Breakdown */}
              <div className="space-y-6">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Chapter Performance</h3>
                <div className="space-y-4">
                  {Object.entries(result.chapterStats).map(([name, stats]: [string, any], idx) => {
                    const percent = (stats.correct / stats.total) * 100;
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-end">
                          <div className="max-w-[70%]">
                            <p className="text-sm font-bold text-gray-700 truncate">{name}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{stats.total} Questions</p>
                          </div>
                          <p className="text-sm font-black text-gray-900">{stats.correct}/{stats.total}</p>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${percent < 60 ? 'bg-amber-400' : 'bg-gray-900'}`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        {percent < 60 && (
                          <div className="mt-2 p-3 bg-amber-50 rounded-xl flex items-center gap-3 border border-amber-100">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                             <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Improvement Needed: Focus on this topic</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Radar Chart */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-gray-50">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-10">Data Analysis: Cognitive Skills</h3>
              <div className="w-full h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={result.chartData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Performance"
                      dataKey="A"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary)"
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="pt-12 border-t border-gray-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <h3 className="text-2xl font-black text-gray-900">AI Personal Recommendation</h3>
            </div>
            <div className="bg-gray-50 p-8 md:p-12 rounded-[32px]">
              <div className="markdown-prose text-gray-700 font-medium leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.recommendation}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Download Button (Not part of capture) */}
        <div className="mt-10 flex justify-center">
          <button
            onClick={downloadPdf}
            disabled={generatingPdf}
            className="w-full max-w-2xl py-5 bg-black text-white rounded-2xl font-black text-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-4 shadow-2xl"
          >
            {generatingPdf ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                กำลังเตรียมไฟล์สรุปผล...
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download Course Summary (PDF)
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

