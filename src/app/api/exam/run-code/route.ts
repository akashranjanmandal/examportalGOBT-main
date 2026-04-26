import { NextRequest, NextResponse } from "next/server";
import { runCode } from "@/lib/codeRunner";
import { wrapCode } from "@/lib/judge";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code, language, stdin, test_cases } = await req.json();

    if (!code || !language) {
      return NextResponse.json({ error: "Code and language required" }, { status: 400 });
    }

    const supported = ["python", "java"];
    if (!supported.includes(language)) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    const wrappedCode = wrapCode(language, code);

    // Multi-test-case mode
    if (Array.isArray(test_cases) && test_cases.length > 0) {
      const results = await Promise.all(
        test_cases.map(async (tc: any, idx: number) => {
          const expectedRaw = tc.expected_output ?? tc.output ?? "";
          try {
            const { stdout, stderr } = await runCode(language, wrappedCode, tc.input || "");
            const actual = stdout.trim().toLowerCase();
            const expected = String(expectedRaw).trim().toLowerCase();
            const passed = actual === expected;
            return { index: idx, passed, stdout, stderr, expected: String(expectedRaw), input: tc.input || "" };
          } catch (e: any) {
            return { index: idx, passed: false, stdout: "", stderr: e?.message || "Execution failed", expected: String(expectedRaw), input: tc.input || "" };
          }
        })
      );
      return NextResponse.json({ test_results: results });
    }

    // Single-run mode
    const { stdout, stderr, exitCode } = await runCode(language, wrappedCode, stdin || "");
    return NextResponse.json({ stdout, stderr, exit_code: exitCode });

  } catch (err: any) {
    const msg = err?.message || "Code execution failed";
    console.error("Run code error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
