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

  const results = [];
  const errors = [];

  for (const c of candidateList) {
    const access_code = generateAccessCode();
    const { data: user, error } = await supabase
      .from("users")
      .insert({ name: c.name, email: c.email.toLowerCase(), access_code })
      .select()
      .single();

    if (error) {
      errors.push({ email: c.email, error: error.message });
      continue;
    }

    try {
      await sendAccessCodeEmail({
        to: c.email,
        name: c.name,
        accessCode: access_code,
        examDate: exam_date || "To be announced",
        examTime: exam_time || "To be announced",
        duration: duration || "80 minutes",
      });
    } catch (e) {
      console.error(`Email failed for ${c.email}:`, e);
    }

    results.push({ ...user, access_code });
  }

  return NextResponse.json({ success: true, added: results.length, errors });
}

