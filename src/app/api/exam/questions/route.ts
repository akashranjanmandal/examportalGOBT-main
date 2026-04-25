import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get MCQ questions in user's shuffled order
    const { data: allMCQ } = await supabase
      .from("questions_mcq")
      .select("id, question, options, is_multi_select, difficulty, topic, marks");

    // Deduplicate by id
    const seenMcq = new Set<string>();
    let mcqQuestions = (allMCQ || []).filter((q: { id: string }) => {
      if (seenMcq.has(q.id)) return false;
      seenMcq.add(q.id);
      return true;
    });

    if (user.mcq_set_order && Array.isArray(user.mcq_set_order)) {
      const orderMap = new Map<string, number>(
        user.mcq_set_order.map((id: string, idx: number) => [id, idx] as [string, number])
      );
      // Only include questions that are in the user's assigned order
      mcqQuestions = mcqQuestions
        .filter((q: { id: string }) => orderMap.has(q.id))
        .sort((a: { id: string }, b: { id: string }) => {
          const ai = orderMap.get(a.id) ?? 999;
          const bi = orderMap.get(b.id) ?? 999;
          return ai - bi;
        });
    }

    // Take first 30
    mcqQuestions = mcqQuestions.slice(0, 30);

    // Get coding questions for user's assigned set
    const { data: codingSet } = await supabase
      .from("coding_sets")
      .select("id")
      .eq("set_number", user.coding_set_number || 1)
      .single();

    let codingQuestions: any[] = [];
    if (codingSet) {
      const { data: cq } = await supabase
        .from("coding_questions")
        .select(
          "id, title, description, difficulty, constraints, sample_input, sample_output, time_limit_ms, memory_limit_mb, marks, test_cases"
        )
        .eq("set_id", codingSet.id)
        .order("difficulty");

      const seenCoding = new Set<string>();
      codingQuestions = (cq || [])
        .filter((q: { id: string }) => {
          if (seenCoding.has(q.id)) return false;
          seenCoding.add(q.id);
          return true;
        })
        .slice(0, 3)
        .map((q: any) => ({
          ...q,
          // Only expose non-hidden test cases to candidates
          test_cases: (q.test_cases || []).filter((tc: any) => !tc.is_hidden),
        }));
    }

    return NextResponse.json({
      mcq: mcqQuestions,
      coding: codingQuestions,
    });
  } catch (err) {
    console.error("Questions fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
