// One-time (re-runnable) import: reads the pre-fetched public/characters.json
// (built by data-pipeline-characters/fetch-characters.js, which downloads
// images locally and does a rough KO->EN translation) and replaces the
// contents of the Supabase `characters` table. Password-gated like save.js.
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

    // The re-import wipes and rebuilds the whole table from the static JSON,
    // which has no `tier` data. Save existing tier assignments (set by hand
    // via the admin Tier Builder) so they survive the re-import.
    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/characters?tier=not.is.null&select=kind,name,tier`,
      { headers }
    ).then(r => r.json());
    const tierByKey = new Map(existing.map(c => [`${c.kind}:${c.name}`, c.tier]));

    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/characters?id=gt.0`, { method: 'DELETE', headers });
    if (!delRes.ok) throw new Error('Wipe failed: ' + await delRes.text());

    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const insRes = await fetch(`${SUPABASE_URL}/rest/v1/characters`, {
        method: 'POST',
        headers,
        body: JSON.stringify(chunk),
      });
      if (!insRes.ok) throw new Error('Insert failed: ' + insRes.status + ' ' + await insRes.text());
    }

    for (const [key, tier] of tierByKey) {
      const [kind, name] = key.split(':');
      await fetch(
        `${SUPABASE_URL}/rest/v1/characters?kind=eq.${encodeURIComponent(kind)}&name=eq.${encodeURIComponent(name)}`,
        { method: 'PATCH', headers, body: JSON.stringify({ tier }) }
      );
    }

    res.status(200).json({ ok: true, imported: rows.length, tiersRestored: tierByKey.size });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
