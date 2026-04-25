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

    const { code, language, stdin } = await req.json();

    if (!code || !language) {
      return NextResponse.json({ error: "Code and language required" }, { status: 400 });
    }

    const pistonLang = PISTON_LANG[language];
    if (!pistonLang) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    const res = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: pistonLang,
        version: "*",
        files: [{ content: code }],
        stdin: stdin || "",
        run_timeout: 10000,
        compile_timeout: 15000,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Execution service unavailable" }, { status: 503 });
    }

    const data = await res.json();
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
