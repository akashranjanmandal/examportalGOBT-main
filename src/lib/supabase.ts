import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client — bypasses RLS using service role key
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

export type UserStatus = "not_started" | "in_progress" | "submitted";

export interface User {
  id: string;
  name: string;
  email: string;
  access_code: string;
  exam_id: string | null;
  status: UserStatus;
  mcq_set_order: number[] | null;
  coding_set_number: number | null;
  tab_switch_count: number;
  extra_time_minutes: number;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  mcq_duration_minutes: number;
  coding_duration_minutes: number;
  max_tab_switches: number;
  is_active: boolean;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answers: string[];
  is_multi_select: boolean;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  marks: number;
}

export interface CodingQuestion {
  id: string;
  set_id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  constraints: string;
  sample_input: string;
  sample_output: string;
  test_cases: TestCase[];
  time_limit_ms: number;
  memory_limit_mb: number;
  marks: number;
}

export interface TestCase {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface Submission {
  id: string;
  user_id: string;
  exam_id: string;
  mcq_answers: Record<string, string[]>;
  coding_answers: Record<string, { code: string; language: string }>;
  mcq_score: number;
  coding_score: number;
  total_score: number;
  submitted_at: string;
}
