import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vejmnevgoydayyopgmid.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlam1uZXZnb3lkYXl5b3BnbWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NjExNDEsImV4cCI6MjA5NjEzNzE0MX0.Kt3PYYCKfUm_98soCxx0Ht3BNBvJj_quiufnde51zP0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
