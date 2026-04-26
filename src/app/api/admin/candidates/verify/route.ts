import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { sendVerificationStatusEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { candidateId, action, notes, codingResults } = await req.json();

    if (!candidateId || !["verify", "reject", "score"].includes(action)) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
    }

    const status = action === "verify" ? "verified" : action === "reject" ? "rejected" : null;

    // If admin ran test cases, save coding scores into the submission
    if (codingResults && Object.keys(codingResults).length > 0) {
      // Get the existing submission
      const { data: submission } = await supabase
        .from("submissions")
        .select("id, mcq_score, coding_answers")
        .eq("user_id", candidateId)
        .maybeSingle();

      if (submission) {
        let totalCodingScore = 0;
        const updatedCodingAnswers = { ...(submission.coding_answers || {}) };

        // codingResults is { [questionId]: { test_results, passed_count, total_tests, marks } }
        for (const [questionId, result] of Object.entries(codingResults) as [string, any][]) {
          const passedCount = result.passed_count || 0;
          const totalTests = result.total_tests || 1;
          const marks = result.marks || 0;

          // Proportional scoring
          const questionScore = Math.round((passedCount / totalTests) * marks);
          totalCodingScore += questionScore;

          // Update coding_answers with test results for this question
          updatedCodingAnswers[questionId] = {
            ...(updatedCodingAnswers[questionId] || {}),
            test_results: result.test_results || [],
            passed_count: passedCount,
            total_tests: totalTests,
            score: questionScore,
          };
        }

        // Update the submission with coding scores
        await supabase
          .from("submissions")
          .update({
            coding_answers: updatedCodingAnswers,
            coding_score: totalCodingScore,
            total_score: (submission.mcq_score || 0) + totalCodingScore,
          })
          .eq("id", submission.id);
      }
    }

    // For "score" action, skip status change — just save scores and return
    if (action === "score") {
      return NextResponse.json({ success: true, action: "score" });
    }

    // Update user status
    const { data: user, error } = await supabase
      .from("users")
      .update({
        status: status!,
        updated_at: new Date().toISOString()
      })
      .eq("id", candidateId)
      .select("name, email")
      .single();

    if (error) {
      console.error("Verification error:", error);
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    // Send Status Email
    try {
      await sendVerificationStatusEmail({
        to: user.email,
        name: user.name,
        status: status as "verified" | "rejected"
      });
    } catch (emailErr) {
      console.error("Failed to send status email:", emailErr);
    }

    // Log the action
    await supabase.from("admin_logs").insert({
      action: `candidate_${action}`,
      details: { candidateId, name: user.name, notes },
    });

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error("Verify API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
