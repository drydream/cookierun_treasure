// Vercel serverless function: the only allowed write path for public build
// submissions. Verifies a Cloudflare Turnstile token server-side (the secret
// key can't be checked client-side) before inserting via service_role, so
// this endpoint is the sole gate once the `builds` table's public INSERT RLS
// policy is dropped.
// Requires env vars: service_role, TURNSTILE_SECRET_KEY.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';

const PURPOSES = ['score', 'auto_farm', 'semi_auto', 'coins', 'exp', 'boxes'];
const EPISODES = ['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'special1', 'special2', 'special3'];
const KINDS = ['cookie', 'pet', 'treasure'];

function validCombi(combi) {
  return Array.isArray(combi) && combi.length > 0 && combi.every(entry =>
    entry && typeof entry.name === 'string' && entry.name.trim() && KINDS.includes(entry.kind)
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { purpose, episode, combi, turnstileToken } = req.body;

  if (!PURPOSES.includes(purpose)) {
    res.status(400).json({ error: 'Invalid purpose' });
    return;
  }
  if (!EPISODES.includes(episode)) {
    res.status(400).json({ error: 'Invalid episode' });
    return;
  }
  if (!validCombi(combi)) {
    res.status(400).json({ error: 'Invalid combi' });
    return;
  }
  if (!turnstileToken) {
    res.status(400).json({ error: 'Missing bot check' });
    return;
  }

  try {
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: turnstileToken }),
    });
    const verify = await verifyRes.json();
    if (!verify.success) {
      res.status(400).json({ error: 'Bot check failed' });
      return;
    }

    const serviceKey = process.env.service_role;
    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/builds`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify([{ purpose, episode, combi }]),
    });
    if (!insRes.ok) throw new Error('Supabase insert failed: ' + insRes.status + ' ' + await insRes.text());

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
