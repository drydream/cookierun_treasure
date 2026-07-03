// One-off: fill ability_th on public/characters.json pet entries, using the
// same approach as scripts/fill-treasure-th.cjs. High-confidence name matches
// (exact/suffix) against the scraped 499k-network.com pet list get that
// site's human Thai; everything else gets a rough MT pass from our own
// ability_en text. Never invents a match, never overwrites existing ability_th.
const fs = require('fs');
const path = require('path');

const scraped = require('../pets_th_scrape.json');
const charsPath = path.join(__dirname, '../public/characters.json');
const characters = require(charsPath);
const pets = characters.filter(c => c.kind === 'pet');

const scrapedByName = new Map(scraped.map(s => [s.name.toLowerCase(), s.th]));

function findScrapedTh(name) {
  const exact = scrapedByName.get(name.toLowerCase());
  if (exact) return exact;
  for (const s of scraped) {
    if (s.name.length < name.length && name.toLowerCase().endsWith(s.name.toLowerCase())) {
      return s.th;
    }
  }
  return null;
}

// ponytail: same no-key Google Translate trick as fill-treasure-th.cjs -
// single attempt, short timeout, skip on failure (leaves ability_th blank,
// English still shows as fallback).
async function translate(text) {
  if (!text) return null;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=th&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0].map(chunk => chunk[0]).join('');
  } catch (e) {
    return null;
  }
}

async function fillList(items) {
  let matched = 0, mtd = 0, skipped = 0, failed = 0;
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      const it = items[i];
      if (it.ability_th && it.ability_th.trim()) { skipped++; continue; }
      const th = findScrapedTh(it.name);
      if (th) { it.ability_th = th; matched++; continue; }
      const src = it.ability_en;
      if (!src) continue;
      const mt = await translate(src);
      if (mt) { it.ability_th = mt; mtd++; } else { failed++; }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  return { matched, mtd, skipped, failed };
}

(async () => {
  const stats = await fillList(pets);
  console.log('pets:', stats, '/', pets.length);
  fs.writeFileSync(charsPath, JSON.stringify(characters, null, 2));
})();
