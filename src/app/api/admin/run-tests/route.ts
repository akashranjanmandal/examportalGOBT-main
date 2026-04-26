import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { runCode } from "@/lib/codeRunner";
import { wrapCode } from "@/lib/judge";

export const maxDuration = 60;

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

    const supported = ["python", "javascript", "java", "cpp"];
    if (!supported.includes(language)) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    const { data: question } = await supabase
      .from("coding_questions")
      .select("test_cases")
      .eq("id", question_id)
      .single();

    const testCases: Array<{ input: string; expected_output: string; is_hidden: boolean }> =
      (question?.test_cases || []).map((tc: any) => ({
        input: tc.input ?? "",
        expected_output: tc.expected_output ?? tc.output ?? "",
        is_hidden: tc.is_hidden ?? false,
      }));

    if (!testCases.length) {
      return NextResponse.json({ test_results: [], message: "No test cases found" });
    }

    const wrappedCode = wrapCode(language, code);

    const results = await Promise.all(
      testCases.map(async (tc, idx) => {
        try {
          const { stdout, stderr } = await runCode(language, wrappedCode, tc.input || "");
          const actual = stdout.trim().toLowerCase();
          const expected = String(tc.expected_output ?? "").trim().toLowerCase();
          const passed = actual === expected;
          return { index: idx, passed, stdout, stderr, expected: tc.expected_output ?? "", is_hidden: tc.is_hidden };
        } catch (e: any) {
          return { index: idx, passed: false, stdout: "", stderr: e?.message || "Execution failed", expected: tc.expected_output ?? "", is_hidden: tc.is_hidden };
        }
      })
    );

    return NextResponse.json({ test_results: results });
  } catch (err: any) {
    console.error("Admin run-tests error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
