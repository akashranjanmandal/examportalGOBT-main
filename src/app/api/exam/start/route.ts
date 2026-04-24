import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: user } = await supabase
      .from("users")
      .select("status, started_at")
      .eq("id", userId)
      .single();

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.status === "submitted") return NextResponse.json({ error: "Already submitted" }, { status: 403 });

    if (user.status === "not_started") {
      await supabase
        .from("users")
        .update({ status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", userId);
    }

    return NextResponse.json({ success: true, started_at: user.started_at || new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
