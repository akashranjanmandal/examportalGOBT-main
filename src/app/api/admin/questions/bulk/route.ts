import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { csvData } = await req.json();
    if (!csvData) return NextResponse.json({ error: "No data provided" }, { status: 400 });

    const lines = csvData.trim().split("\n");
    const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase());
    
    const questions = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Basic CSV parser that handles quotes
      const values: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let char of lines[i]) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const q: any = {};
      headers.forEach((header: string, idx: number) => {
        const val = values[idx];
        if (header === "question") q.question = val;
        else if (header.startsWith("option")) {
          if (!q.options) q.options = [];
          q.options.push(val);
        } else if (header === "correct_answers") {
          q.correct_answers = val.split(";").map((a: string) => a.trim());
        } else if (header === "topic") q.topic = val;
        else if (header === "difficulty") q.difficulty = val.toLowerCase();
        else if (header === "marks") q.marks = parseInt(val) || 1;
        else if (header === "is_multi_select") q.is_multi_select = val.toLowerCase() === "true";
      });

      if (!q.question || !q.options || !q.correct_answers || !q.topic) continue;
      
      // Auto-detect multi-select if not provided
      if (q.is_multi_select === undefined) {
        q.is_multi_select = q.correct_answers.length > 1;
      }

      questions.push(q);
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: "No valid questions found in CSV" }, { status: 400 });
    }

    const { error } = await supabase.from("questions_mcq").insert(questions);

    if (error) {
      console.error("CSV Import error:", error);
      return NextResponse.json({ error: "Failed to import questions" }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: questions.length });
  } catch (err) {
    console.error("MCQ Bulk API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
