// Vercel serverless function: deletes a cookie/pet row from Supabase.
// Requires env vars: service_role, ADMIN_PASSWORD.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password, id } = req.body;

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
    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
    });
    if (!delRes.ok) {
      const err = await delRes.text();
      throw new Error('Supabase delete failed: ' + delRes.status + ' ' + err);
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
