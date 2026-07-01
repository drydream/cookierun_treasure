const fs = require('fs');
const path = require('path');
const https = require('https');

const items = require('./treasures.json');
const evolvedNames = [...new Set(items.filter(i => i.type === 'evolved').map(i => i.name))];

function fetchBatch(batch) {
  const titles = batch.join('|');
  const url = 'https://cookierun.fandom.com/api.php?action=query&titles=' +
    encodeURIComponent(titles) + '&prop=revisions&rvprop=content&format=json';
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function cleanEffect(s) {
  return s
    .replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'''/g, '')
    .replace(/^\*/gm, '- ')
    .trim();
}

function parseEvoInfobox(wikitext, pageTitle) {
  const m = wikitext.match(/\{\{EvoInfobox([\s\S]*?)\}\}/);
  if (!m) return null;
  const body = m[1];
  const fields = {};
  const fieldRe = /\|\s*([A-Za-z0-9 ]+?)\s*=\s*([^\n|]*(?:\n(?!\|)[^\n]*)*)/g;
  let fm;
  while ((fm = fieldRe.exec(body))) {
    fields[fm[1].trim()] = fm[2].trim();
  }
  const treasureRaw = fields['Treasure'] || '';
  const baseMatch = treasureRaw.match(/\[\[([^\]|]+)/);
  const baseItem = baseMatch ? baseMatch[1].trim() : '';
  const ingredients = [];
  for (let i = 1; i <= 10; i++) {
    const raw = fields['Ing' + i];
    if (!raw) continue;
    const nm = raw.match(/\[\[([^\]|]+)/);
    const gr = raw.match(/\(([A-Z])\)/);
    if (nm) ingredients.push({ name: nm[1].trim(), grade: gr ? gr[1] : '' });
  }
  const normalEffect = fields['Normal Effect'] ? cleanEffect(fields['Normal Effect']) : '';
  const blessedEffect = fields['Blessed Effect'] ? cleanEffect(fields['Blessed Effect']) : '';
  return { baseItem, ingredients, normalEffect, blessedEffect };
}

(async () => {
  const details = {};
  let done = 0;
  for (const batch of chunk(evolvedNames, 20)) {
    const json = await fetchBatch(batch);
    const pages = json.query && json.query.pages ? Object.values(json.query.pages) : [];
    for (const p of pages) {
      if (!p.revisions || !p.revisions[0]) continue;
      const wikitext = p.revisions[0]['*'];
      const info = parseEvoInfobox(wikitext, p.title);
      if (info) details[p.title] = info;
    }
    done += batch.length;
    console.log('processed', done, '/', evolvedNames.length);
  }

  let matched = 0;
  let fixedBlessed = 0;
  for (const it of items) {
    if (it.type !== 'evolved') continue;
    const info = details[it.name];
    if (info) {
      it.baseItem = info.baseItem;
      it.ingredients = info.ingredients;
      matched++;
      if (it.blessedEffect && it.blessedEffect.includes('???') && info.blessedEffect && !info.blessedEffect.includes('???')) {
        it.blessedEffect = info.blessedEffect;
        fixedBlessed++;
      }
    }
  }
  fs.writeFileSync(path.join(__dirname, 'treasures.json'), JSON.stringify(items, null, 1));
  console.log('done. matched:', matched, '/', evolvedNames.length, '| fixed blessed ???:', fixedBlessed);
})();
