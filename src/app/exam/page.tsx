"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import {
  Clock, AlertTriangle, CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Terminal, Menu, User, Shield, Info, RotateCcw, Box, RefreshCw,
  Play, ChevronDown, ChevronUp, X as XIcon, ListChecks
} from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Section = "mcq" | "coding";
type Language = "python" | "java" | "cpp" | "javascript";

const LANGUAGE_STUBS: Record<Language, string> = {
  python: `# Write your Python solution here\ndef solution():\n    pass\n`,
  java: `// Write your Java solution here\nimport java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n`,
  cpp: `// Write your C++ solution here\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n`,
  javascript: `// Write your JavaScript solution here\nfunction solution() {\n    \n}\n`,
};

export default function ExamPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [token, setToken] = useState<string>("");

  const [section, setSection] = useState<Section>("mcq");
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<any[]>([]);
  const [currentMCQ, setCurrentMCQ] = useState(0);
  const [currentCoding, setCurrentCoding] = useState(0);

  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string[]>>({});
  const [codingAnswers, setCodingAnswers] = useState<Record<string, { code: string; language: Language }>>({});
  const [selectedLang, setSelectedLang] = useState<Language>("python");

  const [runOutput, setRunOutput] = useState<{ stdout: string; stderr: string; exit_code: number; question_id: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [testCaseResults, setTestCaseResults] = useState<Record<string, Array<{ index: number; passed: boolean; stdout: string; stderr: string; expected: string }>>>({});
  const [runningTests, setRunningTests] = useState(false);
  const [outputMode, setOutputMode] = useState<"run" | "tests">("run");

  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [maxTabSwitches, setMaxTabSwitches] = useState(3);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const [examStartTime] = useState(Date.now());
  const autoSaveRef = useRef<NodeJS.Timeout>();

  const submitExam = useCallback(
    async (isAuto = false) => {
      if (submitting) return;
      setSubmitting(true);
      const tid = toast.loading(isAuto ? "Security Violation: Auto-submitting..." : "Encapsulating assessment data...");

      try {
        const t = sessionStorage.getItem("gobt_token") || token;
        const res = await fetch("/api/exam/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": t },
          body: JSON.stringify({
            mcq_answers: mcqAnswers,
            coding_answers: codingAnswers,
            is_auto_submitted: isAuto,
            mcq_time_taken: Math.round((Date.now() - examStartTime) / 1000),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          toast.error(errData.error || "Submission failed. Please try again.", { id: tid });
          setSubmitting(false);
          return;
        }

        sessionStorage.removeItem("gobt_token");
        sessionStorage.removeItem("gobt_user");
        sessionStorage.removeItem("gobt_exam");

        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }

        toast.success("Submission Finalized", { id: tid });
        router.push("/submitted");
      } catch {
        toast.error("Network Error. Please try submitting again.", { id: tid });
        setSubmitting(false);
      }
    },
    [submitting, token, mcqAnswers, codingAnswers, examStartTime, router]
  );

  useEffect(() => {
    // Stub Monaco workers to prevent CDN load failures
    (window as any).MonacoEnvironment = {
      getWorker: (_: string, label: string) => {
        const js = label === "css" || label === "scss" || label === "less"
          ? "self.onmessage=function(){};"
          : "self.onmessage=function(){};";
        return new Worker(URL.createObjectURL(new Blob([js], { type: "application/javascript" })));
      },
    };
  }, []);

  useEffect(() => {
    const t = sessionStorage.getItem("gobt_token");
    const u = sessionStorage.getItem("gobt_user");
    const e = sessionStorage.getItem("gobt_exam");

    if (!t || !u) { router.push("/"); return; }

    const parsedUser = JSON.parse(u);
    const parsedExam = e ? JSON.parse(e) : null;

    if (parsedUser.status === "submitted") { router.push("/submitted"); return; }

    setToken(t);
    setUser(parsedUser);
    setExam(parsedExam);
    
    // Unified Timeline
    const totalMinutes = (parsedExam?.mcq_duration_minutes || 20) + 
                         (parsedExam?.coding_duration_minutes || 60) + 
                         (parsedUser.extra_time_minutes || 0);
    
    setTimeLeft(totalMinutes * 60);
    setMaxTabSwitches(parsedExam?.max_tab_switches || 3);

    fetch("/api/exam/questions", { headers: { "x-user-id": t } })
      .then((r) => r.json())
      .then((d) => {
        setMcqQuestions(d.mcq || []);
        setCodingQuestions(d.coding || []);
        setLoading(false);
      })
      .catch(() => { toast.error("Hardware mismatch: Questions unavailable"); setLoading(false); });
  }, [router]);

  // Security Logic
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        const t = sessionStorage.getItem("gobt_token");
        if (!t) return;
        const res = await fetch("/api/exam/tab-switch", { method: "POST", headers: { "x-user-id": t } });
        const data = await res.json();
        setTabWarnings(data.count);
        if (data.should_submit) {
          setWarningMsg("Maximum violations reached. System locked.");
          setShowWarning(true);
          setTimeout(() => submitExam(true), 2000);
        } else {
          setWarningMsg(`Security Ping: Tab change logged. ${data.max - data.count} attempts left.`);
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 5000);
        }
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && ["c", "v", "a", "u", "s", "p"].includes(e.key.toLowerCase())) || e.key === "F12" || (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(e.key.toLowerCase())) || (e.metaKey && ["c", "v", "a"].includes(e.key.toLowerCase()))) {
        e.preventDefault(); e.stopPropagation();
      }
    };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [submitExam]);

  // Fullscreen Management
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setWarningMsg("Return to Fullscreen mode to continue assessment.");
        setShowWarning(true);
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Timer
  useEffect(() => {
    if (loading) return;
    const timer = setInterval(() => {
      setTimeLeft((p) => {
        if (p <= 1) { clearInterval(timer); submitExam(true); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, submitExam]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleMCQAnswer = (id: string, option: string, multi: boolean) => {
    setMcqAnswers((prev) => {
      const curr = prev[id] || [];
      if (multi) return { ...prev, [id]: curr.includes(option) ? curr.filter(o => o !== option) : [...curr, option] };
      return { ...prev, [id]: [option] };
    });
  };

  const handleCodeChange = (id: string, code: string) => {
    setCodingAnswers(p => ({ ...p, [id]: { code, language: selectedLang } }));
  };

  const handleRunCode = async (questionId: string, sampleInput: string) => {
    const t = sessionStorage.getItem("gobt_token") || token;
    const code = codingAnswers[questionId]?.code || LANGUAGE_STUBS[selectedLang];
    setRunning(true);
    setShowOutput(true);
    setRunOutput(null);
    setOutputMode("run");
    try {
      const res = await fetch("/api/exam/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": t },
        body: JSON.stringify({ code, language: selectedLang, stdin: sampleInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunOutput({ stdout: "", stderr: data.error || "Execution failed", exit_code: -1, question_id: questionId });
      } else {
        setRunOutput({ ...data, question_id: questionId });
      }
    } catch {
      setRunOutput({ stdout: "", stderr: "Network error — could not reach execution service", exit_code: -1, question_id: questionId });
    } finally {
      setRunning(false);
    }
  };

  const handleRunTestCases = async (questionId: string, testCases: Array<{ input: string; expected_output: string }>) => {
    if (!testCases.length) return;
    const t = sessionStorage.getItem("gobt_token") || token;
    const code = codingAnswers[questionId]?.code || LANGUAGE_STUBS[selectedLang];
    setRunningTests(true);
    setShowOutput(true);
    setOutputMode("tests");
    try {
      const res = await fetch("/api/exam/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": t },
        body: JSON.stringify({ code, language: selectedLang, test_cases: testCases }),
      });
      const data = await res.json();
      if (data.test_results) {
        setTestCaseResults(prev => ({ ...prev, [questionId]: data.test_results }));
      }
    } catch {
      toast.error("Could not run test cases");
    } finally {
      setRunningTests(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Initialising Secure Workspace...</p>
        </div>
      </div>
    );
  }

  const currentQ = mcqQuestions[currentMCQ];
  const currentCQ = codingQuestions[currentCoding];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-blue-100">
      <div className="watermark opacity-[0.015]">{user?.name}</div>

      {showWarning && (
        <div className="fixed top-0 left-0 right-0 z-[100] p-3 bg-rose-600 text-white shadow-xl animate-in slide-in-from-top-full duration-300">
          <div className="flex items-center justify-center gap-3">
             <Shield className="w-4 h-4 animate-pulse" />
             <p className="font-bold text-xs uppercase tracking-widest">{warningMsg}</p>
          </div>
        </div>
      )}

      {/* Modern High-Performance Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-200">
              <Box className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-slate-800 text-sm tracking-tight font-display">GOBT <span className="text-blue-600 font-black">UNIVERSE</span></span>
          </div>
          <div className="h-4 w-px bg-slate-200 mx-2"></div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
             {(["mcq", "coding"] as const).map(tab => (
               <button key={tab} onClick={() => setSection(tab)}
                 className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${section === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                 {tab === "mcq" ? "I: Analysis" : "II: Synthesis"}
               </button>
             ))}
          </div>
        </div>

        <div className="flex items-center gap-8">
           <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border tabular-nums ${timeLeft < 300 ? 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-900'}`}>
              <Clock className={`w-4 h-4 ${timeLeft < 300 ? 'text-rose-600' : 'text-slate-400'}`} />
              <span className="text-sm font-black tracking-tight">{formatTime(timeLeft)}</span>
           </div>
           <div className="flex items-center gap-4 text-slate-400">
              <div className="flex flex-col items-end">
                 <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Security</span>
                 <span className={`text-[11px] font-black ${tabWarnings > 1 ? 'text-rose-500' : 'text-slate-600'}`}>{tabWarnings} / {maxTabSwitches}</span>
              </div>
              <div className="w-px h-8 bg-slate-100"></div>
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-500" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-900 leading-none">{user?.name?.split(' ')[0]}</span>
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">Candidate</span>
                 </div>
              </div>
           </div>
           <button onClick={() => submitExam(false)} disabled={submitting} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-blue-700 shadow-md shadow-blue-100 transition-all flex items-center gap-2">
              {submitting ? 'Finalizing...' : 'Conclude Assessment'}
              <ChevronRight className="w-3.5 h-3.5" />
           </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Navigator Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col p-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
           {section === "mcq" ? (
             <>
               {/* MCQ Stats */}
               <div className="mb-5">
                 <div className="flex items-center justify-between mb-2">
                   <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Questions</h3>
                   <span className="text-[10px] font-bold text-slate-500">
                     <span className="text-emerald-600 font-black">{Object.keys(mcqAnswers).filter(k => mcqAnswers[k]?.length > 0).length}</span>
                     /{mcqQuestions.length} answered
                   </span>
                 </div>
                 {/* Progress bar */}
                 <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div
                     className="h-1.5 bg-emerald-500 rounded-full transition-all duration-500"
                     style={{ width: `${mcqQuestions.length ? (Object.keys(mcqAnswers).filter(k => mcqAnswers[k]?.length > 0).length / mcqQuestions.length) * 100 : 0}%` }}
                   />
                 </div>
               </div>

               {/* Question Grid */}
               <div className="flex-1 overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-5 gap-1.5">
                   {mcqQuestions.map((q, i) => {
                     const isAnswered = (mcqAnswers[q.id] || []).length > 0;
                     const isCurrent = i === currentMCQ;
                     return (
                       <button
                         key={i}
                         onClick={() => setCurrentMCQ(i)}
                         title={`Question ${i + 1}${isAnswered ? " (answered)" : ""}`}
                         className={`relative h-9 rounded-lg text-xs font-bold transition-all ${
                           isCurrent
                             ? "bg-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-blue-300 ring-offset-1"
                             : isAnswered
                             ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                             : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                         }`}
                       >
                         {i + 1}
                         {isAnswered && !isCurrent && (
                           <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                         )}
                       </button>
                     );
                   })}
                 </div>

                 {/* Legend */}
                 <div className="mt-4 space-y-1.5">
                   {[
                     { color: "bg-blue-600", label: "Current" },
                     { color: "bg-emerald-100 border border-emerald-200", label: "Answered" },
                     { color: "bg-slate-100", label: "Not answered" },
                   ].map((item) => (
                     <div key={item.label} className="flex items-center gap-2">
                       <span className={`w-3 h-3 rounded flex-shrink-0 ${item.color}`} />
                       <span className="text-[10px] text-slate-400 font-medium">{item.label}</span>
                     </div>
                   ))}
                 </div>
               </div>

               {/* Bottom info */}
               <div className="mt-4 pt-4 border-t border-slate-100">
                 <p className="text-[10px] text-slate-400 leading-relaxed">
                   Your answers are saved automatically as you select them.
                 </p>
               </div>
             </>
           ) : (
             <>
               <div className="mb-5">
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Problems</h3>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                 {codingQuestions.map((q, i) => (
                   <button key={i} onClick={() => setCurrentCoding(i)}
                     className={`w-full text-left px-4 py-3.5 rounded-xl transition-all border ${
                       i === currentCoding ? "bg-blue-50 border-blue-200 shadow-sm" :
                       codingAnswers[q.id]?.code ? "border-emerald-100 bg-emerald-50/30" :
                       "border-transparent hover:bg-slate-50"
                     }`}>
                     <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${i === currentCoding ? "text-blue-500" : "text-slate-400"}`}>Problem {i + 1}</p>
                     <p className={`text-xs font-semibold line-clamp-1 ${i === currentCoding ? "text-blue-700" : "text-slate-600"}`}>{q.title}</p>
                   </button>
                 ))}
               </div>
               <div className="mt-4 pt-4 border-t border-slate-100">
                 <p className="text-[10px] text-slate-400 leading-relaxed">Code is auto-saved as you type.</p>
               </div>
             </>
           )}
        </aside>

        {/* Content Canvas */}
        <div className="flex-1 bg-slate-50/50 relative overflow-hidden flex flex-col">
           {section === "mcq" ? (
             <div className="flex-1 overflow-y-auto p-12">
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="flex items-center justify-between mb-10">
                      <div className="flex items-center gap-4">
                         <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-blue-200">Question {currentMCQ + 1}</span>
                         <div className="flex gap-2">
                           <span className="px-2 py-0.5 border border-slate-200 text-slate-400 text-[9px] font-bold uppercase rounded">{currentQ?.topic}</span>
                           <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase rounded ${currentQ?.difficulty === 'easy' ? 'border-emerald-100 text-emerald-600' : currentQ?.difficulty === 'medium' ? 'border-amber-100 text-amber-600' : 'border-rose-100 text-rose-600'}`}>{currentQ?.difficulty}</span>
                         </div>
                      </div>
                      <div className="text-blue-600 font-bold text-sm tracking-tight">{currentQ?.marks} POINTS</div>
                   </div>

                   <div className="bg-white border border-slate-200 rounded-[2rem] p-10 shadow-sm mb-10">
                      <p className="text-slate-900 text-2xl font-bold leading-snug tracking-tight font-display">{currentQ?.question}</p>
                      {currentQ?.is_multi_select && (
                        <div className="mt-6 flex items-center gap-2 bg-blue-50/50 border border-blue-100 p-3 rounded-xl">
                           <Shield className="w-4 h-4 text-blue-600" />
                           <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Multiple answers required</span>
                        </div>
                      )}
                   </div>

                   <div className="grid gap-4 pb-28">
                      {(currentQ?.options as string[])?.map((option, idx) => {
                        const sel = (mcqAnswers[currentQ.id] || []).includes(option);
                        return (
                          <button key={idx} onClick={() => handleMCQAnswer(currentQ.id, option, currentQ.is_multi_select)}
                            className={`group w-full text-left p-6 rounded-3xl border-2 transition-all flex items-center gap-6 ${sel ? 'border-blue-600 bg-white shadow-lg' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all flex-shrink-0 ${sel ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                                {String.fromCharCode(65 + idx)}
                             </div>
                             <span className={`text-base font-semibold ${sel ? 'text-slate-900' : 'text-slate-500'}`}>{option}</span>
                             {sel && <div className="ml-auto w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0"><CheckCircle className="text-white w-4 h-4" /></div>}
                          </button>
                        );
                      })}
                   </div>
                </div>
             </div>
           ) : (
             <div className="flex-1 flex overflow-hidden">
                {/* Coding Prompt */}
                <div className="w-[450px] bg-white border-r border-slate-200 flex flex-col shadow-inner">
                   <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                      <div className="flex items-center gap-2 mb-6 uppercase text-[9px] font-black text-slate-400 tracking-widest">
                         <Terminal className="text-blue-600 w-3.5 h-3.5" /> Logical Abstraction
                      </div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-6 font-display leading-tight">{currentCQ?.title}</h2>
                      <div className="space-y-8">
                         <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{currentCQ?.description}</p>
                         </div>
                         
                         {currentCQ?.constraints && (
                           <div className="space-y-3">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-l-2 border-blue-600 pl-3">Specifications</h4>
                              <p className="text-xs text-slate-500 leading-relaxed font-mono bg-slate-50 p-3 rounded-xl border border-slate-100">{currentCQ.constraints}</p>
                           </div>
                         )}

                         <div className="grid gap-3">
                            <div className="space-y-2">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Example In</p>
                               <pre className="text-slate-800 bg-slate-100/50 p-4 rounded-2xl font-mono text-xs border border-slate-200/50">{currentCQ?.sample_input}</pre>
                            </div>
                            <div className="space-y-2">
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Example Out</p>
                               <pre className="text-slate-800 bg-slate-100/50 p-4 rounded-2xl font-mono text-xs border border-slate-200/50">{currentCQ?.sample_output}</pre>
                            </div>
                         </div>
                      </div>
                   </div>
                   <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <span>Variant {user?.coding_set_number}</span>
                      <div className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-emerald-500" /> Secure Node</div>
                   </div>
                </div>

                {/* Editor Surface */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden">
                   <div className="h-14 bg-slate-900 flex items-center justify-between px-6 flex-shrink-0">
                      <div className="flex items-center gap-4">
                         <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                            {(["python", "java", "cpp", "javascript"] as Language[]).map(lang => (
                              <button key={lang} onClick={() => {
                                setSelectedLang(lang);
                                if (!codingAnswers[currentCQ.id]?.code) handleCodeChange(currentCQ.id, LANGUAGE_STUBS[lang]);
                              }} className={`px-4 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all ${selectedLang === lang ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>
                                {lang}
                              </button>
                            ))}
                         </div>
                      </div>
                      <div className="flex gap-3 items-center">
                         <button
                           onClick={() => handleRunCode(currentCQ.id, currentCQ.sample_input || "")}
                           disabled={running || runningTests}
                           title="Run code with sample input"
                           className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-500/30">
                           {running ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                           {running ? "Running..." : "Run Code"}
                         </button>
                         {(currentCQ.test_cases?.length > 0) && (
                           <button
                             onClick={() => handleRunTestCases(currentCQ.id, currentCQ.test_cases)}
                             disabled={running || runningTests}
                             title="Run all test cases"
                             className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-wider transition-all shadow-md shadow-blue-500/30">
                             {runningTests ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ListChecks className="w-3.5 h-3.5" />}
                             {runningTests ? "Testing..." : `Run Tests (${currentCQ.test_cases.length})`}
                           </button>
                         )}
                         <button onClick={() => handleCodeChange(currentCQ.id, LANGUAGE_STUBS[selectedLang])} title="Reset to template" className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"><RotateCcw className="w-4 h-4" /></button>
                      </div>
                   </div>

                   {/* Editor + Output Panel */}
                   <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                     <div className="flex-1 relative overflow-hidden min-h-0">
                       <MonacoEditor
                         height="100%"
                         language={selectedLang === "cpp" ? "cpp" : selectedLang}
                         theme="vs"
                         value={codingAnswers[currentCQ.id]?.code || LANGUAGE_STUBS[selectedLang]}
                         onChange={(v) => handleCodeChange(currentCQ.id, v || "")}
                         options={{
                           fontSize: 15,
                           fontFamily: "JetBrains Mono, Menlo, Courier New",
                           minimap: { enabled: false },
                           automaticLayout: true,
                           lineNumbers: "on",
                           renderLineHighlight: "all",
                           scrollbar: { verticalScrollbarSize: 8 },
                           padding: { top: 20 },
                         }}
                       />
                       {!showOutput && (
                         <div className="absolute bottom-6 right-6 flex gap-3">
                           <div className="h-10 px-4 flex items-center bg-white border border-slate-200 rounded-xl shadow-lg">
                             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                               <RefreshCw className="w-3 h-3 animate-spin text-blue-600" /> Workspace Synced
                             </span>
                           </div>
                         </div>
                       )}
                     </div>

                     {/* Output Panel */}
                     {showOutput && (
                       <div className="h-56 flex-shrink-0 border-t-2 border-slate-200 bg-slate-900 flex flex-col">
                         <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 flex-shrink-0">
                           <div className="flex items-center gap-3">
                             <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                             {/* Mode tabs */}
                             <div className="flex bg-white/5 rounded p-0.5">
                               <button onClick={() => setOutputMode("run")} className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${outputMode === "run" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}>Output</button>
                               <button onClick={() => setOutputMode("tests")} className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${outputMode === "tests" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"}`}>Test Cases</button>
                             </div>
                             {outputMode === "run" && runOutput && !running && (
                               <>
                                 <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${runOutput.exit_code === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                   {runOutput.exit_code === 0 ? 'Success' : `Exit ${runOutput.exit_code}`}
                                 </span>
                                 {currentCQ.sample_output && (
                                   <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${runOutput.stdout.trim() === currentCQ.sample_output.trim() ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                     {runOutput.stdout.trim() === currentCQ.sample_output.trim() ? 'Matches Expected' : 'Output Differs'}
                                   </span>
                                 )}
                               </>
                             )}
                             {outputMode === "tests" && testCaseResults[currentCQ.id] && !runningTests && (() => {
                               const results = testCaseResults[currentCQ.id];
                               const passed = results.filter(r => r.passed).length;
                               return (
                                 <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${passed === results.length ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                   {passed}/{results.length} Passed
                                 </span>
                               );
                             })()}
                           </div>
                           <button onClick={() => setShowOutput(false)} className="p-1 rounded text-slate-500 hover:text-white transition-colors">
                             <XIcon className="w-3.5 h-3.5" />
                           </button>
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
                           {outputMode === "run" ? (
                             running ? (
                               <div className="flex items-center gap-2 text-slate-400">
                                 <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                                 <span>Executing code...</span>
                               </div>
                             ) : runOutput ? (
                               <div className="space-y-3">
                                 {runOutput.stdout && (
                                   <div>
                                     <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">stdout</p>
                                     <pre className="text-emerald-300 whitespace-pre-wrap">{runOutput.stdout}</pre>
                                   </div>
                                 )}
                                 {runOutput.stderr && (
                                   <div>
                                     <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">stderr</p>
                                     <pre className="text-red-400 whitespace-pre-wrap">{runOutput.stderr}</pre>
                                   </div>
                                 )}
                                 {!runOutput.stdout && !runOutput.stderr && (
                                   <span className="text-slate-500">(no output)</span>
                                 )}
                               </div>
                             ) : null
                           ) : (
                             runningTests ? (
                               <div className="flex items-center gap-2 text-slate-400">
                                 <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                                 <span>Running test cases...</span>
                               </div>
                             ) : testCaseResults[currentCQ.id] ? (
                               <div className="space-y-2">
                                 {testCaseResults[currentCQ.id].map((result, i) => (
                                   <div key={i} className={`p-2 rounded-lg border ${result.passed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                                     <div className="flex items-center gap-2">
                                       {result.passed
                                         ? <CheckCircle className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                         : <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />}
                                       <span className={`text-[9px] font-bold uppercase ${result.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                                         Test {i + 1}: {result.passed ? 'PASSED' : 'FAILED'}
                                       </span>
                                     </div>
                                     {!result.passed && (
                                       <div className="mt-1 pl-5 space-y-0.5">
                                         {result.stdout && <pre className="text-[9px] text-slate-300">Got: {result.stdout.trim()}</pre>}
                                         <pre className="text-[9px] text-slate-500">Expected: {result.expected.trim()}</pre>
                                         {result.stderr && <pre className="text-[9px] text-red-400">{result.stderr.trim()}</pre>}
                                       </div>
                                     )}
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <span className="text-slate-500">Click &quot;Run Tests&quot; to evaluate your code against test cases</span>
                             )
                           )}
                         </div>
                       </div>
                     )}
                   </div>
                </div>
             </div>
           )}
        </div>
      </main>

      {/* Fixed Bottom Navigation — MCQ only */}
      {section === "mcq" && !loading && (
        <div className="fixed bottom-0 left-64 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="px-8 py-3.5 flex items-center justify-between max-w-5xl mx-auto">
            {/* Previous */}
            <button
              onClick={() => setCurrentMCQ(m => Math.max(0, m - 1))}
              disabled={currentMCQ === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-semibold text-sm hover:bg-slate-50 hover:text-slate-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {/* Center: counter + mini dots */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-sm font-bold text-slate-700 tabular-nums">
                Question <span className="text-blue-600">{currentMCQ + 1}</span> of {mcqQuestions.length}
              </span>
              {/* Dot progress — show at most 15 dots, rest collapsed */}
              <div className="flex items-center gap-1">
                {mcqQuestions.slice(0, Math.min(mcqQuestions.length, 20)).map((q, i) => {
                  const isAnswered = (mcqAnswers[q.id] || []).length > 0;
                  const isCurrent = i === currentMCQ;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentMCQ(i)}
                      className={`rounded-full transition-all ${
                        isCurrent ? "w-5 h-2 bg-blue-600" :
                        isAnswered ? "w-2 h-2 bg-emerald-400" :
                        "w-2 h-2 bg-slate-200"
                      }`}
                    />
                  );
                })}
                {mcqQuestions.length > 20 && (
                  <span className="text-[10px] text-slate-400 font-bold ml-1">+{mcqQuestions.length - 20}</span>
                )}
              </div>
            </div>

            {/* Next / Go to Coding */}
            <button
              onClick={() => currentMCQ < mcqQuestions.length - 1 ? setCurrentMCQ(m => m + 1) : setSection("coding")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                currentMCQ < mcqQuestions.length - 1
                  ? "bg-slate-900 hover:bg-slate-700 text-white shadow-md"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25"
              }`}
            >
              {currentMCQ < mcqQuestions.length - 1 ? "Next" : "Go to Coding"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
}


