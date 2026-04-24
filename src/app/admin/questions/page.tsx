"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Users, LayoutDashboard, FileText, Settings, BarChart3, LogOut,
  Upload, Download, Trash2, Edit2, CheckCircle, Terminal, Layers,
  PlusCircle, X, Clock, Plus, Save, Code2
} from "lucide-react";

const SIDEBAR = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/questions", label: "Questions", icon: FileText, active: true },
  { href: "/admin/exam-config", label: "Exam Config", icon: Settings },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
];

const INPUT = "w-full px-4 py-2.5 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-blue-500 transition-all";
const LABEL = "block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";
const SELECT = "w-full px-4 py-2.5 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-slate-300 text-sm focus:outline-none focus:border-blue-500 transition-all";

export default function QuestionsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState<"mcq" | "coding">("mcq");
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);
  const [codingQuestions, setCodingQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mcqForm, setMcqForm] = useState({
    question: "", options: ["", "", "", ""], correct_answers: [""],
    is_multi_select: false, difficulty: "easy", topic: "DSA", marks: 1,
  });
  const [showMCQForm, setShowMCQForm] = useState(false);
  const [editingMCQ, setEditingMCQ] = useState<string | null>(null);
  const [showBulkMCQ, setShowBulkMCQ] = useState(false);
  const [mcqCsv, setMcqCsv] = useState("");

  const [selectedSet, setSelectedSet] = useState(1);
  const [codingForm, setCodingForm] = useState({
    title: "", description: "", difficulty: "easy",
    constraints: "", sample_input: "", sample_output: "",
    test_cases: [{ input: "", expected_output: "", is_hidden: false }],
    time_limit_ms: 2000, memory_limit_mb: 256, marks: 10,
  });
  const [showCodingForm, setShowCodingForm] = useState(false);
  const [editingCoding, setEditingCoding] = useState<string | null>(null);

  useEffect(() => {
    const t = sessionStorage.getItem("gobt_admin_token");
    if (!t) { router.push("/admin"); return; }
    setToken(t);
    fetchData(t);
  }, [router]);

  const fetchData = (t: string) => {
    Promise.all([
      fetch("/api/admin/questions/mcq", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
      fetch("/api/admin/questions/coding", { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
    ]).then(([mcq, coding]) => {
      setMcqQuestions(mcq.questions || []);
      setCodingQuestions(coding.questions || []);
      setLoading(false);
    });
  };

  const handleSaveMCQ = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const filteredOptions = mcqForm.options.filter((o) => o.trim());
    const method = editingMCQ ? "PUT" : "POST";
    const body = editingMCQ ? { ...mcqForm, id: editingMCQ, options: filteredOptions } : { ...mcqForm, options: filteredOptions };
    const res = await fetch("/api/admin/questions/mcq", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); setSaving(false); return; }
    toast.success(editingMCQ ? "Question updated" : "Question added");
    if (editingMCQ) {
      setMcqQuestions(prev => prev.map(q => q.id === editingMCQ ? data.question : q));
    } else {
      setMcqQuestions(prev => [data.question, ...prev]);
    }
    setShowMCQForm(false);
    setEditingMCQ(null);
    setMcqForm({ question: "", options: ["", "", "", ""], correct_answers: [""], is_multi_select: false, difficulty: "easy", topic: "DSA", marks: 1 });
    setSaving(false);
  };

  const handleEditMCQ = (q: any) => {
    setEditingMCQ(q.id);
    setMcqForm({ question: q.question, options: q.options, correct_answers: q.correct_answers, is_multi_select: q.is_multi_select, difficulty: q.difficulty, topic: q.topic, marks: q.marks });
    setShowMCQForm(true);
    setShowBulkMCQ(false);
  };

  const handleDeleteMCQ = async (id: string) => {
    if (!confirm("Delete this MCQ?")) return;
    const res = await fetch("/api/admin/questions/mcq", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { setMcqQuestions(p => p.filter(q => q.id !== id)); toast.success("Question deleted"); }
    else toast.error("Failed to delete");
  };

  const handleSaveCoding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editingCoding) {
      const res = await fetch("/api/admin/questions/coding", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...codingForm, id: editingCoding }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); setSaving(false); return; }
      toast.success("Question updated");
      setCodingQuestions(prev => prev.map(q => q.id === editingCoding ? data.question : q));
    } else {
      const res = await fetch("/api/admin/questions/coding", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ set_number: selectedSet, questions: [codingForm] }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); setSaving(false); return; }
      toast.success(`Added to Set ${selectedSet}`);
      fetchData(token);
    }
    setShowCodingForm(false);
    setEditingCoding(null);
    setCodingForm({ title: "", description: "", difficulty: "easy", constraints: "", sample_input: "", sample_output: "", test_cases: [{ input: "", expected_output: "", is_hidden: false }], time_limit_ms: 2000, memory_limit_mb: 256, marks: 10 });
    setSaving(false);
  };

  const handleEditCoding = (q: any) => {
    setEditingCoding(q.id);
    setCodingForm({ title: q.title, description: q.description, difficulty: q.difficulty, constraints: q.constraints, sample_input: q.sample_input, sample_output: q.sample_output, test_cases: q.test_cases, time_limit_ms: q.time_limit_ms, memory_limit_mb: q.memory_limit_mb, marks: q.marks });
    setShowCodingForm(true);
  };

  const handleDeleteCoding = async (id: string) => {
    if (!confirm("Delete this coding question?")) return;
    const res = await fetch("/api/admin/questions/coding", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    if (res.ok) { setCodingQuestions(p => p.filter(q => q.id !== id)); toast.success("Deleted"); }
    else toast.error("Failed");
  };

  const handleBulkMCQ = async () => {
    if (!mcqCsv.trim()) { toast.error("Provide CSV data"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/questions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ csvData: mcqCsv }),
      });
      const data = await res.json();
      if (res.ok) { toast.success(`Imported ${data.count} questions`); setShowBulkMCQ(false); setMcqCsv(""); fetchData(token); }
      else toast.error(data.error);
    } catch { toast.error("Import failed"); }
    finally { setSaving(false); }
  };

  const downloadMCQTemplate = () => {
    const csv = "question,option1,option2,option3,option4,correct_answers,topic,difficulty,marks,is_multi_select\nWhat is React?,A Library,A Framework,A Language,A DB,A Library,React,easy,1,false";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mcq_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const resetCodingForm = () => {
    setShowCodingForm(false); setEditingCoding(null);
    setCodingForm({ title: "", description: "", difficulty: "easy", constraints: "", sample_input: "", sample_output: "", test_cases: [{ input: "", expected_output: "", is_hidden: false }], time_limit_ms: 2000, memory_limit_mb: 256, marks: 10 });
  };

  const resetMCQForm = () => {
    setShowMCQForm(false); setEditingMCQ(null);
    setMcqForm({ question: "", options: ["", "", "", ""], correct_answers: [""], is_multi_select: false, difficulty: "easy", topic: "DSA", marks: 1 });
  };

  const DIFF_STYLE: Record<string, string> = {
    easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    hard: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  if (loading && !token) return null;

  return (
    <div className="min-h-screen bg-[#080E1A] text-white">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-60 bg-[#0D1525] border-r border-[#1B2D47] flex flex-col">
        <div className="px-6 py-6 border-b border-[#1B2D47]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <span className="text-white text-sm font-black">G</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">GOBT Admin</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Assessment Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {SIDEBAR.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                item.active ? "bg-blue-600/15 text-blue-400 border border-blue-500/20" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-[#1B2D47]">
          <button onClick={() => { sessionStorage.removeItem("gobt_admin_token"); router.push("/admin"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <main className="ml-60 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Question Bank</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {mcqQuestions.length} MCQ &bull; {codingQuestions.length} Coding questions
            </p>
          </div>
          {/* Tab Toggle */}
          <div className="flex bg-[#0F1928] border border-[#1B2D47] p-1 rounded-xl gap-1">
            {(["mcq", "coding"] as const).map((tab) => (
              <button key={tab} onClick={() => { setActiveTab(tab); resetMCQForm(); resetCodingForm(); setShowBulkMCQ(false); }}
                className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-slate-200"
                }`}>
                {tab === "mcq" ? "MCQ Questions" : "Coding Questions"}
              </button>
            ))}
          </div>
        </div>

        {/* ── MCQ TAB ── */}
        {activeTab === "mcq" && (
          <div className="space-y-5">
            {/* MCQ toolbar */}
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-sm">{mcqQuestions.length} questions in bank</p>
              <div className="flex gap-3">
                <button onClick={() => { setShowBulkMCQ(!showBulkMCQ); resetMCQForm(); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1B2D47] bg-[#0F1928] text-slate-300 text-sm font-medium hover:border-slate-500 hover:text-white transition-all">
                  <Upload className="w-4 h-4" /> Bulk Import
                </button>
                <button onClick={() => { setShowMCQForm(!showMCQForm); setShowBulkMCQ(false); setEditingMCQ(null); setMcqForm({ question: "", options: ["", "", "", ""], correct_answers: [""], is_multi_select: false, difficulty: "easy", topic: "DSA", marks: 1 }); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20">
                  <Plus className="w-4 h-4" /> Add MCQ
                </button>
              </div>
            </div>

            {/* Bulk Import Panel */}
            {showBulkMCQ && (
              <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm">Bulk Import MCQ</h3>
                  <button onClick={downloadMCQTemplate}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download Template
                  </button>
                </div>
                <textarea
                  value={mcqCsv} onChange={(e) => setMcqCsv(e.target.value)} rows={5}
                  placeholder="question,option1,option2,option3,option4,correct_answers,topic,difficulty,marks,is_multi_select"
                  className="w-full px-4 py-3 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-slate-300 placeholder:text-slate-600 font-mono text-xs focus:outline-none focus:border-blue-500 transition-all resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={handleBulkMCQ} disabled={saving}
                    className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 transition-all">
                    {saving ? "Importing..." : "Import Questions"}
                  </button>
                  <button onClick={() => setShowBulkMCQ(false)} className="px-5 py-2 text-slate-400 text-sm font-medium hover:text-white transition-colors">Cancel</button>
                </div>
              </div>
            )}

            {/* MCQ Form */}
            {showMCQForm && (
              <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white font-semibold text-sm">{editingMCQ ? "Edit Question" : "New MCQ Question"}</h3>
                  <button onClick={resetMCQForm} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSaveMCQ} className="space-y-5">
                  <div>
                    <label className={LABEL}>Question</label>
                    <textarea value={mcqForm.question} onChange={(e) => setMcqForm({ ...mcqForm, question: e.target.value })}
                      required rows={3} placeholder="Enter the question text..."
                      className={INPUT + " resize-none"} />
                  </div>

                  <div>
                    <label className={LABEL}>Options (A–D)</label>
                    <div className="grid grid-cols-2 gap-3">
                      {mcqForm.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-[#1B2D47] flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <input value={opt}
                            onChange={(e) => { const o = [...mcqForm.options]; o[i] = e.target.value; setMcqForm({ ...mcqForm, options: o }); }}
                            required placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            className={INPUT} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className={LABEL}>Correct Answer(s)</label>
                      <input value={mcqForm.correct_answers.join(", ")}
                        onChange={(e) => setMcqForm({ ...mcqForm, correct_answers: e.target.value.split(",").map(s => s.trim()) })}
                        required placeholder="Option text..."
                        className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Topic</label>
                      <select value={mcqForm.topic} onChange={(e) => setMcqForm({ ...mcqForm, topic: e.target.value })} className={SELECT}>
                        {["DSA", "OOP", "DBMS", "OS", "Networking", "React", "Node", "System Design"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Difficulty</label>
                      <select value={mcqForm.difficulty} onChange={(e) => setMcqForm({ ...mcqForm, difficulty: e.target.value })} className={SELECT}>
                        {["easy", "medium", "hard"].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL}>Marks</label>
                      <input type="number" value={mcqForm.marks} min={1}
                        onChange={(e) => setMcqForm({ ...mcqForm, marks: Number(e.target.value) })}
                        className={INPUT + " text-center font-bold"} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-[#1B2D47]">
                    <button type="submit" disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 transition-all">
                      <Save className="w-4 h-4" />
                      {saving ? "Saving..." : editingMCQ ? "Update Question" : "Add Question"}
                    </button>
                    <button type="button" onClick={resetMCQForm} className="px-5 py-2 text-slate-400 text-sm font-medium hover:text-white transition-colors">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* MCQ Question List */}
            <div className="space-y-3">
              {mcqQuestions.map((q: any, idx: number) => (
                <div key={q.id} className="bg-[#0F1928] border border-[#1B2D47] rounded-xl p-5 hover:border-slate-600 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                        <span className="text-slate-600 text-xs font-mono">#{idx + 1}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${DIFF_STYLE[q.difficulty] || DIFF_STYLE.easy}`}>{q.difficulty}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase">{q.topic}</span>
                        <span className="ml-auto text-slate-400 text-xs font-bold">{q.marks} pts</span>
                      </div>
                      <p className="text-white font-medium text-sm mb-4 leading-relaxed">{q.question}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(q.options as string[]).map((opt: string, oi: number) => (
                          <div key={oi} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
                            q.correct_answers.includes(opt)
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                              : "bg-[#0B1524] border-[#1B2D47] text-slate-500"
                          }`}>
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                              q.correct_answers.includes(opt) ? "bg-emerald-500 text-white" : "bg-[#1B2D47] text-slate-500"
                            }`}>{String.fromCharCode(65 + oi)}</span>
                            {opt}
                            {q.correct_answers.includes(opt) && <CheckCircle className="w-3 h-3 ml-auto text-emerald-400" />}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => handleEditMCQ(q)}
                        className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteMCQ(q.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {mcqQuestions.length === 0 && !loading && (
                <div className="text-center py-16 bg-[#0F1928] border border-[#1B2D47] rounded-xl">
                  <FileText className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No MCQ questions yet. Add one above.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CODING TAB ── */}
        {activeTab === "coding" && (
          <div className="space-y-5">
            {/* Coding toolbar */}
            <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl p-5 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-sm mb-1">Coding Question Sets</h3>
                <p className="text-slate-500 text-xs">Each candidate is assigned one variant set</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Set Selector */}
                <div>
                  <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Select Variant</p>
                  <div className="flex gap-1 bg-[#0B1524] p-1 rounded-lg border border-[#1B2D47]">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setSelectedSet(n)}
                        className={`w-9 h-9 rounded-md text-xs font-bold transition-all ${
                          selectedSet === n ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-400 hover:text-white"
                        }`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div className="w-px h-10 bg-[#1B2D47]" />
                <button
                  onClick={() => { setShowCodingForm(!showCodingForm); resetCodingForm(); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20">
                  <PlusCircle className="w-4 h-4" /> Add Question
                </button>
              </div>
            </div>

            {/* Coding Form */}
            {showCodingForm && (
              <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-white font-semibold text-sm">{editingCoding ? "Edit Coding Question" : "New Coding Question"}</h3>
                    <p className="text-slate-500 text-xs mt-0.5">Variant Set {selectedSet}</p>
                  </div>
                  <button onClick={resetCodingForm} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSaveCoding} className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className={LABEL}>Title</label>
                      <input value={codingForm.title} onChange={(e) => setCodingForm({ ...codingForm, title: e.target.value })}
                        required placeholder="e.g. Reverse a Linked List"
                        className={INPUT} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Difficulty</label>
                        <select value={codingForm.difficulty} onChange={(e) => setCodingForm({ ...codingForm, difficulty: e.target.value })} className={SELECT}>
                          {["easy", "medium", "hard"].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={LABEL}>Marks</label>
                        <input type="number" value={codingForm.marks} min={1}
                          onChange={(e) => setCodingForm({ ...codingForm, marks: Number(e.target.value) })}
                          className={INPUT + " text-center font-bold"} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>Problem Description</label>
                    <textarea value={codingForm.description} onChange={(e) => setCodingForm({ ...codingForm, description: e.target.value })}
                      required rows={5} placeholder="Describe the problem clearly..."
                      className={INPUT + " resize-none"} />
                  </div>

                  <div>
                    <label className={LABEL}>Constraints</label>
                    <textarea value={codingForm.constraints} onChange={(e) => setCodingForm({ ...codingForm, constraints: e.target.value })}
                      rows={2} placeholder="e.g. 1 ≤ n ≤ 10^5"
                      className={INPUT + " font-mono resize-none"} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Sample Input</label>
                      <textarea value={codingForm.sample_input} onChange={(e) => setCodingForm({ ...codingForm, sample_input: e.target.value })}
                        rows={3} placeholder="[1, 2, 3]"
                        className={INPUT + " font-mono resize-none"} />
                    </div>
                    <div>
                      <label className={LABEL}>Sample Output</label>
                      <textarea value={codingForm.sample_output} onChange={(e) => setCodingForm({ ...codingForm, sample_output: e.target.value })}
                        rows={3} placeholder="[3, 2, 1]"
                        className={INPUT + " font-mono resize-none"} />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL}>Test Cases (JSON)</label>
                    <textarea value={JSON.stringify(codingForm.test_cases, null, 2)}
                      onChange={(e) => { try { setCodingForm({ ...codingForm, test_cases: JSON.parse(e.target.value) }); } catch {} }}
                      rows={6}
                      className={INPUT + " font-mono resize-none"} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={LABEL}>Time Limit (ms)</label>
                      <input type="number" value={codingForm.time_limit_ms} min={100}
                        onChange={(e) => setCodingForm({ ...codingForm, time_limit_ms: Number(e.target.value) })}
                        className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Memory Limit (MB)</label>
                      <input type="number" value={codingForm.memory_limit_mb} min={32}
                        onChange={(e) => setCodingForm({ ...codingForm, memory_limit_mb: Number(e.target.value) })}
                        className={INPUT} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-[#1B2D47]">
                    <button type="submit" disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 transition-all">
                      <Save className="w-4 h-4" />
                      {saving ? "Saving..." : editingCoding ? "Update Question" : "Add Question"}
                    </button>
                    <button type="button" onClick={resetCodingForm} className="px-5 py-2 text-slate-400 text-sm font-medium hover:text-white transition-colors">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Coding Question List */}
            <div className="space-y-3">
              {codingQuestions.filter(q => q.set_number === selectedSet).map((q: any) => (
                <div key={q.id} className="bg-[#0F1928] border border-[#1B2D47] rounded-xl p-5 hover:border-slate-600 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${DIFF_STYLE[q.difficulty] || DIFF_STYLE.easy}`}>{q.difficulty}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-bold">Set {q.set_number}</span>
                        <span className="ml-auto text-slate-400 text-xs font-bold">{q.marks} pts</span>
                      </div>
                      <h4 className="text-white font-semibold text-sm mb-2">{q.title}</h4>
                      <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 mb-3">{q.description}</p>
                      <div className="flex items-center gap-4 text-slate-500 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          <span>{q.time_limit_ms}ms</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-3 h-3" />
                          <span>{q.memory_limit_mb}MB</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Code2 className="w-3 h-3" />
                          <span>{q.test_cases?.length || 0} test cases</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                      <button onClick={() => handleEditCoding(q)}
                        className="p-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteCoding(q.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {codingQuestions.filter(q => q.set_number === selectedSet).length === 0 && !loading && (
                <div className="text-center py-16 bg-[#0F1928] border border-dashed border-[#1B2D47] rounded-xl">
                  <Terminal className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No questions in Set {selectedSet} yet.</p>
                  <p className="text-slate-600 text-xs mt-1">Click "Add Question" to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
