// Piston API client — used for student "Run Code" in production
// Piston is self-hosted on EC2, set PISTON_API_URL env var

export interface PistonResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const PISTON_LANG_MAP: Record<string, { language: string; version: string }> = {
  python: { language: "python", version: "3.10" },
  java:   { language: "java",   version: "15.0.2" },
};

export async function runViaPiston(
  language: string,
  code: string,
  stdin: string
): Promise<PistonResult> {
  const pistonUrl = process.env.PISTON_API_URL;
  if (!pistonUrl) {
    return { stdout: "", stderr: "PISTON_API_URL not configured", exitCode: -1 };
  }

  const langConfig = PISTON_LANG_MAP[language];
  if (!langConfig) {
    return { stdout: "", stderr: `Unsupported language: ${language}`, exitCode: -1 };
  }

  try {
    const res = await fetch(`${pistonUrl.replace(/\/+$/, "")}/api/v2/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ name: language === "java" ? "Solution.java" : "solution.py", content: code }],
        stdin: stdin || "",
        run_timeout: 3000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { stdout: "", stderr: `Piston API error (${res.status}): ${errText}`, exitCode: -1 };
    }

    const data = await res.json();

    // Piston returns { run: { stdout, stderr, code, signal, output }, compile?: {...} }
    const compileErr = data.compile?.stderr || "";
    if (data.compile && data.compile.code !== 0 && compileErr) {
      return { stdout: "", stderr: compileErr, exitCode: data.compile.code ?? 1 };
    }

    return {
      stdout: data.run?.stdout || "",
      stderr: data.run?.stderr || "",
      exitCode: data.run?.code ?? 0,
    };
  } catch (err: any) {
    return { stdout: "", stderr: `Piston connection failed: ${err?.message || "Unknown error"}`, exitCode: -1 };
  }
}
