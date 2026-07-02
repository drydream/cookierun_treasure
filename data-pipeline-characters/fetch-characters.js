// One-time (re-runnable) local script: pulls Cookies + Pets from
// cookierunhub.com's JSON API, downloads their images into
// public/images-char/, does a rough Korean->English machine translation of
// the ability text, and writes public/characters.json for the
// import-characters.js endpoint to load. Run with: node fetch-characters.js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.join(__dirname, '..', 'public', 'images-char');
const OUT_FILE = path.join(__dirname, '..', 'public', 'characters.json');
const HUB_API = 'https://api.cookierunhub.com/api/v1/game-data';
const HUB_IMAGES = 'https://www.cookierunhub.com/images';

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

async function downloadImage(imagePath) {
  const res = await fetch(`${HUB_IMAGES}/${imagePath}`);
  if (!res.ok) throw new Error('status ' + res.status);
  const ext = extFromContentType(res.headers.get('content-type') || '');
  const filename = slugify(imagePath.replace(/\.[a-z0-9]+$/i, '')) + '.' + ext;
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(path.join(IMG_DIR, filename), buf);
  return 'images-char/' + filename;
}

// ponytail: unofficial, no-key Google Translate endpoint — good enough for a
// rough first pass; admin can hand-refine later same as KR treasures.
async function translate(text) {
  if (!text) return null;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data[0].map(chunk => chunk[0]).join('');
}

async function processOne(kind, it, imgCache) {
  let image = null;
  if (it.image_path) {
    if (imgCache.has(it.image_path)) {
      image = imgCache.get(it.image_path);
    } else {
      try {
        image = await downloadImage(it.image_path);
      } catch (e) {
        console.log('IMAGE FAIL', it.english_name, e.message);
      }
      imgCache.set(it.image_path, image);
    }
  }
  let abilityEn = null;
  try {
    abilityEn = await translate(it.ability);
  } catch (e) {
    console.log('TRANSLATE FAIL', it.english_name, e.message);
  }
  return {
    kind,
    name: it.english_name || it.name,
    kr_name: it.name || null,
    grade: it.grade || null,
    ability: it.ability || null,
    ability_en: abilityEn,
    image,
  };
}

(async () => {
  await fs.mkdir(IMG_DIR, { recursive: true });
  const [cookies, pets] = await Promise.all([
    fetch(`${HUB_API}/cookies`).then(r => r.json()),
    fetch(`${HUB_API}/pets`).then(r => r.json()),
  ]);

  const imgCache = new Map();
  const rows = [];
  for (const it of cookies) rows.push(await processOne('cookie', it, imgCache));
  for (const it of pets) rows.push(await processOne('pet', it, imgCache));

  await fs.writeFile(OUT_FILE, JSON.stringify(rows, null, 1));
  console.log('done.', rows.length, 'rows,', imgCache.size, 'unique images ->', OUT_FILE);
})();
