const fs = require('fs');
const path = require('path');
const https = require('https');

const items = require('./treasures-kr.json');
const outDir = path.join(__dirname, 'images-kr');
fs.mkdirSync(outDir, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(download(res.headers.location, dest));
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(url + ' -> ' + res.statusCode)); return; }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

(async () => {
  let done = 0, skipped = 0, failed = 0;
  for (const it of items) {
    const isAbsolute = /^https?:\/\//.test(it.image);
    const dest = path.join(outDir, path.basename(it.image));
    it.localImage = 'images-kr/' + path.basename(it.image);
    if (fs.existsSync(dest)) { skipped++; continue; }
    try {
      const url = isAbsolute ? it.image : 'https://www.cookierunhub.com/images/' + it.image;
      await download(url, dest);
      done++;
    } catch (e) {
      failed++;
      console.log('FAILED', it.image, e.message);
    }
  }
  fs.writeFileSync(path.join(__dirname, 'treasures-kr.json'), JSON.stringify(items, null, 1));
  console.log('downloaded', done, '| skipped(existing)', skipped, '| failed', failed);
})();
