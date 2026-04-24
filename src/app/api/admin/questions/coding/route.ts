import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sets } = await supabase.from("coding_sets").select("*").order("set_number");
  const { data: rawQuestions } = await supabase
    .from("coding_questions")
    .select("*, coding_sets(set_number)")
    .order("set_id");

  const questions = rawQuestions?.map((q: any) => ({
    ...q,
    set_number: q.coding_sets?.set_number
  })) || [];

  return NextResponse.json({ sets: sets || [], questions });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { set_number, questions } = body;

  if (!set_number || !Array.isArray(questions)) {
    return NextResponse.json({ error: "set_number and questions array required" }, { status: 400 });
  }

  const { data: set } = await supabase
    .from("coding_sets")
    .select("id")
    .eq("set_number", set_number)
    .single();

  if (!set) return NextResponse.json({ error: "Set not found" }, { status: 404 });

  // Delete existing questions for this set
  await supabase.from("coding_questions").delete().eq("set_id", set.id);

  // Insert new questions
  const questionsWithSetId = questions.map((q: any) => ({ ...q, set_id: set.id }));
  const { data, error } = await supabase
    .from("coding_questions")
    .insert(questionsWithSetId)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, count: data.length });
}

export async function PUT(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, ...updateData } = await req.json();
  const { data, error } = await supabase
    .from("coding_questions")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, question: data });
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const { error } = await supabase.from("coding_questions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
