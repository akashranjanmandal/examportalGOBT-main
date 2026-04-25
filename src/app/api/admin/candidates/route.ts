import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/auth";
import { generateAccessCode } from "@/lib/auth";
import { sendAccessCodeEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: users, error } = await supabase
    .from("users")
    .select(`*, submissions(mcq_score, coding_score, total_score, submitted_at, is_auto_submitted)`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ candidates: users });
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, exam_date, exam_time, duration } = await req.json();

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email required" }, { status: 400 });
  }

  const access_code = generateAccessCode();

  const { data: user, error } = await supabase
    .from("users")
    .insert({ name, email: email.toLowerCase(), access_code })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send access code email
  try {
    await sendAccessCodeEmail({
      to: email,
      name,
      accessCode: access_code,
      examDate: exam_date || "To be announced",
      examTime: exam_time || "To be announced",
      duration: duration || "80 minutes (20 min MCQ + 60 min Coding)",
    });
  } catch (emailErr) {
    console.error("Email failed:", emailErr);
  }

  return NextResponse.json({ success: true, user, access_code });
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  await supabase.from("users").delete().eq("id", id);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, name, email, coding_set_number } = await req.json();

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email.toLowerCase();
  if (coding_set_number !== undefined) {
    const setNum = Number(coding_set_number);
    if (isNaN(setNum) || setNum < 1 || setNum > 10) {
      return NextResponse.json({ error: "coding_set_number must be 1–10" }, { status: 400 });
    }
    updates.coding_set_number = setNum;
  }

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

