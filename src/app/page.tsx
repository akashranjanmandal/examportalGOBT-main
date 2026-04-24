"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Monitor, Globe, KeyRound, Mail, ArrowRight, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isChrome, setIsChrome] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const ua = navigator.userAgent;
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const chrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
    setIsMobile(mobile);
    setIsChrome(chrome);
    const token = sessionStorage.getItem("gobt_token");
    const user = sessionStorage.getItem("gobt_user");
    if (token && user) {
      const u = JSON.parse(user);
      if (u.status === "submitted") router.push("/submitted");
      else router.push("/instructions");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), access_code: accessCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Login failed"); return; }
      sessionStorage.setItem("gobt_token", data.token);
      sessionStorage.setItem("gobt_user", JSON.stringify(data.user));
      sessionStorage.setItem("gobt_exam", JSON.stringify(data.exam));
      toast.success(`Welcome, ${data.user.name}!`);
      router.push("/instructions");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm bg-white border border-gray-200 rounded-2xl p-10 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <Monitor className="w-7 h-7 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Desktop Only</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            This exam portal is only accessible on a desktop or laptop computer. Mobile devices are not supported.
          </p>
        </div>
      </div>
    );
  }

  if (!isChrome) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm bg-white border border-gray-200 rounded-2xl p-10 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
            <Globe className="w-7 h-7 text-blue-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-3">Chrome Required</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Please open this portal in <span className="font-semibold text-gray-800">Google Chrome</span> for the best experience and full functionality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-4 shadow-lg shadow-blue-600/20">
            <span className="text-white text-xl font-black">G</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">GOBT Developer Program</h1>
          <p className="text-gray-500 text-sm mt-1">Technical Assessment Portal</p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm">
          <h2 className="text-gray-800 font-semibold text-sm mb-5">Sign in to continue</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 text-sm focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Access Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  required
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 font-mono text-sm tracking-widest text-center focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <p className="text-gray-400 text-xs mt-1.5 text-center">Access code was sent to your registered email</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20 mt-1"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Proceed to Exam
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
          <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 text-xs leading-relaxed">
            This exam is monitored. Tab switching, copy-paste, and external tools are strictly prohibited.
          </p>
        </div>

        <p className="text-center text-gray-400 text-xs mt-5">
          GOBT Developer Program &bull; Confidential
        </p>
      </div>
    </div>
  );
}
