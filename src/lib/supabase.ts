import { createClient } from '@supabase/supabase-js';

const rawUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Detect if the URL is still a placeholder
const urlReady = rawUrl.length > 0
  && !rawUrl.includes('your-project-ref')
  && rawUrl.startsWith('http');

if (!urlReady && typeof window === 'undefined') {
  console.warn(
    '[supabase] ⚠️  NEXT_PUBLIC_SUPABASE_URL is not set.\n' +
    '  1. Go to Supabase Dashboard → your project → Settings → API\n' +
    '  2. Copy "Project URL" (e.g. https://xxxxxx.supabase.co)\n' +
    '  3. Add it to .env.local as NEXT_PUBLIC_SUPABASE_URL=https://xxxxxx.supabase.co\n' +
    '  4. Restart the dev server'
  );
}

// Use a dummy URL so createClient doesn't crash at module load time;
// all DB calls will fail gracefully until the real URL is provided.
const supabaseUrl = urlReady ? rawUrl : 'https://placeholder.supabase.co';

export const supabase = createClient(supabaseUrl, anonKey || 'placeholder-key');

export const supabaseReady = urlReady && anonKey.length > 0;
