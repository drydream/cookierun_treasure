// Re-runnable import: reads the pre-fetched public/characters.json (built by
// data-pipeline-characters/fetch-characters.js) and adds any character not
// already in the Supabase `characters` table (matched by kind + kr_name,
// the stable Korean source name). It never deletes or edits existing rows -
// admin edits (name/image/ability/tier fixes made through the admin panel)
// are never touched by this endpoint. Password-gated like save.js.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';

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
  const base = `https://${req.headers.host}`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  try {
    const rows = await fetch(`${base}/characters.json`).then(r => r.json());

    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/characters?select=kind,kr_name`,
      { headers }
    ).then(r => r.json());
    const existingKeys = new Set(existing.map(c => `${c.kind}:${c.kr_name}`));

    const newRows = rows.filter(r => !existingKeys.has(`${r.kind}:${r.kr_name}`));

    const CHUNK = 200;
    for (let i = 0; i < newRows.length; i += CHUNK) {
      const chunk = newRows.slice(i, i + CHUNK);
      const insRes = await fetch(`${SUPABASE_URL}/rest/v1/characters`, {
        method: 'POST',
        headers,
        body: JSON.stringify(chunk),
      });
      if (!insRes.ok) throw new Error('Insert failed: ' + insRes.status + ' ' + await insRes.text());
    }

    res.status(200).json({ ok: true, added: newRows.length, skipped: rows.length - newRows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
