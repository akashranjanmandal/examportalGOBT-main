import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: user } = await supabase
    .from("users")
    .select("tab_switch_count, exam_id")
    .eq("id", userId)
    .single();

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newCount = (user.tab_switch_count || 0) + 1;
  await supabase
    .from("users")
    .update({ tab_switch_count: newCount })
    .eq("id", userId);

  const { data: exam } = await supabase
    .from("exams")
    .select("max_tab_switches")
    .eq("id", user.exam_id)
    .single();

  const maxSwitches = exam?.max_tab_switches || 3;
  const shouldAutoSubmit = newCount >= maxSwitches;

  return NextResponse.json({ count: newCount, should_submit: shouldAutoSubmit, max: maxSwitches });
}
