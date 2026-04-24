import { supabase } from "./supabase";
import { cookies } from "next/headers";

export const ADMIN_SESSION_KEY = "gobt_admin_session";
export const CANDIDATE_SESSION_KEY = "gobt_candidate_session";

export async function verifyAdminSession(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  return token === process.env.ADMIN_SECRET;
}

export async function verifyCandidateSession(
  request: Request
): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("id", token)
    .single();

  if (!user) return null;
  return { userId: user.id };
}

export function generateAccessCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
