"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mail, ArrowRight } from "lucide-react";

const NEXT_STEPS = [
  "Your submission has been received and is being processed",
  "MCQ scores will be calculated automatically",
  "Coding solutions will be reviewed by the GOBT team",
  "Results will be communicated via email within 5–7 business days",
];

export default function SubmittedPage() {
  const router = useRouter();

  useEffect(() => {
    sessionStorage.clear();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Success Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center mb-4">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-200 mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Exam Submitted</h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            Your responses have been successfully recorded. The GOBT team will review your submission and notify you of the next steps.
          </p>
        </div>

        {/* Next Steps */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-4">
          <h2 className="text-gray-800 font-semibold text-sm mb-4">What happens next?</h2>
          <div className="space-y-3">
            {NEXT_STEPS.map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow shadow-blue-600/20">
                  {i + 1}
                </span>
                <p className="text-gray-600 text-sm leading-relaxed pt-0.5">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3 mb-6">
          <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-blue-700 text-sm">
            For queries, contact us at{" "}
            <a href="mailto:support@gobt.in" className="font-semibold underline underline-offset-2">
              support@gobt.in
            </a>
          </p>
        </div>

        {/* Branding Footer */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow shadow-blue-600/20">
            <span className="text-white text-xs font-black">G</span>
          </div>
          <span className="text-gray-500 text-sm font-medium">GOBT Developer Program</span>
        </div>
      </div>
    </div>
  );
}
