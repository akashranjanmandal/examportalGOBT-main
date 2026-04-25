"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, LayoutDashboard, FileText, Settings, BarChart3, LogOut,
  Download, TrendingUp, Award, AlertTriangle, CheckCircle, Clock,
  Eye, X, XCircle, Code2, BarChart2
} from "lucide-react";
import toast from "react-hot-toast";

const SIDEBAR_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/questions", label: "Questions", icon: FileText },
  { href: "/admin/exam-config", label: "Exam Config", icon: Settings },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, active: true },
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

export default function ReportsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => { sessionStorage.removeItem("gobt_admin_token"); router.push("/admin"); };

  useEffect(() => {
    const t = sessionStorage.getItem("gobt_admin_token");
    if (!t) { router.push("/admin"); return; }
    setToken(t);
    fetch("/api/admin/reports", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => { setSubmissions(d.submissions || []); setLoading(false); });
  }, [router]);

  const [token, setToken] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
        // Refresh submissions
        const res2 = await fetch("/api/admin/reports", { headers: { Authorization: `Bearer ${token}` } });
        const d2 = await res2.json();
        setSubmissions(d2.submissions || []);
      }
    } catch { toast.error("Error"); }
    finally { setActionLoading(false); }
  };

  const mcqAnsweredCount = reviewData?.mcqQuestions?.filter((q: any) =>
    (reviewData?.submission?.mcq_answers?.[q.id] || []).length > 0
  ).length ?? 0;
  const mcqCorrectCount = reviewData?.mcqQuestions?.filter((q: any) => {
    const userAns = reviewData?.submission?.mcq_answers?.[q.id] || [];
    const correct = q.correct_answers || [];
    return userAns.length > 0 && userAns.length === correct.length && userAns.every((a: string) => correct.includes(a));
  }).length ?? 0;
  const mcqTotalCount = reviewData?.mcqQuestions?.length ?? 0;

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const scores = submissions.map((s: any) => s.total_score || 0);
  const mcqScores = submissions.map((s: any) => s.mcq_score || 0);
  const maxScore = Math.max(...scores, 1);

  const topScore = Math.max(...scores, 0);
  const autoSubmits = submissions.filter((s: any) => s.is_auto_submitted).length;

  return (
    <div className="min-h-screen bg-[#080E1A] text-white">
      <Sidebar onLogout={handleLogout} />

      <main className="ml-60 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
            <p className="text-slate-500 text-sm mt-0.5">{submissions.length} total submissions</p>
          </div>
          <a
            href="/api/admin/reports?format=csv"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
          >
            <Download className="w-4 h-4" /> Export CSV
          </a>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Submissions", value: submissions.length, icon: CheckCircle, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
            { label: "Avg MCQ Score", value: `${avg(mcqScores)} pts`, icon: BarChart3, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
            { label: "Avg Total Score", value: `${avg(scores)} pts`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
            { label: "Auto-Submitted", value: autoSubmits, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
          ].map((s, i) => (
            <div key={i} className={`bg-[#0F1928] border ${s.border} rounded-xl p-5 ring-1 ${s.border.replace("border-", "ring-")}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-4.5 h-4.5 ${s.color}`} style={{ width: "1.1rem", height: "1.1rem" }} />
                </div>
                <Award className="w-3.5 h-3.5 text-slate-700" />
              </div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">{s.label}</p>
              <p className="text-3xl font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Submissions Table */}
        <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1B2D47] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Submission Records</h2>
            <span className="text-slate-500 text-xs">Sorted by submission time</span>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <div className="w-7 h-7 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading submissions...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1B2D47]">
                    {["Candidate", "Email", "MCQ Score", "Coding Score", "Total", "Violations", "Auto-Submit", "Submitted At", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B2D47]/60">
                  {submissions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{s.users?.name}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs font-mono">{s.users?.email}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-white font-bold font-mono text-sm">{s.mcq_score}</span>
                          <div className="flex-1 min-w-[40px] max-w-[60px] h-1 rounded-full bg-slate-700/50 overflow-hidden">
                            <div
                              className="h-1 rounded-full bg-blue-500"
                              style={{ width: `${Math.min((s.mcq_score / 30) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-white font-mono font-bold text-sm">{s.coding_score}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-white font-bold text-sm">{s.total_score}</span>
                          <div className="flex-1 min-w-[40px] max-w-[60px] h-1 rounded-full bg-slate-700/50 overflow-hidden">
                            <div
                              className="h-1 rounded-full bg-emerald-500"
                              style={{ width: `${Math.min((s.total_score / maxScore) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {(s.users?.tab_switch_count || 0) > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-amber-400 font-bold text-xs">{s.users.tab_switch_count}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs">0</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {s.is_auto_submitted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-400 border-amber-500/20">Yes</span>
                        ) : (
                          <span className="text-slate-600 text-xs">No</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleReview(s.user_id)}
                          title="View Submission"
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {submissions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-16">
                        <BarChart3 className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No submissions yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
