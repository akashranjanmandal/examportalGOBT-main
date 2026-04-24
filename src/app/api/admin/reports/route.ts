import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format");

  const { data: submissions } = await supabase
    .from("submissions")
    .select(`*, users(name, email, status, tab_switch_count, started_at, submitted_at, coding_set_number)`)
    .order("submitted_at", { ascending: false });

  if (format === "csv") {
    const rows = [
      ["Name", "Email", "MCQ Score", "Coding Score", "Total Score", "Tab Switches", "Auto Submit", "Started At", "Submitted At", "Coding Set"].join(","),
      ...(submissions || []).map((s: any) => [
        `"${s.users?.name || ""}"`,
        `"${s.users?.email || ""}"`,
        s.mcq_score,
        s.coding_score,
        s.total_score,
        s.users?.tab_switch_count || 0,
        s.is_auto_submitted ? "Yes" : "No",
        s.users?.started_at ? new Date(s.users.started_at).toLocaleString() : "",
        s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "",
        s.users?.coding_set_number || "",
      ].join(",")),
    ].join("\n");

    return new NextResponse(rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="gobt_exam_report_${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json({ submissions: submissions || [] });
}
