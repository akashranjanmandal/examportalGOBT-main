import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user_id } = await req.json();

  await supabase
    .from("users")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", user_id);

  await supabase.from("submissions").upsert(
    { user_id, is_auto_submitted: true, submitted_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ success: true });
}
