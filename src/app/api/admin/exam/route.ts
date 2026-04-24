import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: exams } = await supabase
    .from("exams")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ exams: exams || [] });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, start_time, end_time, mcq_duration_minutes, coding_duration_minutes, max_tab_switches } = body;

  // Deactivate all existing exams
  await supabase.from("exams").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");

  const { data: exam, error } = await supabase
    .from("exams")
    .insert({ title, start_time, end_time, mcq_duration_minutes, coding_duration_minutes, max_tab_switches, is_active: true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, exam });
}

export async function PUT(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, ...updates } = await req.json();
  const { data, error } = await supabase.from("exams").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, exam: data });
}
