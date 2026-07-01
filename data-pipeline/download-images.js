const fs = require('fs');
const path = require('path');
const https = require('https');

const items = require('./treasures.json');
const dir = path.join(__dirname, 'images');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

function slugify(name) {
  return name.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

function extFromContentType(ct) {
  if (/webp/.test(ct)) return 'webp';
  if (/png/.test(ct)) return 'png';
  if (/jpeg|jpg/.test(ct)) return 'jpg';
  if (/gif/.test(ct)) return 'gif';
  return 'png';
}

function download(url, destBase) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(download(res.headers.location, destBase));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('status ' + res.statusCode));
      }
      const ext = extFromContentType(res.headers['content-type'] || '');
      const dest = destBase + '.' + ext;
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(path.basename(dest))));
    }).on('error', reject);
  });
}

(async () => {
  const seen = new Map(); // imageUrl -> local filename
  let ok = 0, fail = 0;
  for (const it of items) {
    if (!it.imageUrl) continue;
    if (seen.has(it.imageUrl)) { it.localImage = seen.get(it.imageUrl); continue; }
    const base = path.join(dir, slugify(it.name));
    try {
      const filename = await download(it.imageUrl, base);
      it.localImage = 'images/' + filename;
      seen.set(it.imageUrl, it.localImage);
      ok++;
    } catch (e) {
      it.localImage = '';
      fail++;
      console.log('FAIL', it.name, e.message);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'treasures.json'), JSON.stringify(items, null, 1));
  console.log('done. ok:', ok, 'fail:', fail);
})();
