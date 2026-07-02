// Fetches the Kakao/global (CookieRunHUB) treasure dataset.
// Source: https://www.cookierunhub.com/en/encyclopedia?type=treasure
const fs = require('fs');
const path = require('path');

(async () => {
  const res = await fetch('https://api.cookierunhub.com/api/v1/game-data/treasures');
  const raw = await res.json();

  const outPath = path.join(__dirname, 'treasures-kr.json');
  const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : [];
  const existingById = new Map(existing.map(it => [it.id, it]));

  const items = raw.map(it => ({
    id: it.id,
    name: it.name,
    englishName: it.english_name,
    grade: it.grade,
    category: it.category, // 'cookie' | 'pet'
    image: it.image_path, // e.g. "treasures/angel_cookie_holy_feather.webp"
    ability: it.ability, // Korean, raw
    abilityEn: existingById.get(it.id)?.abilityEn || '', // preserved across re-fetch, filled in via the translator admin tool
    evolvedFromId: it.evolved_from_id,
    ownerCookieId: it.owner_cookie_id,
    ownerPetId: it.owner_pet_id,
  }));

  fs.writeFileSync(outPath, JSON.stringify(items, null, 1));
  console.log('fetched', items.length, 'items');
})();
