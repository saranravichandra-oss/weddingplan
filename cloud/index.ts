import { createClient } from '@supabase/supabase-js';
import { createCloudHandler } from './handler.mjs';
const url = Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !key) throw new Error('Serverkonfiguration fehlt.');
const db = createClient(url, key, { auth: { persistSession:false, autoRefreshToken:false } });
Deno.serve(createCloudHandler(db));
