// Vercel serverless function: creates a new treasure row in Supabase.
// Requires env vars: service_role, ADMIN_PASSWORD.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password, source, name, grade, category, tier, effect, image, baseItemName } = req.body;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Wrong password' });
    return;
  }
  if (!name || !source || !grade) {
    res.status(400).json({ error: 'Name, source, and grade are required' });
    return;
  }

  const serviceKey = process.env.service_role;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };

  try {
    if (baseItemName) {
      const baseRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures?name=eq.${encodeURIComponent(baseItemName)}&select=id`, { headers });
      const [baseRow] = await baseRes.json();
      if (!baseRow) {
        res.status(400).json({ error: 'No treasure named "' + baseItemName + '" found — pick one from the list' });
        return;
      }
    }

    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/treasures`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify([{
        source,
        name,
        grade,
        category: category || null,
        tier: tier || null,
        effect: effect || null,
        image: image || null,
        base_item_name: baseItemName || null,
        type: baseItemName ? 'evolved' : 'base',
      }]),
    });
    if (!insRes.ok) {
      const err = await insRes.text();
      throw new Error('Supabase insert failed: ' + insRes.status + ' ' + err);
    }
    const [row] = await insRes.json();
    res.status(200).json({ ok: true, row });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
