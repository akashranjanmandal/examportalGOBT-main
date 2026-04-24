"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Clock, Monitor, Lock, AlertCircle, Timer, Lightbulb,
  Wifi, ShieldOff, Code2, FileText, Play, CheckCircle2, ArrowRight
} from "lucide-react";

const RULES = [
  { icon: Monitor, title: "Desktop Only", desc: "Use a desktop or laptop with Google Chrome. Mobile devices are not supported.", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
  { icon: Lock, title: "Fullscreen Mode", desc: "The exam runs in fullscreen. Exiting fullscreen will trigger a warning.", color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
  { icon: AlertCircle, title: "No Tab Switching", desc: "Switching tabs or windows is monitored. Repeated violations will auto-submit your exam.", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
  { icon: ShieldOff, title: "No Copy / Paste", desc: "Copy, paste, right-click, and text selection are disabled during the entire exam.", color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
  { icon: Timer, title: "Auto-Submit", desc: "The exam auto-submits when the timer expires. Ensure your work is saved before time runs out.", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  { icon: Lightbulb, title: "Unique Questions", desc: "Each candidate receives a unique shuffled question set. Sharing answers is strictly prohibited.", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" },
  { icon: Wifi, title: "Internet Required", desc: "A stable internet connection is required. Progress is auto-saved every 30 seconds.", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  { icon: ShieldOff, title: "No AI Tools", desc: "External resources, AI assistants, IDE autocomplete, or communication apps are strictly prohibited.", color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
];

export default function InstructionsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [agreed, setAgreed] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("gobt_token");
    const u = sessionStorage.getItem("gobt_user");
    const e = sessionStorage.getItem("gobt_exam");
    if (!token || !u) { router.push("/"); return; }
    setUser(JSON.parse(u));
    if (e) setExam(JSON.parse(e));
  }, [router]);

  const handleStartExam = async () => {
    if (!agreed) { toast.error("Please agree to the exam rules before proceeding"); return; }
    setStarting(true);
    try {
      const token = sessionStorage.getItem("gobt_token");
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "x-user-id": token || "" },
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return; }
      try { await document.documentElement.requestFullscreen(); } catch { toast("Fullscreen recommended", { icon: "ℹ️" }); }
      router.push("/exam");
    } catch {
      toast.error("Failed to start exam");
    } finally {
      setStarting(false);
    }
  };

  if (!user) return null;

  const mcqMins = exam?.mcq_duration_minutes || 20;
  const codingMins = exam?.coding_duration_minutes || 60;
  const totalMins = mcqMins + codingMins;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-600/20">
              <span className="text-white text-sm font-black">G</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">GOBT Developer Program</span>
          </div>
          <div className="text-right">
            <p className="text-gray-800 font-semibold text-sm leading-none">{user.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">{user.email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Exam Instructions</h1>
          <p className="text-gray-500 text-sm mt-1">Read all instructions carefully before starting your assessment.</p>
        </div>

        {/* Exam Overview Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: Clock, label: "Total Duration", value: `${totalMins} minutes`, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
            { icon: FileText, label: "MCQ Section", value: `${mcqMins} min · 30 Questions`, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
            { icon: Code2, label: "Coding Section", value: `${codingMins} min · 3 Problems`, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
          ].map((item, i) => (
            <div key={i} className={`bg-white border ${item.border} rounded-xl p-5 flex items-start gap-4`}>
              <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-sm">{item.value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rules */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="text-gray-900 font-bold text-base mb-5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Exam Rules & Guidelines
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {RULES.map((rule, i) => (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100`}>
                <div className={`w-8 h-8 rounded-lg ${rule.bg} border ${rule.border} flex items-center justify-center flex-shrink-0`}>
                  <rule.icon className={`w-4 h-4 ${rule.color}`} />
                </div>
                <div>
                  <p className="text-gray-800 font-semibold text-sm">{rule.title}</p>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coding Environment */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h2 className="text-gray-900 font-bold text-base mb-4 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-600" />
            Coding Environment
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              "Python, Java, C++, JavaScript supported",
              "Run code against sample test cases",
              "Submit against hidden test cases",
              "Time & memory limits enforced",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Agreement */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span className="text-amber-800 text-sm leading-relaxed">
              I have read and understood all exam rules. I agree to abide by the GOBT Developer Program assessment guidelines and confirm I will not use any unauthorized resources or assistance. I understand violations may result in disqualification.
            </span>
          </label>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartExam}
          disabled={!agreed || starting}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
        >
          {starting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Starting Exam...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Exam
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </main>
    </div>
  );
}
