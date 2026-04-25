import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the user record to know their assigned question sets
    const { data: user } = await supabase
      .from("users")
      .select("id, name, email, status, tab_switch_count, extra_time_minutes, mcq_set_order, coding_set_number, exam_id")
      .eq("id", id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get submission (may not exist if not yet submitted)
    const { data: submission } = await supabase
      .from("submissions")
      .select("*")
      .eq("user_id", id)
      .maybeSingle();

    const mcqAnswers = submission?.mcq_answers || {};
    const codingAnswers = submission?.coding_answers || {};

    // Fetch ALL MCQ questions assigned to this user (from their mcq_set_order)
    const assignedMcqIds: string[] = Array.isArray(user.mcq_set_order) ? user.mcq_set_order : [];
    let mcqQuestions: any[] = [];
    if (assignedMcqIds.length > 0) {
      const { data } = await supabase
        .from("questions_mcq")
        .select("id, question, options, correct_answers, topic, marks, is_multi_select")
        .in("id", assignedMcqIds);
      if (data) {
        // Preserve the assigned order
        const byId = Object.fromEntries(data.map((q: any) => [q.id, q]));
        mcqQuestions = assignedMcqIds.map((qid) => byId[qid]).filter(Boolean);
      }
    } else {
      // Fallback: fetch only answered questions if no set_order stored
      const answeredIds = Object.keys(mcqAnswers);
      if (answeredIds.length > 0) {
        const { data } = await supabase
          .from("questions_mcq")
          .select("id, question, options, correct_answers, topic, marks, is_multi_select")
          .in("id", answeredIds);
        mcqQuestions = data || [];
      }
    }

    // Fetch ALL coding questions assigned to this user (from their coding set)
    let codingQuestions: any[] = [];
    if (user.coding_set_number) {
      const { data: codingSet } = await supabase
        .from("coding_sets")
        .select("id")
        .eq("set_number", user.coding_set_number)
        .single();

      if (codingSet) {
        const { data } = await supabase
          .from("coding_questions")
          .select("id, title, description, difficulty, sample_input, sample_output, marks, test_cases")
          .eq("set_id", codingSet.id);
        codingQuestions = data || [];
      }
    } else {
      // Fallback: fetch from answered coding question IDs
      const answeredCodingIds = Object.keys(codingAnswers);
      if (answeredCodingIds.length > 0) {
        const { data } = await supabase
          .from("coding_questions")
          .select("id, title, description, difficulty, sample_input, sample_output, marks, test_cases")
          .in("id", answeredCodingIds);
        codingQuestions = data || [];
      }
    }

    // Build a unified submission object that includes user info
    const submissionWithUser = submission
      ? { ...submission, users: user }
      : {
          user_id: id,
          mcq_answers: {},
          coding_answers: {},
          mcq_score: 0,
          coding_score: 0,
          total_score: 0,
          is_auto_submitted: false,
          submitted_at: null,
          users: user,
        };

    return NextResponse.json({
      submission: submissionWithUser,
      mcqQuestions,
      codingQuestions,
    });
  } catch (err) {
    console.error("Submission detail API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
