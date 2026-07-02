// Vercel serverless function: saves an admin edit directly to the Supabase
// `treasures` table (instant, no redeploy needed).
// Requires env vars: service_role, ADMIN_PASSWORD.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password, id, name, category, tier, effect, source, grade, image, evolvesTo, baseItemName } = req.body;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Wrong password' });
    return;
  }
  if (typeof id !== 'number') {
    res.status(400).json({ error: 'Missing id' });
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
    // Fetch the row's current name so a rename can be propagated to any
    // child that references it via base_item_name, and so we know the
    // current "evolves to" target (the child whose base_item_name is us).
    const beforeRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures?id=eq.${id}&select=name`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const [before] = await beforeRes.json();
    const prevName = before && before.name;

    const base = (baseItemName || '').trim();
    if (base) {
      const baseRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures?name=eq.${encodeURIComponent(base)}&select=id`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      const [baseRow] = await baseRes.json();
      if (!baseRow) {
        res.status(400).json({ error: 'No treasure named "' + base + '" found — pick one from the list' });
        return;
      }
    }

    const putRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name, category, tier, effect, source, grade, image, base_item_name: base || null, type: base ? 'evolved' : 'base' }),
    });
    if (!putRes.ok) {
      const err = await putRes.text();
      throw new Error('Supabase write failed: ' + putRes.status + ' ' + err);
    }

    if (prevName && name && prevName !== name) {
      const propRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures?base_item_name=eq.${encodeURIComponent(prevName)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ base_item_name: name }),
      });
      if (!propRes.ok) throw new Error('Failed to propagate rename to evolved items: ' + await propRes.text());
    }

    if (evolvesTo !== undefined) {
      const childRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures?base_item_name=eq.${encodeURIComponent(name)}&select=id,name`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      });
      const [currentChild] = await childRes.json();
      const target = (evolvesTo || '').trim();

      if (currentChild && currentChild.name !== target) {
        await fetch(`${SUPABASE_URL}/rest/v1/treasures?id=eq.${currentChild.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ base_item_name: null }),
        });
      }

      if (target && (!currentChild || currentChild.name !== target)) {
        const targetRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures?name=eq.${encodeURIComponent(target)}&select=id`, {
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
        });
        const [targetRow] = await targetRes.json();
        if (!targetRow) {
          res.status(400).json({ error: 'No treasure named "' + target + '" found — pick one from the list' });
          return;
        }
        const linkRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures?id=eq.${targetRow.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ base_item_name: name, type: 'evolved' }),
        });
        if (!linkRes.ok) throw new Error('Failed to link evolves-to item: ' + await linkRes.text());
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
