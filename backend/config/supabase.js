import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly at startup rather than half-working. The server entrypoint
  // checks configStatus() before accepting requests.
  console.error("[supabase] SUPABASE_URL and SUPABASE_ANON_KEY are required.");
}

export function configStatus() {
  return Boolean(url && anonKey);
}

export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder");