"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Users, LayoutDashboard, FileText, Settings, BarChart3, LogOut,
  Download, Eye, Activity, Clock, AlertTriangle, RefreshCw, Key,
  CheckCircle, TrendingUp, Zap
} from "lucide-react";

const SIDEBAR = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, active: true },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
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
        {SIDEBAR.map((item) => (
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

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [stats, setStats] = useState({ total: 0, not_started: 0, in_progress: 0, submitted: 0 });
  const [candidates, setCandidates] = useState<any[]>([]);
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async (t: string, silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const [candRes, examRes] = await Promise.all([
        fetch("/api/admin/candidates", { headers: { Authorization: `Bearer ${t}` } }),
        fetch("/api/admin/exam", { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      if (candRes.status === 401) { router.push("/admin"); return; }
      const candData = await candRes.json();
      const examData = await examRes.json();
      const cands = candData.candidates || [];
      setCandidates(cands);
      setStats({
        total: cands.length,
        not_started: cands.filter((c: any) => c.status === "not_started").length,
        in_progress: cands.filter((c: any) => c.status === "in_progress").length,
        submitted: cands.filter((c: any) => ["submitted", "verified"].includes(c.status)).length,
      });
      const exams = examData.exams || [];
      setExam(exams.find((e: any) => e.is_active) || exams[0] || null);
    } catch {
      if (!silent) toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    const t = sessionStorage.getItem("gobt_admin_token");
    if (!t) { router.push("/admin"); return; }
    setToken(t);
    fetchData(t);
    const interval = setInterval(() => fetchData(t, true), 15000);
    return () => clearInterval(interval);
  }, [router, fetchData]);

  const handleForceSubmit = async (userId: string, name: string) => {
    if (!confirm(`Force submit exam for ${name}?`)) return;
    const res = await fetch("/api/admin/force-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) { toast.success("Exam submitted"); fetchData(token); }
  };

  const handleExtraTime = async (userId: string, name: string) => {
    const mins = prompt(`Add extra minutes for ${name}:`);
    if (!mins || isNaN(Number(mins)) || Number(mins) <= 0) return;
    const res = await fetch("/api/admin/extra-time", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ user_id: userId, extra_minutes: Number(mins) }),
    });
    if (res.ok) { toast.success(`+${mins} minutes added`); fetchData(token); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("gobt_admin_token");
    router.push("/admin");
  };

  const handleExportCSV = async () => {
    const tid = toast.loading("Generating CSV report...");
    try {
      const res = await fetch("/api/admin/reports?format=csv", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gobt_exam_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Report downloaded", { id: tid });
    } catch {
      toast.error("Export failed", { id: tid });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080E1A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const STAT_CARDS = [
    { label: "Total Candidates", value: stats.total, icon: Users, color: "text-blue-400", ring: "ring-blue-500/20", bg: "bg-blue-500/10" },
    { label: "Not Started", value: stats.not_started, icon: Clock, color: "text-slate-400", ring: "ring-slate-500/20", bg: "bg-slate-500/10" },
    { label: "In Progress", value: stats.in_progress, icon: Zap, color: "text-amber-400", ring: "ring-amber-500/20", bg: "bg-amber-500/10" },
    { label: "Completed", value: stats.submitted, icon: CheckCircle, color: "text-emerald-400", ring: "ring-emerald-500/20", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="min-h-screen bg-[#080E1A] text-white">
      <Sidebar onLogout={handleLogout} />

      <main className="ml-60 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Command Center</h1>
            <p className="text-slate-500 text-sm mt-0.5">Live exam monitoring &bull; Auto-syncs every 15s</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1B2D47] bg-[#0F1928] text-slate-300 text-sm font-medium hover:border-slate-500 hover:text-white transition-all"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => fetchData(token)}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all disabled:opacity-60 shadow-lg shadow-blue-600/20"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {STAT_CARDS.map((s, i) => (
            <div key={i} className={`bg-[#0F1928] border border-[#1B2D47] rounded-xl p-5 ring-1 ${s.ring} transition-all hover:border-slate-600`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4.5 h-4.5 ${s.color}`} style={{ width: "1.1rem", height: "1.1rem" }} />
                </div>
                <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-3xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Active Exam Banner */}
        {exam && (
          <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl p-5 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h3 className="text-white font-semibold text-sm">{exam.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${exam.is_active ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-slate-500/15 text-slate-400 border border-slate-500/20"}`}>
                    {exam.is_active ? "Live" : "Inactive"}
                  </span>
                </div>
                <p className="text-slate-500 text-xs">
                  Start: {new Date(exam.start_time).toLocaleString()} &bull;&nbsp;
                  Duration: {exam.mcq_duration_minutes + exam.coding_duration_minutes} min
                </p>
              </div>
            </div>
            <Link href="/admin/exam-config"
              className="px-3 py-1.5 rounded-lg border border-[#1B2D47] text-slate-400 text-xs font-medium hover:border-slate-500 hover:text-white transition-all">
              Configure
            </Link>
          </div>
        )}

        {/* Live Feed Table */}
        <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1B2D47] flex items-center gap-3">
            <Activity className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Live Candidate Feed</h2>
            <span className="flex items-center gap-1.5 ml-auto text-xs text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Real-time
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1B2D47]">
                  {["Candidate", "Email", "Status", "Violations", "Score", "Started At", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B2D47]/60">
                {candidates.map((c: any) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white text-sm">{c.name}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">{c.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                        c.status === "submitted" || c.status === "verified" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        c.status === "in_progress" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}>{c.status.replace(/_/g, " ")}</span>
                    </td>
                    <td className="px-6 py-4">
                      {c.tab_switch_count > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-amber-400 font-bold text-xs">{c.tab_switch_count}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {(c.status === "submitted" || c.status === "verified") ? (
                        <span className="text-white font-bold text-sm">
                          {c.submissions?.[0]?.total_score ?? "0"}
                          <span className="text-slate-500 font-normal text-xs ml-1">pts</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {c.started_at ? new Date(c.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : <span className="text-slate-600">Waiting</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {c.status === "in_progress" && (
                          <>
                            <button onClick={() => handleForceSubmit(c.id, c.name)}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                              Force Submit
                            </button>
                            <button onClick={() => handleExtraTime(c.id, c.name)}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all">
                              +Time
                            </button>
                          </>
                        )}
                        {(c.status === "submitted" || c.status === "verified") && (
                          <Link href="/admin/candidates"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all">
                            <Eye className="w-3 h-3" /> Review
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <Activity className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">No candidates registered yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
