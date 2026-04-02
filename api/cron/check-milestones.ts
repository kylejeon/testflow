import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Cron bridge: called daily at UTC 00:00 (KST 09:00)
 * Proxies to the Supabase Edge Function check-milestone-past-due.
 *
 * Required env vars (set in Vercel dashboard):
 *   CRON_SECRET              — shared secret for Edge Function auth
 *   VITE_PUBLIC_SUPABASE_URL — Supabase project URL
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return res.status(500).json({ error: 'VITE_PUBLIC_SUPABASE_URL not configured' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/check-milestone-past-due`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cronSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ triggered_by: 'vercel-cron' }),
      },
    );

    const result = await response.json();
    return res.status(response.ok ? 200 : 500).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
