import { NextRequest, NextResponse } from "next/server";
import { runCode } from "@/lib/codeRunner";
import { runViaPiston } from "@/lib/piston";
import { wrapCode } from "@/lib/judge";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code, language, stdin } = await req.json();

    if (!code || !language) {
      return NextResponse.json({ error: "Code and language required" }, { status: 400 });
    }

    const supported = ["python", "java"];
    if (!supported.includes(language)) {
      return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
    }

    const wrappedCode = wrapCode(language, code);

    // Use Piston API in production, local execution in development
    let result;
    if (process.env.PISTON_API_URL) {
      result = await runViaPiston(language, wrappedCode, stdin || "");
    } else {
      result = await runCode(language, wrappedCode, stdin || "");
    }

    return NextResponse.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.exitCode,
    });

  } catch (err: any) {
    const msg = err?.message || "Code execution failed";
    console.error("Run code error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
