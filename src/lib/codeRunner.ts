import { spawn } from "child_process";
import { writeFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const TIMEOUT_MS = 10_000;
const IS_WIN = process.platform === "win32";

function uid() {
  return randomBytes(8).toString("hex");
}

function spawnWithStdin(
  cmd: string,
  args: string[],
  stdin: string,
  cwd: string
): Promise<RunResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let done = false;

    const finish = (exitCode: number) => {
      if (done) return;
      done = true;
      resolve({ stdout, stderr, exitCode });
    };

    const proc = spawn(cmd, args, { cwd, shell: IS_WIN });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      stderr = "Time Limit Exceeded (10s)";
      finish(-1);
    }, TIMEOUT_MS);

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      clearTimeout(timer);
      finish(code ?? 0);
    });

    proc.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (err.code === "ENOENT") {
        stderr = `'${cmd}' is not installed on this server. Please install it to run ${cmd} code.`;
      } else {
        stderr += err.message;
      }
      finish(-1);
    });

    proc.stdin.write(stdin || "", () => proc.stdin.end());
  });
}

async function runPython(dir: string, code: string, stdin: string): Promise<RunResult> {
  const file = join(dir, "solution.py");
  await writeFile(file, code, "utf8");
  if (IS_WIN) {
    // Try 'py' launcher first (Windows Python Launcher, most reliable on Windows)
    // then fall back to 'python' if 'py' isn't found
    const result = await spawnWithStdin("py", [file], stdin, dir);
    if (result.exitCode !== -1 || !result.stderr.includes("is not installed")) {
      return result;
    }
    return spawnWithStdin("python", [file], stdin, dir);
  }
  return spawnWithStdin("python3", [file], stdin, dir);
}

async function runJava(dir: string, code: string, stdin: string): Promise<RunResult> {
  const match = code.match(/public\s+class\s+(\w+)/);
  const className = match?.[1] ?? "Solution";
  const file = join(dir, `${className}.java`);
  await writeFile(file, code, "utf8");

  const compile = await spawnWithStdin("javac", [file], "", dir);
  if (compile.exitCode !== 0) {
    return { stdout: "", stderr: compile.stderr || "Compilation failed", exitCode: compile.exitCode };
  }

  return spawnWithStdin("java", ["-cp", dir, className], stdin, dir);
}

export async function runCode(
  language: string,
  code: string,
  stdin: string
): Promise<RunResult> {
  const dir = join(tmpdir(), `exam_${uid()}`);
  await mkdir(dir, { recursive: true });

  try {
    switch (language) {
      case "python":     return await runPython(dir, code, stdin);
      case "java":       return await runJava(dir, code, stdin);
      default:
        return { stdout: "", stderr: "Unsupported language", exitCode: -1 };
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
