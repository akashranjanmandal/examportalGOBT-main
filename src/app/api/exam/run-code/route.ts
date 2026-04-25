import { NextRequest, NextResponse } from "next/server";

const PISTON_LANG: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  java: "java",
  cpp: "c++",
};

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code, language, stdin, test_cases } = await req.json();

    if (!code || !language) {
      return NextResponse.json({ error: "Code and language required" }, { status: 400 });
    }

    const pistonLang = PISTON_LANG[language];
    if (!pistonLang) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    const runOnce = async (input: string) => {
      const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: pistonLang,
          version: "*",
          files: [{ content: code }],
          stdin: input || "",
          run_timeout: 10000,
          compile_timeout: 15000,
        }),
      });
      if (!res.ok) throw new Error("Execution service unavailable");
      return res.json();
    };

    // Multi-test-case mode
    if (Array.isArray(test_cases) && test_cases.length > 0) {
      const results = await Promise.all(
        test_cases.map(async (tc: { input: string; expected_output: string }, idx: number) => {
          try {
            const data = await runOnce(tc.input);
            const stdout = data.run?.stdout || "";
            const stderr = (data.compile?.stderr || "") + (data.run?.stderr || "");
            const passed = stdout.trim() === (tc.expected_output || "").trim();
            return { index: idx, passed, stdout, stderr, expected: tc.expected_output };
          } catch {
            return { index: idx, passed: false, stdout: "", stderr: "Execution failed", expected: tc.expected_output };
          }
        })
      );
      return NextResponse.json({ test_results: results });
    }

    // Single-run mode
    const data = await runOnce(stdin || "");
    const compileStderr = data.compile?.stderr || "";
    const runStdout = data.run?.stdout || "";
    const runStderr = data.run?.stderr || "";
    const exitCode = data.run?.code ?? -1;

    return NextResponse.json({
      stdout: runStdout,
      stderr: compileStderr + runStderr,
      exit_code: exitCode,
      version: data.version,
    });
  } catch (err) {
    console.error("Run code error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
