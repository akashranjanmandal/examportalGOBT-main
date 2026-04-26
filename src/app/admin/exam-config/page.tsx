"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Users, LayoutDashboard, FileText, Settings, BarChart3, LogOut,
  Clock, Shield, Globe, Calendar, Save, Power
} from "lucide-react";

const SIDEBAR = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/questions", label: "Questions", icon: FileText },
  { href: "/admin/exam-config", label: "Exam Config", icon: Settings, active: true },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
];

export default function ExamConfigPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [exam, setExam] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "GOBT Developer Assessment",
    start_time: "",
    end_time: "",
    mcq_duration_minutes: 20,
    coding_duration_minutes: 60,
    max_tab_switches: 3,
    is_active: false,
  });

  const utcToISTLocal = (utcStr: string) => {
    if (!utcStr) return "";
    const d = new Date(utcStr);
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    return ist.toISOString().slice(0, 16);
  };

  const istLocalToUTC = (localStr: string) => {
    if (!localStr) return "";
    return new Date(localStr + ":00+05:30").toISOString();
  };

  useEffect(() => {
    const t = sessionStorage.getItem("gobt_admin_token");
    if (!t) { router.push("/admin"); return; }
    setToken(t);

    fetch("/api/admin/exam", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((d) => {
        const active = (d.exams || []).find((e: any) => e.is_active) || d.exams?.[0];
        if (active) {
          setExam(active);
          setForm({
            title: active.title,
            start_time: utcToISTLocal(active.start_time),
            end_time: utcToISTLocal(active.end_time),
            mcq_duration_minutes: active.mcq_duration_minutes,
            coding_duration_minutes: active.coding_duration_minutes,
            max_tab_switches: active.max_tab_switches,
            is_active: active.is_active ?? false,
          });
        }
      });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = exam ? "PUT" : "POST";
      const converted = {
        ...form,
        start_time: istLocalToUTC(form.start_time),
        end_time: istLocalToUTC(form.end_time),
      };
      const body = exam ? { id: exam.id, ...converted } : converted;

      const res = await fetch("/api/admin/exam", {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(form.is_active ? "Exam saved and activated" : "Exam saved (inactive)");
      setExam(data.exam);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  if (!token && !exam) return null;

  return (
    <div className="min-h-screen bg-[#080E1A] font-sans">
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
          <button onClick={() => { sessionStorage.removeItem("gobt_admin_token"); router.push("/admin"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <main className="ml-60 p-8 max-w-3xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white">Exam Configuration</h1>
          <p className="text-slate-500 text-sm mt-0.5">Configure exam parameters, timing, and access settings</p>
        </header>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Activation Banner */}
          <div className={`rounded-xl border p-5 flex items-center justify-between ${
            form.is_active
              ? "bg-emerald-500/[0.06] border-emerald-500/20"
              : "bg-[#0F1928] border-[#1B2D47]"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                form.is_active ? "bg-emerald-500/15" : "bg-slate-700/40"
              }`}>
                <Power className={`w-4 h-4 ${form.is_active ? "text-emerald-400" : "text-slate-500"}`} />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  Exam is {form.is_active ? "Active" : "Inactive"}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {form.is_active
                    ? "Candidates can log in within the scheduled time window"
                    : "Candidates cannot log in until the exam is activated"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className={`relative w-12 h-6 rounded-full transition-all duration-200 ${
                form.is_active ? "bg-emerald-500" : "bg-slate-700"
              }`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                form.is_active ? "left-6" : "left-0.5"
              }`} />
            </button>
          </div>

          {/* General Settings */}
          <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" /> General Settings
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Assessment Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-white focus:outline-none focus:border-blue-500 transition-all text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Start Time (IST)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input type="datetime-local" value={form.start_time}
                      onChange={(e) => setForm({ ...form, start_time: e.target.value })} required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-white focus:outline-none focus:border-blue-500 transition-all text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">End Time (IST)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input type="datetime-local" value={form.end_time}
                      onChange={(e) => setForm({ ...form, end_time: e.target.value })} required
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-white focus:outline-none focus:border-blue-500 transition-all text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Duration & Security */}
          <div className="bg-[#0F1928] border border-[#1B2D47] rounded-xl p-6">
            <h2 className="text-white font-semibold text-sm mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" /> Duration & Security
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">MCQ Duration (min)</label>
                <input type="number" value={form.mcq_duration_minutes} min={5} max={120}
                  onChange={(e) => setForm({ ...form, mcq_duration_minutes: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-white focus:outline-none focus:border-blue-500 text-center font-bold text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Coding Duration (min)</label>
                <input type="number" value={form.coding_duration_minutes} min={10} max={300}
                  onChange={(e) => setForm({ ...form, coding_duration_minutes: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-white focus:outline-none focus:border-blue-500 text-center font-bold text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Max Tab Switches</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                  <input type="number" value={form.max_tab_switches} min={1} max={100}
                    onChange={(e) => setForm({ ...form, max_tab_switches: Number(e.target.value) })}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[#0B1524] border border-[#1B2D47] text-white focus:outline-none focus:border-blue-500 text-center font-bold text-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : exam ? "Save Changes" : "Create Exam"}
            </button>
            <button type="button" onClick={() => router.back()}
              className="px-6 py-3 rounded-lg border border-[#1B2D47] text-slate-400 font-medium text-sm hover:border-slate-500 hover:text-white transition-all">
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
