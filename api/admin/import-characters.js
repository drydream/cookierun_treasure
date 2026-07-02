// Vercel serverless function: one-time/re-runnable import of Cookies + Pets
// from cookierunhub.com's public JSON API into the Supabase `characters`
// table. Runs server-side because that API sends no CORS header, so the
// client can't fetch it directly.
// Requires env vars: service_role, ADMIN_PASSWORD.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';
const HUB_API = 'https://api.cookierunhub.com/api/v1/game-data';

function mapRow(kind, it) {
  return {
    kind,
    name: it.english_name || it.name,
    kr_name: it.name || null,
    grade: it.grade || null,
    ability: it.ability || null,
    image: it.image_path ? `https://www.cookierunhub.com/images/${it.image_path}` : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Wrong password' });
    return;
  }

  const serviceKey = process.env.service_role;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  try {
    const [cookiesRes, petsRes] = await Promise.all([
      fetch(`${HUB_API}/cookies`),
      fetch(`${HUB_API}/pets`),
    ]);
    const cookies = await cookiesRes.json();
    const pets = await petsRes.json();
    const rows = [...cookies.map(c => mapRow('cookie', c)), ...pets.map(p => mapRow('pet', p))];

    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/characters?id=gte.0`, { method: 'DELETE', headers });
    if (!delRes.ok) throw new Error('Wipe failed: ' + await delRes.text());

    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/characters`, {
      method: 'POST',
      headers,
      body: JSON.stringify(rows),
    });
    if (!insRes.ok) throw new Error('Insert failed: ' + await insRes.text());

    res.status(200).json({ ok: true, imported: rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
