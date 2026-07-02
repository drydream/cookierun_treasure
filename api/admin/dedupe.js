// Vercel serverless function: merges LINE/Kakao-Global duplicate treasures
// that already exist in the live Supabase table, without touching the JSON
// files or wiping any other row. Safe to re-run (idempotent).
// Requires env vars: service_role, ADMIN_PASSWORD.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';

async function fetchAllTreasures(serviceKey) {
  const PAGE = 1000;
  let all = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/treasures?select=id,source,name,grade,extra,type&order=id.asc`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Range: `${offset}-${offset + PAGE - 1}`,
      },
    });
    const page = await res.json();
    all = all.concat(page);
    if (page.length < PAGE) break;
  }
  return all;
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

  try {
    const rows = await fetchAllTreasures(serviceKey);
    const lineRows = rows.filter(r => r.source === 'line');
    const krRows = rows.filter(r => r.source === 'kr');
    const lineNames = new Set(lineRows.map(r => r.name));

    const toDelete = new Set();
    krRows.forEach(k => { if (lineNames.has(k.name)) toDelete.add(k.id); });
    lineRows.forEach(l => {
      if (!l.extra) return;
      const cands = krRows.filter(k => k.grade === l.grade && k.name
        && k.name.startsWith(l.extra) && k.type === l.type);
      if (cands.length === 1) toDelete.add(cands[0].id);
    });

    const ids = [...toDelete];
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=minimal',
    };
    const CHUNK = 100;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures?id=in.(${chunk.join(',')})`, {
        method: 'DELETE',
        headers,
      });
      if (!delRes.ok) throw new Error('Supabase delete failed: ' + delRes.status + ' ' + await delRes.text());
    }

    res.status(200).json({ ok: true, deleted: ids.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
