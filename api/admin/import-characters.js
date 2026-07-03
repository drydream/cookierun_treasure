// Re-runnable import: reads the pre-fetched public/characters.json (built by
// data-pipeline-characters/fetch-characters.js). Characters not already in
// the Supabase `characters` table (matched by kind + kr_name, the stable
// Korean source name) are inserted. For characters that already exist, only
// fields that are currently null/empty get filled in from the JSON - a field
// the admin has already set (including `tier`, which the JSON never carries)
// is never overwritten. Password-gated like save.js.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';
const FILLABLE_FIELDS = ['name', 'grade', 'ability', 'ability_en', 'image'];

function isEmpty(v) {
  return v === null || v === undefined || (typeof v === 'string' && !v.trim());
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
      `${SUPABASE_URL}/rest/v1/characters?select=id,kind,kr_name,name,grade,ability,ability_en,image`,
      { headers }
    ).then(r => r.json());
    const existingByKey = new Map(existing.map(c => [`${c.kind}:${c.kr_name}`, c]));

    const newRows = rows.filter(r => !existingByKey.has(`${r.kind}:${r.kr_name}`));

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

    let filled = 0;
    for (const row of rows) {
      const current = existingByKey.get(`${row.kind}:${row.kr_name}`);
      if (!current) continue;
      const patch = {};
      for (const field of FILLABLE_FIELDS) {
        if (isEmpty(current[field]) && !isEmpty(row[field])) patch[field] = row[field];
      }
      if (Object.keys(patch).length === 0) continue;
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/characters?id=eq.${current.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patch),
      });
      if (!patchRes.ok) throw new Error('Fill failed: ' + patchRes.status + ' ' + await patchRes.text());
      filled++;
    }

    res.status(200).json({ ok: true, added: newRows.length, filled, skipped: rows.length - newRows.length - filled });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
