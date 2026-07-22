import { createClient } from '@supabase/supabase-js';
// Admin client used by all server-side routes (service role key, no session persistence)
export const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
