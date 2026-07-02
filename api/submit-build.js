// Vercel serverless function: the only allowed write path for public build
// submissions. Verifies a Cloudflare Turnstile token server-side (the secret
// key can't be checked client-side) before inserting via service_role, so
// this endpoint is the sole gate once the `builds` table's public INSERT RLS
// policy is dropped.
// Requires env vars: service_role, TURNSTILE_SECRET_KEY.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';

const PURPOSES = ['score', 'auto_farm', 'semi_auto', 'coins', 'exp', 'boxes'];
const EPISODES = ['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'special1', 'special2', 'special3'];
const SLOTS = ['main', 'relay', 'pet', 'treasure'];
const BOOSTS = ['energy_boost', 'item_time', 'fast_start'];
const POWER_EFFECTS = ['cheerleader', 'special_force', 'fairy', 'cheesecake', 'sea_fairy', 'serenade'];
const NOTES_MAX = 2000;

function validCombi(combi) {
  if (!Array.isArray(combi) || combi.length === 0 || combi.length > 10) return false;
  if (!combi.every(entry => entry && typeof entry.name === 'string' && entry.name.trim() && SLOTS.includes(entry.slot))) {
    return false;
  }
  const bySlot = slot => combi.filter(e => e.slot === slot).length;
  return bySlot('main') === 1 && bySlot('pet') === 1 && bySlot('relay') <= 1 && bySlot('treasure') <= 3;
}

function validStringList(list, allowed) {
  return list === undefined || (Array.isArray(list) && list.every(v => allowed.includes(v)));
}

function validNumber(n) {
  return n === undefined || n === null || (typeof n === 'number' && Number.isFinite(n));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { purpose, episode, combi, boosts, power_effects, score, coins, notes, turnstileToken } = req.body;

  if (!PURPOSES.includes(purpose)) {
    res.status(400).json({ error: 'Invalid purpose' });
    return;
  }
  if (!EPISODES.includes(episode)) {
    res.status(400).json({ error: 'Invalid episode' });
    return;
  }
  if (!validCombi(combi)) {
    res.status(400).json({ error: 'Invalid combi (need exactly one main, one pet, up to 1 relay and 3 treasures)' });
    return;
  }
  if (!validStringList(boosts, BOOSTS) || !validStringList(power_effects, POWER_EFFECTS)) {
    res.status(400).json({ error: 'Invalid boosts or power_effects' });
    return;
  }
  if (!validNumber(score) || !validNumber(coins)) {
    res.status(400).json({ error: 'Invalid score or coins' });
    return;
  }
  if (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > NOTES_MAX)) {
    res.status(400).json({ error: 'Notes too long' });
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
      body: JSON.stringify([{
        purpose,
        episode,
        combi,
        boosts: boosts || null,
        power_effects: power_effects || null,
        score: score ?? null,
        coins: coins ?? null,
        notes: notes || null,
      }]),
    });
    if (!insRes.ok) throw new Error('Supabase insert failed: ' + insRes.status + ' ' + await insRes.text());

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
