import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { verifyAdminSession } from "@/lib/auth";
import { generateAccessCode } from "@/lib/auth";
import { sendAccessCodeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  if (!(await verifyAdminSession(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { candidates, csvData, exam_date, exam_time, duration } = await req.json();

  let candidateList = candidates;

  if (csvData) {
    candidateList = [];
    const lines = csvData.trim().split("\n");
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const [name, email] = lines[i].split(",").map((s: string) => s.trim().replace(/^"|"$/g, ''));
      if (name && email) candidateList.push({ name, email });
    }
  }

  if (!Array.isArray(candidateList) || candidateList.length === 0) {
    return NextResponse.json({ error: "Candidates array or CSV data required" }, { status: 400 });
  }

  // Parallelize DB insertions for speed
  const processResults = await Promise.all(candidateList.map(async (c) => {
    const access_code = generateAccessCode();
    try {
      const { data: user, error } = await supabase
        .from("users")
        .insert({ 
          name: c.name, 
          email: c.email.toLowerCase().trim(), 
          access_code 
        })
        .select()
        .single();

      if (error) {
        return { success: false, email: c.email, error: error.message };
      }
      return { success: true, user, access_code };
    } catch (e: any) {
      return { success: false, email: c.email, error: e.message };
    }
  }));

  const successful = processResults.filter((r): r is { success: true, user: any, access_code: string } => r.success);
  const errors = processResults.filter((r): r is { success: false, email: string, error: string } => !r.success).map(r => ({ email: r.email, error: r.error }));

  // Parallelize Emails - using allSettled so one failure doesn't stop others
  // We don't strictly await this if we want to be ultra-fast, but 
  // for 60-100 emails, Promise.allSettled is usually fast enough (~2-5s total)
  if (successful.length > 0) {
    await Promise.allSettled(successful.map(res => 
      sendAccessCodeEmail({
        to: res.user.email,
        name: res.user.name,
        accessCode: res.access_code,
        examDate: exam_date || "To be announced",
        examTime: exam_time || "To be announced",
        duration: duration || "80 minutes",
      })
    ));
  }

  return NextResponse.json({ 
    success: true, 
    added: successful.length, 
    errors 
  });
}

