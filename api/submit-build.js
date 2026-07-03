// Vercel serverless function, doing double duty (quadruple, now) to stay
// under the Hobby plan's serverless function count limit:
//  - POST: the only allowed write path for public build submissions.
//    Verifies a Cloudflare Turnstile token server-side before inserting via
//    service_role, so this is the sole gate once the `builds` table's public
//    INSERT RLS policy is dropped. Also hashes the submitter's chosen
//    password (SHA-256, unsalted — proportionate for "edit a fan-site build
//    entry", not a real credential) so they can edit/delete it later.
//  - GET (?id=<id>): serves a real HTML document with per-build Open Graph
//    tags at /build/:id (see vercel.json rewrite), then redirects real
//    browsers into the SPA. Crawlers read the tags from this initial
//    response directly — they don't execute JS or follow the redirect.
//  - PATCH / DELETE (?id=<id>, body {password, ...}): owner self-service
//    edit/delete, gated by matching the stored password hash. No anon
//    update/delete RLS policy exists on `builds` (only select), so these are
//    the only paths that can touch an existing row besides the admin panel.
// Requires env vars: service_role, TURNSTILE_SECRET_KEY.
import crypto from 'node:crypto';

const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZGhzbnlubGx6b2l0Ym9sbmdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NTk3MDYsImV4cCI6MjA5ODUzNTcwNn0.yBoBJ3R_AHpjNQG1ikIwfXFOLfWQWSiwZgLaP8m-hxI';
const SITE_URL = 'https://cookierunclassic-treasure.vercel.app';

const PURPOSES = ['score', 'auto_farm', 'semi_auto', 'coins', 'exp', 'boxes'];
const EPISODES = ['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'special1', 'special2', 'special3'];
const SLOTS = ['main', 'relay', 'pet', 'treasure'];
const BOOSTS = ['energy_boost', 'item_time', 'fast_start'];
const RANDOM_BOOST_OPTIONS = [
  'double_coins', 'hp_drain_15', 'crush_70', 'gold_coin_magic', 'hp_potion_20',
  'pit_lift_2', 'score_bonus_15', 'revive_80hp', 'speed_17', 'collision_30', 'magnetic_aura',
];
const POWER_EFFECTS = ['cheerleader', 'special_force', 'fairy', 'cheesecake', 'sea_fairy', 'serenade'];
const NOTES_MAX = 2000;
const YOUTUBE_LINK_MAX = 300;

function validYoutubeLink(link) {
  return link === undefined || link === null || (typeof link === 'string' && link.length <= YOUTUBE_LINK_MAX);
}

const PURPOSE_LABEL = { score: 'Score', auto_farm: 'Auto Farm', semi_auto: 'Semi-Auto', coins: 'Coins', exp: 'EXP', boxes: 'Boxes' };
const EPISODE_LABEL = { ep1: 'EP 1', ep2: 'EP 2', ep3: 'EP 3', ep4: 'EP 4', ep5: 'EP 5', ep6: 'EP 6', special1: 'Special 1', special2: 'Special 2', special3: 'Special 3' };

function validCombi(combi) {
  if (!Array.isArray(combi) || combi.length === 0 || combi.length > 10) return false;
  if (!combi.every(entry => {
    if (!entry || typeof entry.name !== 'string' || !entry.name.trim() || !SLOTS.includes(entry.slot)) return false;
    if (entry.slot === 'treasure' && entry.level !== undefined) {
      if (!Number.isInteger(entry.level) || entry.level < 0 || entry.level > 9) return false;
    }
    return true;
  })) {
    return false;
  }
  const bySlot = slot => combi.filter(e => e.slot === slot).length;
  return bySlot('main') === 1 && bySlot('pet') === 1 && bySlot('relay') <= 1 && bySlot('treasure') <= 3;
}

function validStringList(list, allowed) {
  return list === undefined || (Array.isArray(list) && list.every(v => allowed.includes(v)));
}

function validRandomBoost(v) {
  return v === undefined || v === null || RANDOM_BOOST_OPTIONS.includes(v);
}

function validNumber(n) {
  return n === undefined || n === null || (typeof n === 'number' && Number.isFinite(n));
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

function serviceHeaders() {
  const serviceKey = process.env.service_role;
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

async function fetchOwnHash(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/builds?id=eq.${id}&select=edit_password_hash`, {
    headers: { apikey: process.env.service_role, Authorization: `Bearer ${process.env.service_role}` },
  });
  const [row] = await res.json();
  return row ? row.edit_password_hash : null;
}

async function handleBuildPage(req, res) {
  const id = parseInt(req.query.id);
  const fallback = () => res.status(302).setHeader('Location', `${SITE_URL}/`).end();
  if (!Number.isInteger(id)) return fallback();

  const spaUrl = `${SITE_URL}/?build=${id}`;

  try {
    const buildRes = await fetch(`${SUPABASE_URL}/rest/v1/builds?id=eq.${id}&select=*`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const [build] = await buildRes.json();
    if (!build) return fallback();

    const main = build.combi.find(e => (e.slot || e.kind) === 'main');
    let image = `${SITE_URL}/banner.jpg`;
    if (main) {
      const charRes = await fetch(`${SUPABASE_URL}/rest/v1/characters?kind=eq.cookie&name=eq.${encodeURIComponent(main.name)}&select=image`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      const [char] = await charRes.json();
      if (char && char.image) image = `${SITE_URL}/${char.image}`;
    }

    const title = `Cookie Run Build — ${PURPOSE_LABEL[build.purpose] || build.purpose} / ${EPISODE_LABEL[build.episode] || build.episode}`;
    const description = build.combi.map(e => e.name).join(' + ');

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(SITE_URL)}/build/${id}">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${esc(spaUrl)}">
<script>location.replace(${JSON.stringify(spaUrl)});</script>
</head>
<body>Redirecting…</body>
</html>`);
  } catch {
    fallback();
  }
}

function validPassword(pw) {
  return typeof pw === 'string' && pw.length >= 4 && pw.length <= 20;
}

async function handleSubmit(req, res) {
  const { purpose, episode, combi, boosts, random_boost, power_effects, score, coins, notes, youtube_link, turnstileToken, password } = req.body;

  if (!validPassword(password)) {
    res.status(400).json({ error: 'Password must be 4-20 characters (needed to edit/delete this build later)' });
    return;
  }
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
  if (!validRandomBoost(random_boost)) {
    res.status(400).json({ error: 'Invalid random_boost' });
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
  if (!validYoutubeLink(youtube_link)) {
    res.status(400).json({ error: 'YouTube link too long' });
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
      res.status(400).json({ error: 'Bot check failed: ' + ((verify['error-codes'] || []).join(', ') || 'unknown') });
      return;
    }

    const insRes = await fetch(`${SUPABASE_URL}/rest/v1/builds`, {
      method: 'POST',
      headers: serviceHeaders(),
      body: JSON.stringify([{
        purpose,
        episode,
        combi,
        boosts: boosts || null,
        random_boost: random_boost || null,
        power_effects: power_effects || null,
        score: score ?? null,
        coins: coins ?? null,
        notes: notes || null,
        youtube_link: youtube_link || null,
        edit_password_hash: hashPassword(password),
      }]),
    });
    if (!insRes.ok) throw new Error('Supabase insert failed: ' + insRes.status + ' ' + await insRes.text());

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function handleEdit(req, res) {
  const id = parseInt(req.query.id);
  const { password, purpose, episode, combi, boosts, random_boost, power_effects, score, coins, notes, youtube_link } = req.body;

  if (!Number.isInteger(id) || !validPassword(password)) {
    res.status(400).json({ error: 'Missing id or password' });
    return;
  }
  if (purpose !== undefined && !PURPOSES.includes(purpose)) {
    res.status(400).json({ error: 'Invalid purpose' });
    return;
  }
  if (episode !== undefined && !EPISODES.includes(episode)) {
    res.status(400).json({ error: 'Invalid episode' });
    return;
  }
  if (combi !== undefined && !validCombi(combi)) {
    res.status(400).json({ error: 'Invalid combi (need exactly one main, one pet, up to 1 relay and 3 treasures)' });
    return;
  }
  if (!validStringList(boosts, BOOSTS) || !validStringList(power_effects, POWER_EFFECTS)) {
    res.status(400).json({ error: 'Invalid boosts or power_effects' });
    return;
  }
  if (!validRandomBoost(random_boost)) {
    res.status(400).json({ error: 'Invalid random_boost' });
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
  if (!validYoutubeLink(youtube_link)) {
    res.status(400).json({ error: 'YouTube link too long' });
    return;
  }

  try {
    const ownHash = await fetchOwnHash(id);
    if (!ownHash || ownHash !== hashPassword(password)) {
      res.status(403).json({ error: 'Wrong password' });
      return;
    }

    const patch = { purpose, episode, combi, boosts, random_boost, power_effects, score, coins, notes, youtube_link };
    const putRes = await fetch(`${SUPABASE_URL}/rest/v1/builds?id=eq.${id}`, {
      method: 'PATCH',
      headers: serviceHeaders(),
      body: JSON.stringify(patch),
    });
    if (!putRes.ok) throw new Error('Supabase update failed: ' + putRes.status + ' ' + await putRes.text());

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function handleDelete(req, res) {
  const id = parseInt(req.query.id);
  const { password } = req.body;

  if (!Number.isInteger(id) || !validPassword(password)) {
    res.status(400).json({ error: 'Missing id or password' });
    return;
  }

  try {
    const ownHash = await fetchOwnHash(id);
    if (!ownHash || ownHash !== hashPassword(password)) {
      res.status(403).json({ error: 'Wrong password' });
      return;
    }

    const delRes = await fetch(`${SUPABASE_URL}/rest/v1/builds?id=eq.${id}`, {
      method: 'DELETE',
      headers: serviceHeaders(),
    });
    if (!delRes.ok) throw new Error('Supabase delete failed: ' + delRes.status + ' ' + await delRes.text());

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return handleBuildPage(req, res);
  if (req.method === 'POST') return handleSubmit(req, res);
  if (req.method === 'PATCH') return handleEdit(req, res);
  if (req.method === 'DELETE') return handleDelete(req, res);
  res.status(405).json({ error: 'Method not allowed' });
}
