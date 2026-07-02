// Vercel serverless function, doing double duty to stay under the Hobby
// plan's serverless function count limit:
//  - POST: the only allowed write path for public build submissions.
//    Verifies a Cloudflare Turnstile token server-side before inserting via
//    service_role, so this is the sole gate once the `builds` table's public
//    INSERT RLS policy is dropped.
//  - GET (?id=<id>): serves a real HTML document with per-build Open Graph
//    tags at /build/:id (see vercel.json rewrite), then redirects real
//    browsers into the SPA. Crawlers read the tags from this initial
//    response directly — they don't execute JS or follow the redirect.
// Requires env vars: service_role, TURNSTILE_SECRET_KEY.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZGhzbnlubGx6b2l0Ym9sbmdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NTk3MDYsImV4cCI6MjA5ODUzNTcwNn0.yBoBJ3R_AHpjNQG1ikIwfXFOLfWQWSiwZgLaP8m-hxI';
const SITE_URL = 'https://cookierunclassic-treasure.vercel.app';

const PURPOSES = ['score', 'auto_farm', 'semi_auto', 'coins', 'exp', 'boxes'];
const EPISODES = ['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'special1', 'special2', 'special3'];
const SLOTS = ['main', 'relay', 'pet', 'treasure'];
const BOOSTS = ['energy_boost', 'item_time', 'fast_start'];
const POWER_EFFECTS = ['cheerleader', 'special_force', 'fairy', 'cheesecake', 'sea_fairy', 'serenade'];
const NOTES_MAX = 2000;

const PURPOSE_LABEL = { score: 'Score', auto_farm: 'Auto Farm', semi_auto: 'Semi-Auto', coins: 'Coins', exp: 'EXP', boxes: 'Boxes' };
const EPISODE_LABEL = { ep1: 'EP 1', ep2: 'EP 2', ep3: 'EP 3', ep4: 'EP 4', ep5: 'EP 5', ep6: 'EP 6', special1: 'Special 1', special2: 'Special 2', special3: 'Special 3' };

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

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
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

async function handleSubmit(req, res) {
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

export default async function handler(req, res) {
  if (req.method === 'GET') return handleBuildPage(req, res);
  if (req.method === 'POST') return handleSubmit(req, res);
  res.status(405).json({ error: 'Method not allowed' });
}
