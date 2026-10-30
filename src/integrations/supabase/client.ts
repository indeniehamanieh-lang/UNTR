import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { SUPABASE_URL, SUPABASE_KEY } from "@/config";

const url = (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) || SUPABASE_URL;
const key = (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) || SUPABASE_KEY;

if (!url || !key) {
  throw new Error("Configuration manquante : VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY");
}

export const supabase = createClient<Database>(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storage: window.localStorage },
});
