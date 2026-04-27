import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { runCode } from "@/lib/codeRunner";
import { wrapCode } from "@/lib/judge";

export const maxDuration = 60;

function formatInput(input: any): string {
  if (typeof input === "string") return input;
  return JSON.stringify(input);
}

function normalizeOutput(value: any): string {
  if (Array.isArray(value)) {
    const sorted = value
      .map((item) => (Array.isArray(item) ? [...item].sort() : item))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return JSON.stringify(sorted);
  }
  return JSON.stringify(value);
}

// Robust comparison for List of Lists (handles missing quotes, spaces, and different orders)
function cleanAndSort(str: string): string {
  // 1. Remove all quotes, spaces, and newlines. Convert to lowercase.
  const clean = str.replace(/["'\s\r\n]/g, "").toLowerCase();
  // 2. Extract groups (content inside brackets)
  // This handles nested structures like [[a,b],[c]]
  const groups = clean.match(/\[([^\[\]]+)\]/g) || [];
  if (groups.length === 0) return clean; // Fallback for simple strings

  // 3. Sort items inside each group, then sort the groups themselves
  const sortedGroups = groups.map(g => {
    const items = g.replace(/[\[\]]/g, "").split(",");
    return "[" + items.sort().join(",") + "]";
  }).sort();
  
  return sortedGroups.join(",");
}

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

    const testCases: Array<{ input: string; expected_output: any; is_hidden: boolean }> =
      (question?.test_cases || []).map((tc: any) => ({
        input: formatInput(tc.input),
        expected_output: tc.expected_output ?? tc.output ?? "",
        is_hidden: tc.is_hidden ?? false,
      }));

    if (!testCases.length) {
      return NextResponse.json({ test_results: [], message: "No test cases found" });
    }

    const wrappedCode = wrapCode(language, code);

    const results = [];
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        const result = await runCode(language, wrappedCode, tc.input || "");
        
        const actual = result.stdout.trim();
        const expectedRaw = tc.expected_output;
        const expectedStr = typeof expectedRaw === "string"
          ? expectedRaw.trim()
          : JSON.stringify(expectedRaw);

        // 1. Try exact match first
        let passed = actual === expectedStr;
        
        // 2. Try normalized comparison (handles formatting and order)
        if (!passed) {
          passed = cleanAndSort(actual) === cleanAndSort(expectedStr);
        }

        // 3. Fallback to JSON normalization if possible
        if (!passed) {
          try {
            passed = normalizeOutput(JSON.parse(actual)) === normalizeOutput(JSON.parse(expectedStr));
          } catch { }
        }

        results.push({
          index: i,
          passed,
          stdout: result.stdout,
          stderr: result.stderr,
          expected: typeof tc.expected_output === "string" ? tc.expected_output : JSON.stringify(tc.expected_output, null, 2),
          is_hidden: tc.is_hidden
        });
      } catch (e: any) {
        results.push({
          index: i,
          passed: false,
          stdout: "",
          stderr: e?.message || "Execution failed",
          expected: typeof tc.expected_output === "string" ? tc.expected_output : JSON.stringify(tc.expected_output, null, 2),
          is_hidden: tc.is_hidden
        });
      }
    }

    return NextResponse.json({ test_results: results });
  } catch (err: any) {
    console.error("Admin run-tests error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
