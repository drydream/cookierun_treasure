// One-off: fill effect_th on public/treasures.json (LINE) + public/treasures-kr.json (KR).
// High-confidence items (exact/suffix name match against the scraped 499k-network
// list) get that site's human Thai. Everything else gets a rough MT pass from our
// own English text — never invents a match, never overwrites existing effect_th.
const fs = require('fs');
const path = require('path');

const scraped = require('../treasures_th_scrape.json');
const linePath = path.join(__dirname, '../public/treasures.json');
const krPath = path.join(__dirname, '../public/treasures-kr.json');
const lineItems = require(linePath);
const krItems = require(krPath);

const scrapedByName = new Map(scraped.map(s => [s.name.toLowerCase(), s.th]));

function findScrapedTh(name) {
  const exact = scrapedByName.get(name.toLowerCase());
  if (exact) return exact;
  // suffix: our name ends with theirs, e.g. "Ninja Cookie's Tree Leaf" ends with "Tree Leaf"
  for (const s of scraped) {
    if (s.name.length < name.length && name.toLowerCase().endsWith(s.name.toLowerCase())) {
      return s.th;
    }
  }
  return null;
}

// ponytail: unofficial no-key Google Translate endpoint, same trick already used
// in data-pipeline-characters/fetch-characters.js for KO->EN. Single attempt,
// short timeout - a serial run with 3 retries/8s timeout stalled for over an
// hour on scattered slow requests, so failures here are just skipped instead
// of retried (leaves effect_th blank, English still shows as fallback).
async function translate(text, sl, tl) {
  if (!text) return null;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data[0].map(chunk => chunk[0]).join('');
  } catch (e) {
    return null;
  }
}

// ponytail: fixed-size worker pool instead of a queue lib - a few concurrent
// requests clears ~1200 items in well under the serial run's stall time.
async function fillList(items, sourceTextOf, label, matchNameOf) {
  let matched = 0, mtd = 0, skipped = 0, failed = 0;
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      const it = items[i];
      if (it.effect_th && it.effect_th.trim()) { skipped++; continue; }
      const th = findScrapedTh(matchNameOf(it));
      if (th) { it.effect_th = th; matched++; continue; }
      const src = sourceTextOf(it);
      if (!src) continue;
      const mt = await translate(src, 'en', 'th');
      if (mt) { it.effect_th = mt; mtd++; } else { failed++; }
      if (i % 50 === 0) console.log(`${label}: ${i}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  return { matched, mtd, skipped, failed };
}

(async () => {
  const lineStats = await fillList(lineItems, it => it.effect, 'LINE', it => it.name);
  console.log('LINE:', lineStats, '/', lineItems.length);
  fs.writeFileSync(linePath, JSON.stringify(lineItems, null, 2));

  // Bug fix rerun: first pass matched on the Korean `name` field instead of
  // `englishName`, so scraped-Thai matching silently failed for all KR items
  // (they all fell through to MT). Clear those MT results so scraped matches
  // can take priority this time, same as the LINE list got.
  krItems.forEach(it => { it.effect_th = null; });
  const krStats = await fillList(krItems, it => it.abilityEn, 'KR', it => it.englishName);
  console.log('KR:', krStats, '/', krItems.length);
  fs.writeFileSync(krPath, JSON.stringify(krItems, null, 2));
})();
