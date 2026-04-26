import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { assignMCQOrder, assignCodingSet } from "@/lib/roundRobin";

export async function POST(req: NextRequest) {
  try {
    const { email, access_code } = await req.json();

    if (!email || !access_code) {
      return NextResponse.json(
        { error: "Email and access code are required" },
        { status: 400 }
      );
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase().trim())
      .eq("access_code", access_code.toUpperCase().trim())
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Invalid email or access code" },
        { status: 401 }
      );
    }

    if (user.status === "submitted") {
      return NextResponse.json(
        { error: "You have already submitted the exam" },
        { status: 403 }
      );
    }

    // Check active exam
    const { data: exam } = await supabase
      .from("exams")
      .select("*")
      .eq("is_active", true)
      .single();

    if (!exam) {
      return NextResponse.json(
        { error: "No active exam found. Please contact admin." },
        { status: 403 }
      );
    }

    const now = new Date();
    const examStart = new Date(exam.start_time);
    const examEnd = new Date(exam.end_time);

    if (now < examStart) {
      const istStr = examStart.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
      return NextResponse.json(
        { error: `Exam not started yet. It starts on ${istStr} IST` },
        { status: 403 }
      );
    }

    if (now > examEnd) {
      return NextResponse.json(
        { error: "Exam window has closed" },
        { status: 403 }
      );
    }

    // Assign MCQ order and coding set if first login
    if (!user.mcq_set_order || !user.coding_set_number) {
      const { data: allQuestions } = await supabase
        .from("questions_mcq")
        .select("id, question");

      // Deduplicate by both ID and question text so no repeated content in assigned order
      const seenIds = new Set<string>();
      const seenTexts = new Set<string>();
      const uniqueQuestions = (allQuestions || []).filter((q: { id: string; question: string }) => {
        if (seenIds.has(q.id)) return false;
        const key = q.question?.trim().toLowerCase();
        if (key && seenTexts.has(key)) return false;
        seenIds.add(q.id);
        if (key) seenTexts.add(key);
        return true;
      });
      const questionIds = uniqueQuestions.map((q: { id: string }) => q.id);
      const shuffledOrder = await assignMCQOrder(questionIds);
      const codingSetNumber = await assignCodingSet();

      await supabase
        .from("users")
        .update({
          mcq_set_order: shuffledOrder,
          coding_set_number: codingSetNumber,
          exam_id: exam.id,
        })
        .eq("id", user.id);

      user.mcq_set_order = shuffledOrder;
      user.coding_set_number = codingSetNumber;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        exam_id: exam.id,
      },
      exam: {
        id: exam.id,
        title: exam.title,
        mcq_duration_minutes: exam.mcq_duration_minutes,
        coding_duration_minutes: exam.coding_duration_minutes,
        max_tab_switches: exam.max_tab_switches,
      },
      token: user.id,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
