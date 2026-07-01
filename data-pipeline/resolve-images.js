const fs = require('fs');
const path = require('path');
const https = require('https');

const items = require('./treasures.json');
const names = [...new Set(items.map(i => i.image).filter(Boolean))];

function fetchBatch(batch) {
  const titles = batch.map(n => 'File:' + n).join('|');
  const url = 'https://cookierun.fandom.com/api.php?action=query&titles=' +
    encodeURIComponent(titles) + '&prop=imageinfo&iiprop=url&format=json';
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

(async () => {
  const map = {};
  for (const batch of chunk(names, 40)) {
    const json = await fetchBatch(batch);
    const pages = json.query && json.query.pages ? Object.values(json.query.pages) : [];
    for (const p of pages) {
      const title = p.title.replace(/^File:/, '');
      const url = p.imageinfo && p.imageinfo[0] ? p.imageinfo[0].url : '';
      if (url) map[title] = url;
    }
    console.log('resolved batch of', batch.length, '- total so far', Object.keys(map).length);
  }
  fs.writeFileSync(path.join(__dirname, 'image-urls.json'), JSON.stringify(map, null, 1));

  let missing = 0;
  for (const it of items) {
    const key = it.image.replace(/_/g, ' ');
    if (map[key]) it.imageUrl = map[key];
    else { it.imageUrl = ''; missing++; }
  }
  fs.writeFileSync(path.join(__dirname, 'treasures.json'), JSON.stringify(items, null, 1));
  console.log('done. missing:', missing, '/', items.length);
})();
