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

    // Deduplicate by question text to eliminate content duplicates with different IDs
    const seenMcqText = new Set<string>();
    mcqQuestions = mcqQuestions.filter((q: { question: string }) => {
      const key = q.question?.trim().toLowerCase();
      if (!key || seenMcqText.has(key)) return false;
      seenMcqText.add(key);
      return true;
    });

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
      const seenCodingTitle = new Set<string>();
      codingQuestions = (cq || [])
        .filter((q: { id: string; title: string }) => {
          if (seenCoding.has(q.id)) return false;
          const titleKey = q.title?.trim().toLowerCase();
          if (titleKey && seenCodingTitle.has(titleKey)) return false;
          seenCoding.add(q.id);
          if (titleKey) seenCodingTitle.add(titleKey);
          return true;
        })
        .slice(0, 3)
        .map((q: any) => ({
          ...q,
          // Normalise field names and strip hidden test cases
          test_cases: (q.test_cases || [])
            .filter((tc: any) => !tc.is_hidden)
            .map((tc: any) => ({
              input: tc.input ?? "",
              expected_output: tc.expected_output ?? tc.output ?? "",
              is_hidden: false,
            })),
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
