// Re-runnable import: reads the current public/treasures.json and
// public/treasures-kr.json, applies the same LINE-priority dedup as the old
// client-side merge, and adds any treasure not already in the Supabase
// `treasures` table (matched by source + name). For treasures that already
// exist, only fields still null/empty get filled in from the JSON - a field
// the admin has already set (including `tier`, which the JSON never
// carries) is never overwritten. Password-gated like save.js.
// Requires env vars: SUPABASE_URL (or derived below), service_role, ADMIN_PASSWORD.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';
const FILLABLE_FIELDS = ['name', 'grade', 'category', 'effect', 'kr_ability', 'extra', 'image', 'type', 'base_item_name', 'ingredients', 'blessed_effect'];

function isEmpty(v) {
  return v === null || v === undefined || (typeof v === 'string' && !v.trim());
}

// Supabase caps each response at 1000 rows regardless of Range, so page
// through in batches until a short page signals the end.
async function fetchAllExisting(serviceKey) {
  const PAGE = 1000;
  let all = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/treasures?select=*&order=id.asc`, {
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
  const base = `https://${req.headers.host}`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  try {
    const [lineItems, krRaw, existing] = await Promise.all([
      fetch(`${base}/treasures.json`).then(r => r.json()),
      fetch(`${base}/treasures-kr.json`).then(r => r.json()),
      fetchAllExisting(serviceKey),
    ]);

    const existingByKey = new Map(existing.map(it => [it.source + '|' + it.name, it]));
    const existingKeys = new Set(existingByKey.keys());

    const idToName = {};
    krRaw.forEach(it => { idToName[it.id] = it.englishName; });
    const lineNames = new Set(lineItems.map(it => it.name));

    // Some treasures are named differently between LINE and Kakao/Global
    // (e.g. "Adventurer Cookie's Cinnamon Rope" vs "Adventurer Cookie Rope
    // Baumkuchen") but are the same cookie/pet's signature item. Match them
    // by owner name prefix + grade + base/evolved status and drop the KR
    // duplicate too, same as an exact name match.
    const excludedKrIds = new Set();
    krRaw.forEach(it => { if (lineNames.has(it.englishName)) excludedKrIds.add(it.id); });
    lineItems.forEach(it => {
      if (!it.extra) return;
      const cands = krRaw.filter(k => k.grade === it.grade && k.englishName
        && k.englishName.startsWith(it.extra)
        && (it.type === 'evolved' ? k.evolvedFromId != null : k.evolvedFromId == null));
      if (cands.length === 1) excludedKrIds.add(cands[0].id);
    });

    // Full candidate list from the JSON sources, regardless of whether each
    // one already exists in the DB - used both to insert brand-new treasures
    // and to fill blanks on ones that already exist.
    const lineCandidates = lineItems.map(it => ({
      source: 'line',
      name: it.name,
      kr_name: null,
      grade: it.grade,
      category: it.section,
      effect: it.effect || null,
      kr_ability: null,
      extra: it.extra || null,
      image: it.localImage || null,
      type: it.type,
      base_item_name: it.baseItem || null,
      ingredients: it.ingredients || null,
      blessed_effect: it.blessedEffect || null,
      tier: null,
    }));

    const krCandidates = krRaw
      .filter(it => !excludedKrIds.has(it.id))
      .map(it => ({
        source: 'kr',
        name: it.englishName,
        kr_name: it.name,
        grade: it.grade,
        category: it.category,
        effect: it.abilityEn || null,
        kr_ability: it.ability || null,
        extra: null,
        image: it.localImage || null,
        type: it.evolvedFromId ? 'evolved' : 'base',
        base_item_name: it.evolvedFromId ? (idToName[it.evolvedFromId] || null) : null,
        ingredients: null,
        blessed_effect: null,
        tier: null,
      }));

    const candidates = [...lineCandidates, ...krCandidates];
    const newRows = candidates.filter(c => !existingKeys.has(c.source + '|' + c.name));

    // Insert in chunks to stay well under request size limits.
    const CHUNK = 200;
    for (let i = 0; i < newRows.length; i += CHUNK) {
      const chunk = newRows.slice(i, i + CHUNK);
      const insRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures`, {
        method: 'POST',
        headers,
        body: JSON.stringify(chunk),
      });
      if (!insRes.ok) throw new Error('Supabase insert failed: ' + insRes.status + ' ' + await insRes.text());
    }

    let filled = 0;
    for (const candidate of candidates) {
      const current = existingByKey.get(candidate.source + '|' + candidate.name);
      if (!current) continue;
      const patch = {};
      for (const field of FILLABLE_FIELDS) {
        if (isEmpty(current[field]) && !isEmpty(candidate[field])) patch[field] = candidate[field];
      }
      if (Object.keys(patch).length === 0) continue;
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures?id=eq.${current.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patch),
      });
      if (!patchRes.ok) throw new Error('Fill failed: ' + patchRes.status + ' ' + await patchRes.text());
      filled++;
    }

    res.status(200).json({ ok: true, added: newRows.length, filled, skipped: existing.length - filled });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
