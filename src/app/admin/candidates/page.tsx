"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Users, LayoutDashboard, FileText, Settings, BarChart3, LogOut,
  Search, Plus, Upload, Download, Trash2, Edit2, CheckCircle,
  XCircle, Eye, X, AlertTriangle, Filter, Key, Mail, Code2,
  ChevronRight, BarChart2
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/candidates", label: "Candidates", icon: Users, active: true },
  { href: "/admin/questions", label: "Questions", icon: FileText },
  { href: "/admin/exam-config", label: "Exam Config", icon: Settings },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
];

function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
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
        {SIDEBAR_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              item.active
                ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}>
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-[#1B2D47]">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", coding_set_number: "" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", email: "" });
  const [csvText, setCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [examInfo, setExamInfo] = useState({ exam_date: "", exam_time: "", duration: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCandidates = async (t: string) => {
    const res = await fetch("/api/admin/candidates", { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 401) { router.push("/admin"); return; }
    const data = await res.json();
    setCandidates(data.candidates || []);
    setLoading(false);
  };

  useEffect(() => {
    const t = sessionStorage.getItem("gobt_admin_token");
    if (!t) { router.push("/admin"); return; }
    setToken(t);
    fetchCandidates(t);
    fetch("/api/admin/exam", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        const active = (d.exams || []).find((e: any) => e.is_active);
        if (active?.start_time) {
          const ist = new Date(new Date(active.start_time).getTime() + 5.5 * 60 * 60 * 1000);
          setExamInfo({
            exam_date: ist.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
            exam_time: ist.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC" }) + " IST",
            duration: `${active.mcq_duration_minutes + active.coding_duration_minutes} minutes`,
          });
        }
      });
  }, [router]);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvText(e.target?.result as string);
      setCsvFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const downloadTemplate = () => {
    const csv = "name,email\nRahul Sharma,rahul.sharma@example.com\nPriya Singh,priya.singh@example.com\nAkash Kumar,akash.kumar@example.com";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidates_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, ...examInfo }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`Registered! Access code: ${data.access_code}`);
      setForm({ name: "", email: "" });
      setShowAddForm(false);
      fetchCandidates(token);
    } catch { toast.error("Network error"); }
    finally { setActionLoading(false); }
  };

  const handleBulkAdd = async () => {
    if (!csvText.trim()) { toast.error("No CSV data provided"); return; }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/candidates/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ csvData: csvText, ...examInfo }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(`Successfully imported ${data.added} candidates`);
      setShowBulkForm(false);
      setCsvText("");
      setCsvFileName("");
      fetchCandidates(token);
    } catch { toast.error("Import failed"); }
    finally { setActionLoading(false); }
  };

  const handleUpdate = async (id: string) => {
    setActionLoading(true);
    try {
      const payload: Record<string, any> = { id, name: editForm.name, email: editForm.email };
      if (editForm.coding_set_number) payload.coding_set_number = Number(editForm.coding_set_number);
      const res = await fetch("/api/admin/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) { toast.success("Updated"); setEditingId(null); fetchCandidates(token); }
      else toast.error(data.error || "Update failed");
    } catch { toast.error("Error"); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    await fetch("/api/admin/candidates", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    toast.success("Candidate removed");
    fetchCandidates(token);
  };

  const handleReview = async (id: string) => {
    setLoadingReview(true);
    setShowReviewModal(true);
    setReviewData(null);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setReviewData(data);
    } catch { toast.error("Failed to load submission"); setShowReviewModal(false); }
    finally { setLoadingReview(false); }
  };

  const handleVerify = async (candidateId: string, action: "verify" | "reject") => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/candidates/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidateId, action }),
      });
      if (res.ok) {
        toast.success(action === "verify" ? "Candidate verified" : "Candidate rejected");
        setShowReviewModal(false);
        fetchCandidates(token);
      }
    } catch { toast.error("Error"); }
    finally { setActionLoading(false); }
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const sendBulkEmail = async (type: "access_code" | "reminder" | "result") => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    const tid = toast.loading(`Sending to ${selectedIds.length} candidates...`);
    try {
      const res = await fetch("/api/admin/candidates/bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidateIds: selectedIds, type, examInfo }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.sent > 0 && data.failed === 0) {
          toast.success(`Email sent to ${data.sent} candidate${data.sent > 1 ? "s" : ""}`, { id: tid });
        } else if (data.sent > 0 && data.failed > 0) {
          toast.success(`${data.sent} sent, ${data.failed} failed`, { id: tid });
          data.details?.forEach((d: string) => toast.error(d, { duration: 6000 }));
        } else {
          toast.error(`Failed to send — ${data.details?.[0] || "Check SMTP settings"}`, { id: tid, duration: 8000 });
        }
        setSelectedIds([]);
        fetchCandidates(token);
      } else toast.error(data.error, { id: tid });
    } catch { toast.error("Network error", { id: tid }); }
    finally { setActionLoading(false); }
  };

  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.status.toLowerCase().includes(search.toLowerCase())
  );

  // Review modal computed values
  const mcqAnsweredCount = reviewData?.mcqQuestions?.filter((q: any) =>
    (reviewData?.submission?.mcq_answers?.[q.id] || []).length > 0
  ).length ?? 0;
  const mcqCorrectCount = reviewData?.mcqQuestions?.filter((q: any) => {
    const userAns = reviewData?.submission?.mcq_answers?.[q.id] || [];
    const correct = q.correct_answers || [];
    return userAns.length > 0 && userAns.length === correct.length && userAns.every((a: string) => correct.includes(a));
  }).length ?? 0;
  const mcqTotalCount = reviewData?.mcqQuestions?.length ?? 0;

  const handleLogout = () => { sessionStorage.removeItem("gobt_admin_token"); router.push("/admin"); };

  const STATUS_STYLE: Record<string, string> = {
    verified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    not_started: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <div className="min-h-screen bg-[#080E1A] text-white">
      <Sidebar onLogout={handleLogout} />

      <main className="ml-60 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Candidates</h1>
            <p className="text-slate-500 text-sm mt-0.5">{candidates.length} registered &bull; Manage and verify assessment participants</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowBulkForm(!showBulkForm); setShowAddForm(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1B2D47] bg-[#0F1928] text-slate-300 text-sm font-medium hover:border-slate-500 hover:text-white transition-all">
              <Upload className="w-4 h-4" /> Bulk Import
            </button>
            <button
              onClick={() => { setShowAddForm(!showAddForm); setShowBulkForm(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20">
              <Plus className="w-4 h-4" /> Add Candidate
            </button>
          </div>
        </div>

        {/* Bulk Import Panel */}
        {showBulkForm && (
          <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold text-base">Bulk Import Candidates</h3>
                <p className="text-slate-500 text-sm mt-0.5">Upload a CSV file with name and email columns</p>
              </div>
              <button onClick={downloadTemplate}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1B2D47] text-slate-400 text-xs font-medium hover:border-blue-500/40 hover:text-blue-400 transition-all">
                <Download className="w-3.5 h-3.5" /> Download Template
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all mb-4 ${
                isDragging
                  ? "border-blue-500 bg-blue-500/5"
                  : csvFileName
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-[#1B2D47] hover:border-blue-500/40 hover:bg-blue-500/[0.03]"
              }`}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              {csvFileName ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                  <p className="text-emerald-400 font-semibold text-sm">{csvFileName}</p>
                  <p className="text-slate-500 text-xs">File loaded &bull; Click to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-slate-600" />
                  <p className="text-slate-300 font-medium text-sm">Drop CSV file here or click to browse</p>
                  <p className="text-slate-500 text-xs">Supports .csv and .txt formats</p>
                </div>
              )}
            </div>

            {/* Manual textarea fallback */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Or paste CSV data directly
              </label>
              <textarea
                value={csvText}
                onChange={(e) => { setCsvText(e.target.value); if (e.target.value) setCsvFileName(""); }}
                rows={4}
                placeholder={"name,email\nRahul Sharma,rahul@example.com\nPriya Singh,priya@example.com"}
                className="w-full px-4 py-3 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-slate-300 placeholder:text-slate-600 font-mono text-xs focus:outline-none focus:border-blue-500 transition-all resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleBulkAdd}
                disabled={actionLoading || !csvText.trim()}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {actionLoading ? "Importing..." : "Import Candidates"}
              </button>
              <button onClick={() => { setShowBulkForm(false); setCsvText(""); setCsvFileName(""); }}
                className="px-5 py-2 text-slate-400 text-sm font-medium hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add Candidate Form */}
        {showAddForm && (
          <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl p-6 mb-6">
            <h3 className="text-white font-semibold text-base mb-4">Register Single Candidate</h3>
            <form onSubmit={handleAdd} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Candidate full name"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="candidate@email.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-white placeholder:text-slate-600 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-50 whitespace-nowrap">
                Register
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="p-2.5 rounded-lg border border-[#1B2D47] text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Search & Bulk Actions */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or status..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0F1928] border border-[#1B2D47] text-slate-200 placeholder:text-slate-600 text-sm focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 rounded-lg px-4 py-2">
              <span className="text-blue-400 text-xs font-bold">{selectedIds.length} selected</span>
              <div className="w-px h-4 bg-blue-500/30 mx-1" />
              <button onClick={() => sendBulkEmail("access_code")} className="px-2.5 py-1 rounded bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-500 transition-all">Send Access Codes</button>
              <button onClick={() => sendBulkEmail("reminder")} className="px-2.5 py-1 rounded border border-blue-500/30 text-blue-400 text-[11px] font-bold hover:bg-blue-500/10 transition-all">Reminder</button>
              <button onClick={() => sendBulkEmail("result")} className="px-2.5 py-1 rounded bg-emerald-600/80 text-white text-[11px] font-bold hover:bg-emerald-600 transition-all">Send Results</button>
              <button onClick={() => setSelectedIds([])} className="ml-1 p-1 text-slate-500 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </div>

        {/* Candidates Table */}
        <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-7 h-7 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading candidates...</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1B2D47]">
                  <th className="px-5 py-3 w-10">
                    <input
                      type="checkbox"
                      onChange={(e) => setSelectedIds(e.target.checked ? candidates.map(c => c.id) : [])}
                      checked={selectedIds.length === candidates.length && candidates.length > 0}
                      className="rounded border-slate-600 bg-[#0B1524] text-blue-600 focus:ring-blue-500/30"
                    />
                  </th>
                  {["Candidate", "Access Code", "Status", "Set", "Violations", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B2D47]/60">
                {filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-slate-600 bg-[#0B1524] text-blue-600 focus:ring-blue-500/30"
                      />
                    </td>
                    <td className="px-5 py-4">
                      {editingId === c.id ? (
                        <div className="flex flex-col gap-1.5">
                          <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="px-2.5 py-1.5 rounded-md bg-[#0B1524] border border-blue-500/40 text-white text-xs focus:outline-none" />
                          <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="px-2.5 py-1.5 rounded-md bg-[#0B1524] border border-blue-500/40 text-slate-300 text-xs focus:outline-none" />
                          <select
                            value={editForm.coding_set_number}
                            onChange={(e) => setEditForm({ ...editForm, coding_set_number: e.target.value })}
                            className="px-2.5 py-1.5 rounded-md bg-[#0B1524] border border-blue-500/40 text-slate-300 text-xs focus:outline-none">
                            <option value="">Coding Set (unchanged)</option>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                              <option key={n} value={n}>Set {n}</option>
                            ))}
                          </select>
                          <div className="flex gap-2 mt-0.5">
                            <button onClick={() => handleUpdate(c.id)} disabled={actionLoading} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 disabled:opacity-50">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-[10px] font-bold text-slate-500 hover:text-slate-300">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-white">{c.name}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{c.email}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md">
                        {c.access_code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${STATUS_STYLE[c.status] || STATUS_STYLE.not_started}`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-slate-400 text-xs font-bold">{c.coding_set_number || "—"}</td>
                    <td className="px-5 py-4 text-center">
                      {c.tab_switch_count > 0 ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-400 font-bold text-xs">{c.tab_switch_count}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">0</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleReview(c.id)}
                          title="View Submission"
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingId(c.id); setEditForm({ name: c.name, email: c.email, coding_set_number: c.coding_set_number ? String(c.coding_set_number) : "" }); }}
                          title="Edit Candidate"
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          title="Delete Candidate"
                          className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <Users className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No candidates found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] bg-[#0F1928] border border-[#1B2D47] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#1B2D47] flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-white font-bold text-base">Submission Review</h2>
                {reviewData?.submission?.users?.name && (
                  <p className="text-slate-500 text-xs mt-0.5">{reviewData.submission.users.name} &bull; {reviewData.submission.users.email}</p>
                )}
              </div>
              <button onClick={() => setShowReviewModal(false)} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingReview ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-slate-500 text-sm">Loading submission data...</p>
                </div>
              ) : reviewData?.submission ? (
                <>
                  {/* Score Summary */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-1">MCQ Score</p>
                      <p className="text-xl font-bold text-blue-400">{reviewData.submission.mcq_score ?? 0} pts</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-1">Answered</p>
                      <p className="text-xl font-bold text-emerald-400">{mcqAnsweredCount} <span className="text-sm font-medium text-slate-500">/ {mcqTotalCount} assigned</span></p>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-1">Correct</p>
                      <p className="text-xl font-bold text-purple-400">{mcqCorrectCount} <span className="text-sm font-medium text-slate-500">/ {mcqAnsweredCount} answered</span></p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-1">Tab Violations</p>
                      <p className="text-xl font-bold text-red-400">{reviewData.submission.users?.tab_switch_count ?? 0}</p>
                    </div>
                  </div>

                  {/* MCQ Section */}
                  {reviewData.mcqQuestions?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <BarChart2 className="w-4 h-4 text-blue-400" />
                        <h3 className="text-white font-semibold text-sm">MCQ Responses</h3>
                        <span className="ml-auto text-slate-500 text-xs font-medium">
                          {mcqAnsweredCount} answered &bull; {mcqCorrectCount} correct &bull; {mcqTotalCount - mcqAnsweredCount} skipped
                        </span>
                      </div>
                      <div className="space-y-3">
                        {reviewData.mcqQuestions.map((q: any, i: number) => {
                          const userAns: string[] = reviewData.submission.mcq_answers?.[q.id] || [];
                          const correctAns: string[] = q.correct_answers || [];
                          const isCorrect = userAns.length > 0 && userAns.length === correctAns.length && userAns.every((a: string) => correctAns.includes(a));
                          const hasAnswer = userAns.length > 0;
                          return (
                            <div key={i} className={`rounded-xl border p-4 ${isCorrect ? "border-emerald-500/20 bg-emerald-500/[0.04]" : hasAnswer ? "border-red-500/20 bg-red-500/[0.04]" : "border-[#1B2D47] bg-[#0B1524]"}`}>
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <p className="text-slate-200 text-sm font-medium leading-relaxed">
                                  <span className="text-slate-500 mr-2">{i + 1}.</span>{q.question}
                                </p>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  isCorrect ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                  hasAnswer ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                  "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                }`}>
                                  {isCorrect ? "Correct" : hasAnswer ? "Wrong" : "Skipped"}
                                </span>
                              </div>
                              {/* Options */}
                              {q.options && (
                                <div className="grid grid-cols-2 gap-2">
                                  {q.options.map((opt: string, oi: number) => {
                                    const isOptCorrect = correctAns.includes(opt);
                                    const userPicked = userAns.includes(opt);
                                    return (
                                      <div key={oi} className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-all ${
                                        isOptCorrect && userPicked ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" :
                                        isOptCorrect ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-400" :
                                        userPicked ? "border-red-500/40 bg-red-500/10 text-red-300" :
                                        "border-[#1B2D47] text-slate-500"
                                      }`}>
                                        <span className="font-bold text-[10px] opacity-60 flex-shrink-0">{String.fromCharCode(65 + oi)}.</span>
                                        <span className="flex-1">{opt}</span>
                                        {isOptCorrect && <CheckCircle className="w-3 h-3 flex-shrink-0 text-emerald-400" />}
                                        {userPicked && !isOptCorrect && <XCircle className="w-3 h-3 flex-shrink-0 text-red-400" />}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Coding Section */}
                  {reviewData.codingQuestions?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Code2 className="w-4 h-4 text-amber-400" />
                        <h3 className="text-white font-semibold text-sm">Coding Submissions</h3>
                      </div>
                      <div className="space-y-4">
                        {reviewData.codingQuestions.map((q: any, i: number) => {
                          const sub = reviewData.submission.coding_answers?.[q.id];
                          return (
                            <div key={i} className="rounded-xl border border-[#1B2D47] overflow-hidden">
                              <div className="px-4 py-3 border-b border-[#1B2D47] bg-[#0B1524] flex items-center justify-between">
                                <div>
                                  <p className="text-white font-semibold text-sm">{q.title}</p>
                                  <p className="text-slate-500 text-xs mt-0.5 capitalize">{q.difficulty} difficulty &bull; {q.marks} marks</p>
                                </div>
                                {sub?.language && (
                                  <span className="px-2.5 py-1 rounded-md bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                                    {sub.language}
                                  </span>
                                )}
                              </div>
                              <pre className="p-4 text-slate-300 font-mono text-xs leading-relaxed overflow-x-auto bg-[#080E1A] min-h-[60px] max-h-64">
                                {sub?.code || "// No code submitted"}
                              </pre>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!reviewData.mcqQuestions?.length && !reviewData.codingQuestions?.length && (
                    <div className="text-center py-12">
                      <Eye className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No submission data available</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-500 text-sm">Could not load submission data</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {reviewData?.submission && (
              <div className="px-6 py-4 border-t border-[#1B2D47] flex items-center justify-between flex-shrink-0 bg-[#0D1525]">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Total Score:</span>
                  <span className="text-white font-bold text-sm">{reviewData.submission.total_score ?? 0} pts</span>
                  {reviewData.submission.is_auto_submitted && (
                    <span className="px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-400 text-[10px] font-bold">Auto-Submitted</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerify(reviewData.submission.user_id, "reject")}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/10 transition-all disabled:opacity-50">
                    Reject
                  </button>
                  <button
                    onClick={() => handleVerify(reviewData.submission.user_id, "verify")}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20">
                    Verify & Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
