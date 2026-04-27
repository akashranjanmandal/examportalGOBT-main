import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/auth";
import { sendAccessCodeEmail, sendExamReminderEmail, sendVerificationStatusEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidateIds, type, examInfo } = await req.json();

  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return NextResponse.json({ error: "No candidates selected" }, { status: 400 });
  }

  const { data: users, error } = await supabase
    .from("users")
    .select("*, submissions(total_score)")
    .in("id", candidateIds);

  if (error || !users) {
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Parallelize email sending for speed and to avoid 504 timeouts
  const emailPromises = users.map(async (user) => {
    try {
      if (type === "access_code") {
        await sendAccessCodeEmail({
          to: user.email,
          name: user.name,
          accessCode: user.access_code,
          examDate: examInfo?.exam_date || "TBA",
          examTime: examInfo?.exam_time || "TBA",
          duration: examInfo?.duration || "80 minutes",
        });
      } else if (type === "reminder") {
        await sendExamReminderEmail({
          to: user.email,
          name: user.name,
          examDate: examInfo?.exam_date || "TBA",
          examTime: examInfo?.exam_time || "TBA",
        });
      } else if (type === "result") {
        if (!user.status || user.status === "in_progress") {
          return { success: false, error: `${user.email}: Status must be verified, rejected or submitted` };
        }
        
        let targetStatus = user.status;
        if (user.status === "submitted") {
          await supabase.from("users").update({ status: "verified" }).eq("id", user.id);
          targetStatus = "verified";
        }

        await sendVerificationStatusEmail({
          to: user.email,
          name: user.name,
          status: targetStatus as "verified" | "rejected",
          marks: user.submissions?.[0]?.total_score,
        });
      }
      return { success: true };
    } catch (e: any) {
      console.error(`Bulk email failed for ${user.email}:`, e);
      return { success: false, error: `${user.email}: ${e.message}` };
    }
  });

  const mailResults = await Promise.allSettled(emailPromises);
  
  mailResults.forEach((res) => {
    if (res.status === 'fulfilled') {
      if (res.value.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(res.value.error!);
      }
    } else {
      results.failed++;
      results.errors.push("Unknown fatal error during processing");
    }
  });

  return NextResponse.json({ 
    success: true, 
    sent: results.success, 
    failed: results.failed,
    details: results.errors 
  });
}
