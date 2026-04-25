import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

const PISTON_LANG: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  java: "java",
  cpp: "c++",
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code, language, question_id } = await req.json();

    if (!code || !language || !question_id) {
      return NextResponse.json({ error: "code, language and question_id required" }, { status: 400 });
    }

    const pistonLang = PISTON_LANG[language];
    if (!pistonLang) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    const { data: question } = await supabase
      .from("coding_questions")
      .select("test_cases")
      .eq("id", question_id)
      .single();

    const testCases: Array<{ input: string; expected_output: string; is_hidden: boolean }> =
      question?.test_cases || [];

    if (!testCases.length) {
      return NextResponse.json({ test_results: [], message: "No test cases found" });
    }

    const results = await Promise.all(
      testCases.map(async (tc, idx) => {
        try {
          const res = await fetch("https://emkc.org/api/v2/piston/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              language: pistonLang,
              version: "*",
              files: [{ content: code }],
              stdin: tc.input || "",
              run_timeout: 10000,
              compile_timeout: 15000,
            }),
          });
          if (!res.ok) {
            return { index: idx, passed: false, stdout: "", stderr: "Execution service unavailable", expected: tc.expected_output, is_hidden: tc.is_hidden };
          }
          const data = await res.json();
          const stdout = data.run?.stdout || "";
          const stderr = (data.compile?.stderr || "") + (data.run?.stderr || "");
          const passed = stdout.trim() === (tc.expected_output || "").trim();
          return { index: idx, passed, stdout, stderr, expected: tc.expected_output, is_hidden: tc.is_hidden };
        } catch {
          return { index: idx, passed: false, stdout: "", stderr: "Network error", expected: tc.expected_output, is_hidden: tc.is_hidden };
        }
      })
    );

    return NextResponse.json({ test_results: results });
  } catch (err) {
    console.error("Admin run-tests error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
