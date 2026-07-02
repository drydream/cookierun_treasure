// Vercel serverless function: serves a real HTML document with per-build
// Open Graph tags at /build/:id (see vercel.json rewrite), then redirects
// real browsers into the SPA. Facebook/Twitter/etc crawlers read the OG
// tags from this initial response directly — they don't execute JS or
// follow the redirect, so they never need to see the SPA at all.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZGhzbnlubGx6b2l0Ym9sbmdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NTk3MDYsImV4cCI6MjA5ODUzNTcwNn0.yBoBJ3R_AHpjNQG1ikIwfXFOLfWQWSiwZgLaP8m-hxI';
const SITE_URL = 'https://cookierunclassic-treasure.vercel.app';

const PURPOSE_LABEL = { score: 'Score', auto_farm: 'Auto Farm', semi_auto: 'Semi-Auto', coins: 'Coins', exp: 'EXP', boxes: 'Boxes' };
const EPISODE_LABEL = { ep1: 'EP 1', ep2: 'EP 2', ep3: 'EP 3', ep4: 'EP 4', ep5: 'EP 5', ep6: 'EP 6', special1: 'Special 1', special2: 'Special 2', special3: 'Special 3' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export default async function handler(req, res) {
  const id = parseInt(req.query.id);
  const fallback = () => {
    res.setHeader('Content-Type', 'text/html');
    res.status(302).setHeader('Location', `${SITE_URL}/`).end();
  };
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
