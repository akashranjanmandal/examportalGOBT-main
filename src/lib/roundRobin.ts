import { supabase } from "./supabase";

export async function assignMCQOrder(
  questionIds: string[]
): Promise<string[]> {
  // Fisher-Yates shuffle seeded per candidate
  const arr = [...questionIds];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function assignCodingSet(): Promise<number> {
  const { data, error } = await supabase
    .from("round_robin_counter")
    .select("coding_counter")
    .eq("id", 1)
    .single();

  if (error || !data) return 1;

  const currentCounter = data.coding_counter;
  const setNumber = (currentCounter % 100) + 1;

  await supabase
    .from("round_robin_counter")
    .update({ coding_counter: currentCounter + 1 })
    .eq("id", 1);

  return setNumber;
}
