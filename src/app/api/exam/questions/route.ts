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

    let mcqQuestions = allMCQ || [];

    if (user.mcq_set_order && Array.isArray(user.mcq_set_order)) {
      const orderMap = new Map<string, number>(
        user.mcq_set_order.map((id: string, idx: number) => [id, idx] as [string, number])
      );
      mcqQuestions = mcqQuestions.sort(
        (a: { id: string }, b: { id: string }) => {
          const ai: number = orderMap.get(a.id) ?? 999;
          const bi: number = orderMap.get(b.id) ?? 999;
          return ai - bi;
        }
      );
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
          "id, title, description, difficulty, constraints, sample_input, sample_output, time_limit_ms, memory_limit_mb, marks"
        )
        .eq("set_id", codingSet.id)
        .order("difficulty");

      codingQuestions = (cq || []).slice(0, 3);
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
