// Vercel serverless function: saves an admin edit directly to the Supabase
// `treasures` table (instant, no redeploy needed).
// Requires env vars: service_role, ADMIN_PASSWORD.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password, id, name, category, tier, effect, source, grade, image } = req.body;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Wrong password' });
    return;
  }
  if (typeof id !== 'number') {
    res.status(400).json({ error: 'Missing id' });
    return;
  }

  const serviceKey = process.env.service_role;

  try {
    const putRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ name, category, tier, effect, source, grade, image }),
    });
    if (!putRes.ok) {
      const err = await putRes.text();
      throw new Error('Supabase write failed: ' + putRes.status + ' ' + err);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
