import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { sendVerificationStatusEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { candidateId, action, notes } = await req.json();

    if (!candidateId || !["verify", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
    }

    const status = action === "verify" ? "verified" : "rejected";

    const { data: user, error } = await supabase
      .from("users")
      .update({ 
        status, 
        updated_at: new Date().toISOString()
      })
      .eq("id", candidateId)
      .select("name, email")
      .single();

    if (error) {
      console.error("Verification error:", error);
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    // Send Status Email
    try {
      await sendVerificationStatusEmail({
        to: user.email,
        name: user.name,
        status: status as "verified" | "rejected"
      });
    } catch (emailErr) {
      console.error("Failed to send status email:", emailErr);
    }

    // Log the action
    await supabase.from("admin_logs").insert({
      action: `candidate_${action}`,
      details: { candidateId, name: user.name, notes },
    });

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error("Verify API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

