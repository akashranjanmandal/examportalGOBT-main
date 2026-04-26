import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { mcq_answers, coding_answers, is_auto_submitted, mcq_time_taken, coding_time_taken } =
      await req.json();

    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.status === "submitted") return NextResponse.json({ error: "Already submitted" }, { status: 403 });

    // Calculate MCQ score
    let mcqScore = 0;
    if (mcq_answers && Object.keys(mcq_answers).length > 0) {
      const questionIds = Object.keys(mcq_answers);
      const { data: questions } = await supabase
        .from("questions_mcq")
        .select("id, correct_answers, marks")
        .in("id", questionIds);

      if (questions) {
        for (const q of questions) {
          const userAnswer = mcq_answers[q.id] || [];
          const correct = q.correct_answers as string[];
          const isCorrect =
            correct.length === userAnswer.length &&
            correct.every((a: string) => userAnswer.includes(a));
          if (isCorrect) mcqScore += q.marks;
        }
      }
    }

    // Coding score is NOT evaluated here — admin will run tests and approve/reject
    const codingScore = 0;

    // Check for existing submission and update or insert
    const { data: existing } = await supabase
      .from("submissions")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    const submissionData = {
      user_id: userId,
      exam_id: user.exam_id,
      mcq_answers: mcq_answers || {},
      coding_answers: coding_answers || {},
      mcq_score: mcqScore,
      coding_score: codingScore,
      total_score: mcqScore + codingScore,
      mcq_time_taken,
      coding_time_taken,
      is_auto_submitted: is_auto_submitted || false,
      submitted_at: new Date().toISOString(),
    };

    let subError;
    if (existing) {
      ({ error: subError } = await supabase
        .from("submissions")
        .update(submissionData)
        .eq("id", existing.id));
    } else {
      ({ error: subError } = await supabase
        .from("submissions")
        .insert(submissionData));
    }

    if (subError) {
      console.error("Submission error:", subError);
      return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
    }

    // Update user status
    await supabase
      .from("users")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", userId);

    return NextResponse.json({ success: true, mcq_score: mcqScore });
  } catch (err) {
    console.error("Submit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
