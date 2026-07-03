import { useEffect, useMemo, useRef, useState } from 'react';

const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZGhzbnlubGx6b2l0Ym9sbmdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NTk3MDYsImV4cCI6MjA5ODUzNTcwNn0.yBoBJ3R_AHpjNQG1ikIwfXFOLfWQWSiwZgLaP8m-hxI';
const TURNSTILE_SITE_KEY = '0x4AAAAAADujU_67p4B8imJx';

const TIERS = ['power plus (SSSS)', 'SSS', 'SS', 'S', 'A', 'B', 'E', 'F', 'ขยะ', 'เฉพาะทาง'];
const TIER_COLORS = {
  'power plus (SSSS)': '#c3d4f5',
  SSS: '#ef5350',
  SS: '#ffb74d',
  S: '#fff176',
  A: '#c5e1a5',
  B: '#81c784',
  E: '#90a4ae',
  F: '#f48fb1',
  ขยะ: '#ffd54f',
  เฉพาะทาง: '#81d4fa',
};

const PURPOSES = ['score', 'auto_farm', 'semi_auto', 'coins', 'exp', 'boxes'];
const EPISODES = ['ep1', 'ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'special1', 'special2', 'special3'];
const BOOSTS = ['energy_boost', 'item_time', 'fast_start'];
const RANDOM_BOOST_OPTIONS = [
  'double_coins', 'hp_drain_15', 'crush_70', 'gold_coin_magic', 'hp_potion_20',
  'pit_lift_2', 'score_bonus_15', 'revive_80hp', 'speed_17', 'collision_30', 'magnetic_aura',
];
const POWER_EFFECTS = ['cheerleader', 'special_force', 'fairy', 'cheesecake', 'sea_fairy', 'serenade'];
// Maps each Power+ effect to the cookie/pet whose portrait represents it,
// so a real icon can be shown instead of a generic one. 'serenade' isn't a
// cookie (cookierunhub calls it "Serenade of Love" with a piano icon) — it's
// Ms. Do-Re-Mi's (S-grade pet) effect instead.
const POWER_EFFECT_CHAR = {
  cheerleader: { kind: 'cookie', name: 'Cheerleader Cookie' },
  special_force: { kind: 'cookie', name: 'Special Force Cookie' },
  fairy: { kind: 'cookie', name: 'Fairy Cookie' },
  cheesecake: { kind: 'cookie', name: 'Cheesecake Cookie' },
  sea_fairy: { kind: 'cookie', name: 'Sea Fairy Cookie' },
  serenade: { kind: 'pet', name: 'Ms. Do-Re-Mi' },
};

const i18n = {
  en: {
    title: 'Cookie Run Classic Treasure Search',
    placeholder: 'Type an ability, e.g. obstacle, energy, coin, jump...',
    all: 'All',
    count: n => `${n} treasures`,
    evolution: 'Evolution',
    evolved: 'Evolved',
    blessed: 'Blessed:',
    recipeBtn: 'Evolution recipe',
    evolvedFrom: 'Evolved from:',
    evolvesTo: 'Evolves to:',
    linkedTreasures: 'Treasure:',
    comboPet: 'Combi Pet:',
    ingredients: 'Ingredients:',
    noAbility: 'No ability data available yet',
    versionAll: 'All versions',
    versionLine: 'LINE',
    versionKr: 'Kakao/Global',
    loadMore: 'Load more',
    donateBtn: '☕ Buy me a coffee',
    donateTitle: 'Buy me a coffee',
    donateBank: 'Kasikorn Bank',
    donateClose: 'Close',
    navHome: 'Home',
    navTreasure: 'Treasure Search',
    navTierlist: 'Tier List',
    navCookies: 'Cookies',
    navPets: 'Pets',
    charCount: n => `${n} items`,
    charSearchPlaceholder: 'Search by name...',
    charViewList: 'Browse',
    tierEmpty: 'No treasures ranked yet',
    tierFormBase: 'Base form',
    tierFormEvolved: 'Evolved form',
    editBtn: '✎ Edit',
    navBuilds: 'Build Creator',
    buildAddBtn: '+ Add build',
    buildBackBtn: '← Back to builds',
    buildNone: 'No builds yet for this filter',
    buildPurpose: { score: 'Score', auto_farm: 'Auto Farm', semi_auto: 'Semi-Auto', coins: 'Coins', exp: 'EXP', boxes: 'Boxes' },
    buildEpisode: { ep1: 'EP 1', ep2: 'EP 2', ep3: 'EP 3', ep4: 'EP 4', ep5: 'EP 5', ep6: 'EP 6', special1: 'Special 1', special2: 'Special 2', special3: 'Special 3' },
    buildKind: { cookie: 'Cookie', pet: 'Pet', treasure: 'Treasure' },
    buildSearchPlaceholder: 'Type to search a cookie, pet, or treasure...',
    buildAddItem: 'Add to combi',
    buildCombiEmpty: 'No items added yet',
    buildSubmit: 'Submit build',
    buildSubmitting: 'Submitting...',
    buildSubmitted: 'Build submitted!',
    buildSubmitError: 'Failed to submit build',
    buildShare: 'Share build (copy link)',
    buildLinkCopied: 'Link copied!',
    buildSlot: { main: 'Main', relay: 'Relay (optional)', pet: 'Pet' },
    buildTreasureSlot: 'Treasure (optional, up to 3)',
    buildAddTreasure: '+ Add Treasure',
    buildBoosts: 'Boosts',
    buildBoostLabel: { energy_boost: 'Energy Boost', item_time: 'Item Time', fast_start: 'Fast Start' },
    buildRandomBoost: 'Random Boost',
    buildRandomBoostLabel: {
      double_coins: 'Double Coins',
      hp_drain_15: '-15% HP drain',
      crush_70: '70% Crush Chance',
      gold_coin_magic: 'Gold Coin Magic',
      hp_potion_20: '+20% HP from potions',
      pit_lift_2: '2 Pit Lifts',
      score_bonus_15: '15% score bonus',
      revive_80hp: 'Revive once with 80 HP',
      speed_17: '+17% base speed',
      collision_30: '-30% collision damage',
      magnetic_aura: 'Magnetic Aura',
    },
    buildPowerEffects: 'Power+ Effects',
    buildPowerEffectLabel: { cheerleader: 'Cheerleader', special_force: 'Special Force', fairy: 'Fairy', cheesecake: 'Cheesecake', sea_fairy: 'Sea Fairy', serenade: 'Serenade of Love' },
    buildPowerEffectDesc: {
      cheerleader: 'Cheerleader Cookie appears unexpectedly during the run and restores 30 Stamina (more at higher upgrade levels).',
      special_force: 'Special Force Cookie appears unexpectedly during the run and provides supporting fire.',
      fairy: 'Fairy Cookie creates a shield with a certain probability during the run.',
      cheesecake: 'Periodically summons Coin Fireworks Parties during play (leveling up extends the duration).',
      sea_fairy: 'Sea Fairy Cookie recovers some collision damage with a certain probability when hitting an obstacle (more at higher upgrade levels).',
      serenade: 'Activates Love Serenade and restores HP once Ms. Do-Re-Mi or Mr. Fa-Sol-La-Si (both S-grade pets) has been obtained.',
    },
    buildScore: 'Score',
    buildCoins: 'Coins',
    buildNotes: 'Notes',
    buildPickerSearch: 'Search by name...',
    buildTreasureBase: 'Base Treasures',
    buildTreasureEvolved: 'Evolved Treasures',
    buildClear: 'Clear',
    buildPassword: 'Password (4-20 chars, needed to edit/delete later)',
    buildEdit: 'Edit',
    buildDelete: 'Delete',
    buildPasswordPromptEdit: 'Enter this build\'s password to edit it',
    buildPasswordPromptDelete: 'Enter this build\'s password to delete it',
    buildConfirm: 'Confirm',
    buildCancel: 'Cancel',
    buildWrongPassword: 'Wrong password',
    buildDeleted: 'Build deleted',
    buildSaved: 'Saved!',
    buildYoutube: 'YouTube link (optional)',
    buildYoutubePlaceholder: 'https://youtube.com/...',
    buildWatchVideo: 'Watch video',
  },
  th: {
    title: 'ค้นหาสมบัติ Cookie Run Classic',
    placeholder: 'พิมพ์ความสามารถ เช่น obstacle, energy, coin, jump...',
    all: 'ทั้งหมด',
    count: n => `พบ ${n} รายการ`,
    evolution: 'วิวัฒนาการ',
    evolved: 'วิวัฒนาการ',
    blessed: 'อัปเกรดพร (Blessed):',
    recipeBtn: 'สูตรวิวัฒนาการ',
    evolvedFrom: 'วิวัฒนาการมาจาก:',
    evolvesTo: 'วิวัฒนาการเป็น:',
    linkedTreasures: 'ของวิเศษ:',
    comboPet: 'Combi เพ็ท:',
    ingredients: 'วัตถุดิบ:',
    noAbility: 'ยังไม่มีข้อมูลความสามารถ',
    versionAll: 'ทุกเวอร์ชัน',
    versionLine: 'LINE',
    versionKr: 'Kakao/Global',
    loadMore: 'โหลดเพิ่ม',
    donateBtn: '☕ บริจาคค่ากาแฟ',
    donateTitle: 'บริจาคค่ากาแฟ',
    donateBank: 'ธนาคารกสิกรไทย',
    donateClose: 'ปิด',
    navHome: 'หน้าแรก',
    navTreasure: 'ค้นหาสมบัติ',
    navTierlist: 'Tier List',
    navCookies: 'คุกกี้',
    navPets: 'เพ็ท',
    charCount: n => `${n} รายการ`,
    charSearchPlaceholder: 'ค้นหาจากชื่อ...',
    charViewList: 'รายการทั้งหมด',
    tierEmpty: 'ยังไม่มีการจัดอันดับ',
    tierFormBase: 'ก่อนวิวัฒนาการ',
    tierFormEvolved: 'หลังวิวัฒนาการ',
    editBtn: '✎ แก้ไข',
    navBuilds: 'Build Creator',
    buildAddBtn: '+ เพิ่ม build',
    buildBackBtn: '← กลับไปหน้า build',
    buildNone: 'ยังไม่มี build ในหมวดนี้',
    buildPurpose: { score: 'Score', auto_farm: 'Auto Farm', semi_auto: 'Semi-Auto', coins: 'Coins', exp: 'EXP', boxes: 'Boxes' },
    buildEpisode: { ep1: 'EP 1', ep2: 'EP 2', ep3: 'EP 3', ep4: 'EP 4', ep5: 'EP 5', ep6: 'EP 6', special1: 'Special 1', special2: 'Special 2', special3: 'Special 3' },
    buildKind: { cookie: 'คุกกี้', pet: 'เพ็ท', treasure: 'สมบัติ' },
    buildSearchPlaceholder: 'พิมพ์ค้นหาคุกกี้ เพ็ท หรือสมบัติ...',
    buildAddItem: 'เพิ่มลง combi',
    buildCombiEmpty: 'ยังไม่มีไอเทมใน combi นี้',
    buildSubmit: 'ส่ง build',
    buildSubmitting: 'กำลังส่ง...',
    buildSubmitted: 'ส่ง build สำเร็จ!',
    buildSubmitError: 'ส่ง build ไม่สำเร็จ',
    buildShare: 'แชร์ build (คัดลอกลิงก์)',
    buildLinkCopied: 'คัดลอกลิงก์แล้ว!',
    buildSlot: { main: 'Main', relay: 'Relay (ไม่บังคับ)', pet: 'Pet' },
    buildTreasureSlot: 'สมบัติ (ไม่บังคับ, สูงสุด 3 ชิ้น)',
    buildAddTreasure: '+ เพิ่มสมบัติ',
    buildBoosts: 'Boosts',
    buildBoostLabel: { energy_boost: 'Energy Boost', item_time: 'Item Time', fast_start: 'Fast Start' },
    buildRandomBoost: 'Random Boost',
    buildRandomBoostLabel: {
      double_coins: 'เหรียญคูณสอง',
      hp_drain_15: 'ลดการเสีย HP 15%',
      crush_70: 'โอกาสทำลายสิ่งกีดขวาง 70%',
      gold_coin_magic: 'แม่เหล็กเหรียญทอง',
      hp_potion_20: 'ฟื้นฟู HP จากโพชั่น +20%',
      pit_lift_2: 'พ้นหลุม 2 ครั้ง',
      score_bonus_15: 'โบนัสคะแนน 15%',
      revive_80hp: 'ฟื้นคืนชีพ 1 ครั้ง (HP 80)',
      speed_17: 'ความเร็วพื้นฐาน +17%',
      collision_30: 'ลดความเสียหายจากการชน 30%',
      magnetic_aura: 'Magnetic Aura',
    },
    buildPowerEffects: 'Power+ Effects',
    buildPowerEffectLabel: { cheerleader: 'Cheerleader', special_force: 'Special Force', fairy: 'Fairy', cheesecake: 'Cheesecake', sea_fairy: 'Sea Fairy', serenade: 'Serenade of Love' },
    buildPowerEffectDesc: {
      cheerleader: 'Cheerleader Cookie จะโผล่มาแบบไม่คาดคิดระหว่างวิ่งแล้วฟื้นฟู Stamina 30 หน่วย (อัปเกรดยิ่งสูงยิ่งฟื้นเยอะ)',
      special_force: 'Special Force Cookie จะโผล่มาแบบไม่คาดคิดระหว่างวิ่งแล้วช่วยยิงสนับสนุน',
      fairy: 'Fairy Cookie มีโอกาสสร้างโล่ป้องกันระหว่างวิ่ง',
      cheesecake: 'เปิด Coin Fireworks Party เป็นระยะระหว่างวิ่ง (อัปเกรดยิ่งสูงยิ่งอยู่นาน)',
      sea_fairy: 'Sea Fairy Cookie มีโอกาสฟื้นฟูความเสียหายบางส่วนเมื่อชนสิ่งกีดขวาง (อัปเกรดยิ่งสูงยิ่งฟื้นเยอะ)',
      serenade: 'เปิด Love Serenade และฟื้นฟู HP เมื่อมี Ms. Do-Re-Mi หรือ Mr. Fa-Sol-La-Si (เพ็ท S-grade ทั้งคู่)',
    },
    buildScore: 'Score',
    buildCoins: 'Coins',
    buildNotes: 'หมายเหตุ',
    buildPickerSearch: 'ค้นหาจากชื่อ...',
    buildTreasureBase: 'สมบัติก่อนวิวัฒนาการ',
    buildTreasureEvolved: 'สมบัติหลังวิวัฒนาการ',
    buildClear: 'ล้าง',
    buildPassword: 'รหัสผ่าน (4-20 ตัวอักษร ใช้แก้ไข/ลบทีหลัง)',
    buildEdit: 'แก้ไข',
    buildDelete: 'ลบ',
    buildPasswordPromptEdit: 'ใส่รหัสผ่านของ build นี้เพื่อแก้ไข',
    buildPasswordPromptDelete: 'ใส่รหัสผ่านของ build นี้เพื่อลบ',
    buildConfirm: 'ยืนยัน',
    buildCancel: 'ยกเลิก',
    buildWrongPassword: 'รหัสผ่านไม่ถูกต้อง',
    buildDeleted: 'ลบ build แล้ว',
    buildSaved: 'บันทึกแล้ว!',
    buildYoutube: 'ลิงก์ YouTube (ไม่บังคับ)',
    buildYoutubePlaceholder: 'https://youtube.com/...',
    buildWatchVideo: 'ดูวิดีโอ',
  },
};

// Supabase caps each response at 1000 rows regardless of the requested
// Range, so page through in batches until a short page signals the end.
async function fetchAllTreasures() {
  const PAGE = 1000;
  let all = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/treasures?select=*&order=id.asc`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Range: `${offset}-${offset + PAGE - 1}`,
      },
    });
    const page = await res.json();
    all = all.concat(page);
    if (page.length < PAGE) break;
  }
  return all;
}

async function fetchAllCharacters() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/characters?select=*&order=name.asc`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  return res.json();
}

async function fetchAllBuilds() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/builds?select=*&order=created_at.desc`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  return res.json();
}

async function fetchBuildById(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/builds?id=eq.${id}&select=*`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  const [build] = await res.json();
  return build || null;
}

function shareBuildUrl(id) {
  return `${window.location.origin}/build/${id}`;
}

// Open to the public (no admin password), but gated by a Cloudflare
// Turnstile bot check verified server-side in /api/submit-build.
async function submitBuild(turnstileToken, fields) {
  const res = await fetch('/api/submit-build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ turnstileToken, ...fields }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
}

// Owner self-service edit/delete, gated by the password chosen at submit
// time (see /api/submit-build's PATCH/DELETE handlers) — no admin login.
async function editBuild(id, password, fields) {
  const res = await fetch(`/api/submit-build?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, ...fields }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
}

// Public, password-free - anyone can like a build once (enforced
// client-side via localStorage, see BuildCreatorPage).
async function likeBuild(id) {
  const res = await fetch(`/api/submit-build?id=${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ like: true }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
}

async function deleteBuildByOwner(id, password) {
  const res = await fetch(`/api/submit-build?id=${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
}

function toggleInList(list, setList, value) {
  setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
}

function highlight(text, q) {
  if (!q) return text;
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
  return text.split(re).map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? <mark key={i}>{part}</mark> : part
  );
}

function RelatedItem({ name, image, onJump }) {
  return (
    <button type="button" className="related-link" onClick={() => onJump(name)}>
      {image && <img className="inline-icon" src={image} alt="" loading="lazy" />}
      {name}
    </button>
  );
}

function Card({ item, query, t, lang, evolvesTo, imageByName, onJump, isAdmin, cookieImageMap, onJumpToCookie }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <img src={item.localImage} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />
      <div className="body">
        <span className="name">{highlight(item.name, query)}</span>
        <span className="grade">{item.grade}-grade</span>
        <span className="version-tag">{item.version === 'kr' ? t.versionKr : t.versionLine}</span>
        {item.type === 'evolved' && <span className="evolved-tag">{t.evolved}</span>}
        {item.tier && <span className="tier-tag">{item.tier}</span>}
        {isAdmin && <a className="admin-edit-link" href={`admin.html?edit=${item.id}`} target="_blank" rel="noopener">{t.editBtn}</a>}
        {(lang === 'th' && item.effectTh) ? (
          <div className="effect">{highlight(item.effectTh, query)}</div>
        ) : item.effect ? (
          <div className="effect">{highlight(item.effect, query)}</div>
        ) : (
          <div className="effect muted">{t.noAbility}</div>
        )}
        {item.blessedEffect && (
          <div className="blessed"><span className="blessed-label">{t.blessed}</span> {highlight(item.blessedEffect, query)}</div>
        )}
        <div className="meta">
          {item.section}
          {item.extra && (
            cookieImageMap.has(item.extra) ? (
              <>
                {' — '}
                <RelatedItem name={item.extra} image={cookieImageMap.get(item.extra)} onJump={onJumpToCookie} />
              </>
            ) : ' — ' + item.extra
          )}
        </div>
        {evolvesTo && (
          <div className="evolves-to">
            <span className="label">{t.evolvesTo}</span>{' '}
            <RelatedItem name={evolvesTo} image={imageByName[item.version + '|' + evolvesTo]} onJump={onJump} />
          </div>
        )}
        {item.baseItem && (
          <>
            <button type="button" className="recipe-btn" onClick={() => setOpen(o => !o)}>{t.recipeBtn}</button>
            <div className={'recipe' + (open ? ' open' : '')}>
              <div className="row">
                <span className="label">{t.evolvedFrom}</span>{' '}
                <RelatedItem name={item.baseItem} image={imageByName[item.version + '|' + item.baseItem]} onJump={onJump} />
              </div>
              {item.ingredients && (
                <div className="row">
                  <span className="label">{t.ingredients}</span>{' '}
                  {item.ingredients.map((ing, i) => (
                    <span key={ing.name}>
                      {i > 0 && ', '}
                      <RelatedItem name={ing.name} onJump={onJump} />
                      {ing.grade ? ` (${ing.grade})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HomePage({ t, onNavigate }) {
  return (
    <div className="home">
      <img className="home-banner" src="banner.jpg" alt="Cookie Run Classic" />
      <div className="home-menu">
        <button type="button" onClick={() => onNavigate('treasure')}>{t.navTreasure}</button>
        <button type="button" onClick={() => onNavigate('tierlist')}>{t.navTierlist}</button>
        <button type="button" onClick={() => onNavigate('cookies')}>{t.navCookies}</button>
        <button type="button" onClick={() => onNavigate('pets')}>{t.navPets}</button>
        <button type="button" onClick={() => onNavigate('buildcreator')}>{t.navBuilds}</button>
      </div>
    </div>
  );
}

function TierListPage({ items, t, onSelect }) {
  const [showEvolved, setShowEvolved] = useState(false);
  return (
    <div>
      <div className="grade-filter">
        <button className={!showEvolved ? 'active' : ''} onClick={() => setShowEvolved(false)}>{t.tierFormBase}</button>
        <button className={showEvolved ? 'active' : ''} onClick={() => setShowEvolved(true)}>{t.tierFormEvolved}</button>
      </div>
      <div className="tierlist">
        {TIERS.map(tier => {
          const list = items.filter(it => it.tier === tier);
          return (
            <div className="tier-row" key={tier}>
              <div className="tier-label" style={{ background: TIER_COLORS[tier] }}>{tier}</div>
              <div className="tier-items">
                {list.length === 0 && <span className="tier-empty">{t.tierEmpty}</span>}
                {list.map((it, i) => {
                  const display = showEvolved ? (items.find(x => x.baseItem === it.name) || it) : it;
                  return (
                    <button
                      type="button"
                      key={it.version + it.name + i}
                      className="tier-item"
                      title={display.name}
                      onClick={() => onSelect(display.name)}
                    >
                      <img
                        className="tier-icon"
                        src={display.localImage}
                        alt=""
                        loading="lazy"
                        onError={e => { e.target.style.visibility = 'hidden'; }}
                      />
                      <span className="tier-name">{display.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CharacterTierListPage({ characters, kind, t }) {
  const list = useMemo(() => characters.filter(c => c.kind === kind), [characters, kind]);
  return (
    <div className="tierlist">
      {TIERS.map(tier => {
        const tierItems = list.filter(c => c.tier === tier);
        return (
          <div className="tier-row" key={tier}>
            <div className="tier-label" style={{ background: TIER_COLORS[tier] }}>{tier}</div>
            <div className="tier-items">
              {tierItems.length === 0 && <span className="tier-empty">{t.tierEmpty}</span>}
              {tierItems.map(c => (
                <div key={c.id} className="tier-item" title={c.name}>
                  {c.image && <img className="tier-icon" src={c.image} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />}
                  <span className="tier-name">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function linkedTreasuresFor(name, treasures) {
  const base = treasures.filter(it => it.extra === name);
  const baseNames = new Set(base.map(it => it.name));
  const evolved = treasures.filter(it => baseNames.has(it.baseItem));
  return [...base, ...evolved];
}

function CharacterListPage({ characters, kind, t, initialQuery, treasures, onJumpToTreasure, comboPetByCookieName, onJumpToPet }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [grade, setGrade] = useState('all');
  const [view, setView] = useState('list');
  const list = useMemo(() => characters.filter(c => c.kind === kind), [characters, kind]);
  const grades = useMemo(() => ['all', ...new Set(list.map(c => c.grade).filter(Boolean))], [list]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter(c => {
      if (grade !== 'all' && c.grade !== grade) return false;
      if (q && !c.name.toLowerCase().includes(q) && !(c.kr_name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [list, query, grade]);

  return (
    <>
      <div className="grade-filter">
        <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>{t.charViewList}</button>
        <button className={view === 'tier' ? 'active' : ''} onClick={() => setView('tier')}>{t.navTierlist}</button>
      </div>
      {view === 'tier' ? (
        <CharacterTierListPage characters={characters} kind={kind} t={t} />
      ) : (
        <>
          <div className="toolbar">
            <input id="search" type="text" placeholder={t.charSearchPlaceholder} value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="grade-filter">
            {grades.map(g => (
              <button key={g} className={grade === g ? 'active' : ''} onClick={() => setGrade(g)}>{g === 'all' ? t.all : g}</button>
            ))}
          </div>
          <div id="count">{t.charCount(filtered.length)}</div>
          <div id="list">
            {filtered.map(c => {
              const linked = kind === 'cookie' && treasures ? linkedTreasuresFor(c.name, treasures) : [];
              const comboPet = kind === 'cookie' && comboPetByCookieName ? comboPetByCookieName.get(c.name) : null;
              return (
                <div className="card" key={c.id}>
                  {c.image && <img src={c.image} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />}
                  <div className="body">
                    <span className="name">{c.name}</span>
                    {c.grade && <span className="grade">{c.grade}-grade</span>}
                    {(c.ability_en || c.ability) && <div className="effect">{c.ability_en || c.ability}</div>}
                    {comboPet && (
                      <div className="evolves-to">
                        <span className="label">{t.comboPet}</span>{' '}
                        <RelatedItem name={comboPet.name} image={comboPet.image} onJump={onJumpToPet} />
                      </div>
                    )}
                    {linked.length > 0 && (
                      <div className="evolves-to">
                        <span className="label">{t.linkedTreasures}</span>{' '}
                        {linked.map((it, i) => (
                          <span key={it.name}>
                            {i > 0 && ', '}
                            <RelatedItem name={it.name} image={it.localImage} onJump={onJumpToTreasure} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// entry.slot is one of 'main'/'relay'/'pet'/'treasure'. Older test submissions
// used entry.kind ('cookie'/'pet'/'treasure') instead — fall back to that.
function combiEntryDisplayKind(entry) {
  const key = entry.slot || entry.kind;
  if (key === 'treasure') return 'treasure';
  if (key === 'pet') return 'pet';
  return 'cookie';
}

function resolveCombiIcon(entry, items, characters) {
  const displayKind = combiEntryDisplayKind(entry);
  if (displayKind === 'treasure') {
    const it = items.find(x => x.name === entry.name);
    return it ? it.localImage : null;
  }
  const c = characters.find(x => x.kind === displayKind && x.name === entry.name);
  return c ? c.image : null;
}

function ItemPickerModal({ title, kind, items, characters, onSelect, onClose, t }) {
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('all');
  const [subTab, setSubTab] = useState('base');

  const candidates = useMemo(() => {
    if (kind === 'treasure') {
      const seen = new Set();
      return items.filter(it => {
        if (it.type !== subTab) return false;
        if (seen.has(it.name)) return false;
        seen.add(it.name);
        return true;
      });
    }
    return characters.filter(c => c.kind === kind);
  }, [kind, items, characters, subTab]);

  const grades = useMemo(() => ['all', ...new Set(candidates.map(c => c.grade).filter(Boolean))], [candidates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter(c => {
      if (grade !== 'all' && c.grade !== grade) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [candidates, search, grade]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal picker-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>&times;</button>
        <h2>{title}</h2>
        {kind === 'treasure' && (
          <div className="grade-filter">
            <button className={subTab === 'base' ? 'active' : ''} onClick={() => setSubTab('base')}>{t.buildTreasureBase}</button>
            <button className={subTab === 'evolved' ? 'active' : ''} onClick={() => setSubTab('evolved')}>{t.buildTreasureEvolved}</button>
          </div>
        )}
        <input type="text" placeholder={t.buildPickerSearch} value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem', margin: '0.5rem 0' }} />
        <div className="grade-filter">
          {grades.map(g => (
            <button key={g} className={grade === g ? 'active' : ''} onClick={() => setGrade(g)}>{g === 'all' ? t.all : g}</button>
          ))}
        </div>
        <div className="picker-grid">
          {filtered.map(c => {
            const img = kind === 'treasure' ? c.localImage : c.image;
            return (
              <button type="button" key={c.id} className="picker-item" onClick={() => onSelect(c)}>
                {img && <img src={img} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />}
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PasswordPrompt({ label, t, onConfirm, onCancel, error }) {
  const [password, setPassword] = useState('');
  return (
    <div className="password-prompt">
      <div>{label}</div>
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus />
      <button type="button" className="recipe-btn" onClick={() => onConfirm(password)}>{t.buildConfirm}</button>
      <button type="button" className="recipe-btn" onClick={onCancel}>{t.buildCancel}</button>
      {error && <div className="effect error-text">{error}</div>}
    </div>
  );
}

function BuildCreatorPage({ items, characters, t, initialBuildId }) {
  const [view, setView] = useState('browse');
  const [purposeFilter, setPurposeFilter] = useState([]);
  const [episodeFilter, setEpisodeFilter] = useState([]);
  const [builds, setBuilds] = useState([]);
  const [highlightId, setHighlightId] = useState(initialBuildId || null);
  const [copiedId, setCopiedId] = useState(null);
  const [prompt, setPrompt] = useState(null); // { id, action: 'edit' | 'delete' } | null
  const [promptError, setPromptError] = useState('');
  const [editingBuild, setEditingBuild] = useState(null); // { build, password } | null
  const [likedIds, setLikedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('likedBuilds') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    fetchAllBuilds().then(setBuilds);
  }, []);

  useEffect(() => {
    if (!initialBuildId) return;
    fetchBuildById(initialBuildId).then(b => {
      if (b) { setPurposeFilter(b.purposes || []); setEpisodeFilter(b.episodes || []); }
    });
  }, [initialBuildId]);

  const filtered = useMemo(() => {
    const list = builds.filter(b =>
      (purposeFilter.length === 0 || (b.purposes || []).some(p => purposeFilter.includes(p))) &&
      (episodeFilter.length === 0 || (b.episodes || []).some(ep => episodeFilter.includes(ep)))
    );
    return list.slice().sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }, [builds, purposeFilter, episodeFilter]);

  async function handleLike(id) {
    if (likedIds.includes(id)) return;
    try {
      await likeBuild(id);
      setBuilds(bs => bs.map(b => b.id === id ? { ...b, likes: (b.likes || 0) + 1 } : b));
      const next = [...likedIds, id];
      setLikedIds(next);
      localStorage.setItem('likedBuilds', JSON.stringify(next));
    } catch {
      // best-effort - a failed like isn't worth surfacing an error for
    }
  }

  function backToBrowse() {
    setView('browse');
    setEditingBuild(null);
    fetchAllBuilds().then(setBuilds);
  }

  function shareBuild(id) {
    setHighlightId(null);
    navigator.clipboard.writeText(shareBuildUrl(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(c => (c === id ? null : c)), 1500);
  }

  async function confirmPrompt(password) {
    const { id, action } = prompt;
    if (action === 'delete') {
      try {
        await deleteBuildByOwner(id, password);
        setBuilds(bs => bs.filter(b => b.id !== id));
        setPrompt(null);
        setPromptError('');
      } catch {
        setPromptError(t.buildWrongPassword);
      }
      return;
    }
    const build = builds.find(b => b.id === id);
    setEditingBuild({ build, password });
    setView('add');
    setPrompt(null);
    setPromptError('');
  }

  return (
    <>
      <div className="grade-filter">
        {PURPOSES.map(p => (
          <button key={p} className={purposeFilter.includes(p) ? 'active' : ''} onClick={() => toggleInList(purposeFilter, setPurposeFilter, p)}>{t.buildPurpose[p]}</button>
        ))}
      </div>
      <div className="grade-filter">
        {EPISODES.map(ep => (
          <button key={ep} className={episodeFilter.includes(ep) ? 'active' : ''} onClick={() => toggleInList(episodeFilter, setEpisodeFilter, ep)}>{t.buildEpisode[ep]}</button>
        ))}
      </div>
      {view === 'add' ? (
        <BuildAddForm items={items} characters={characters} t={t} editing={editingBuild} onDone={backToBrowse} onCancel={() => { setEditingBuild(null); setView('browse'); }} />
      ) : (
        <>
          <button type="button" className="recipe-btn" onClick={() => setView('add')}>{t.buildAddBtn}</button>
          <div id="list">
            {filtered.length === 0 && <div className="effect muted" style={{ marginTop: '1rem' }}>{t.buildNone}</div>}
            {filtered.map(b => (
              <div className={'card' + (b.id === highlightId ? ' build-highlight' : '')} key={b.id}>
                <div className="body">
                  <div className="combi-icons">
                    {b.combi.map((entry, i) => {
                      const icon = resolveCombiIcon(entry, items, characters);
                      return (
                        <div className={'combi-icon combi-icon-' + combiEntryDisplayKind(entry)} key={i} title={entry.name}>
                          {icon && <img src={icon} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />}
                          {combiEntryDisplayKind(entry) === 'treasure' && !!entry.level && (
                            <span className="treasure-level-badge">+{entry.level}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {((b.purposes && b.purposes.length) || (b.episodes && b.episodes.length)) && (
                    <div className="build-tags-row">
                      {(b.purposes || []).map(p => <span key={'p' + p} className="build-tag build-tag-purpose">{t.buildPurpose[p] || p}</span>)}
                      {(b.episodes || []).map(ep => <span key={'e' + ep} className="build-tag build-tag-episode">{t.buildEpisode[ep] || ep}</span>)}
                    </div>
                  )}
                  {(b.score != null || b.coins != null) && (
                    <div className="build-tags-row">
                      {b.score != null && <span className="build-tag build-tag-stat">{t.buildScore}: {b.score}</span>}
                      {b.coins != null && <span className="build-tag build-tag-stat">{t.buildCoins}: {b.coins}</span>}
                    </div>
                  )}
                  {((b.boosts && b.boosts.length) || b.random_boost) && (
                    <div className="build-tags-row">
                      {(b.boosts || []).map(bo => <span key={'bo' + bo} className="build-tag build-tag-boost">{t.buildBoostLabel[bo] || bo}</span>)}
                      {b.random_boost && <span className="build-tag build-tag-random">{t.buildRandomBoostLabel[b.random_boost] || b.random_boost}</span>}
                    </div>
                  )}
                  {b.power_effects && b.power_effects.length > 0 && (
                    <div className="build-tags-row">
                      {b.power_effects.map(pe => <span key={'pe' + pe} className="build-tag build-tag-power">{t.buildPowerEffectLabel[pe] || pe}</span>)}
                    </div>
                  )}
                  {b.notes && <div className="effect">{b.notes}</div>}
                  {b.youtube_link && <a className="related-link" href={b.youtube_link} target="_blank" rel="noopener">▶ {t.buildWatchVideo}</a>}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <button type="button" className="recipe-btn" onClick={() => handleLike(b.id)} disabled={likedIds.includes(b.id)}>
                      {likedIds.includes(b.id) ? '❤' : '🤍'} {b.likes || 0}
                    </button>
                    <button type="button" className="recipe-btn" onClick={() => shareBuild(b.id)}>{copiedId === b.id ? t.buildLinkCopied : t.buildShare}</button>
                    <button type="button" className="recipe-btn" onClick={() => { setPrompt({ id: b.id, action: 'edit' }); setPromptError(''); }}>{t.buildEdit}</button>
                    <button type="button" className="recipe-btn" onClick={() => { setPrompt({ id: b.id, action: 'delete' }); setPromptError(''); }}>{t.buildDelete}</button>
                  </div>
                  {prompt && prompt.id === b.id && (
                    <PasswordPrompt
                      label={prompt.action === 'edit' ? t.buildPasswordPromptEdit : t.buildPasswordPromptDelete}
                      t={t}
                      error={promptError}
                      onConfirm={confirmPrompt}
                      onCancel={() => { setPrompt(null); setPromptError(''); }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function BuildAddForm({ items, characters, t, editing, onDone, onCancel }) {
  const isEdit = !!editing;
  const seedCombi = isEdit ? editing.build.combi : [];
  const seedEntry = slot => seedCombi.find(e => (e.slot || e.kind) === slot);
  const seedChar = (slot, kind) => {
    const e = seedEntry(slot);
    return e ? characters.find(c => c.kind === kind && c.name === e.name) || null : null;
  };

  const [purposes, setPurposes] = useState(() => (isEdit && editing.build.purposes) || []);
  const [episodes, setEpisodes] = useState(() => (isEdit && editing.build.episodes) || []);
  const [main, setMain] = useState(() => seedChar('main', 'cookie'));
  const [relay, setRelay] = useState(() => seedChar('relay', 'cookie'));
  const [pet, setPet] = useState(() => seedChar('pet', 'pet'));
  const [treasures, setTreasures] = useState(() =>
    seedCombi.filter(e => (e.slot || e.kind) === 'treasure')
      .map(e => {
        const it = items.find(x => x.name === e.name);
        return it ? { ...it, level: e.level || 0 } : null;
      })
      .filter(Boolean)
  );
  const [boosts, setBoosts] = useState(() => (isEdit && editing.build.boosts) || []);
  const [randomBoost, setRandomBoost] = useState(() => (isEdit && editing.build.random_boost) || null);
  const [showRandomBoostPicker, setShowRandomBoostPicker] = useState(false);
  const [powerEffects, setPowerEffects] = useState(() => (isEdit && editing.build.power_effects) || []);
  const [score, setScore] = useState(() => (isEdit && editing.build.score != null) ? String(editing.build.score) : '');
  const [coins, setCoins] = useState(() => (isEdit && editing.build.coins != null) ? String(editing.build.coins) : '');
  const [notes, setNotes] = useState(() => (isEdit && editing.build.notes) || '');
  const [youtube, setYoutube] = useState(() => (isEdit && editing.build.youtube_link) || '');
  const [password, setPassword] = useState('');
  const [picker, setPicker] = useState(null); // 'main' | 'relay' | 'pet' | 'treasure' | null
  const [status, setStatus] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  useEffect(() => {
    if (isEdit) return; // editing is password-gated, not bot-gated
    let widgetId;
    let cancelled = false;
    // Turnstile's script loads async (see index.html), so poll briefly for it.
    const start = setInterval(() => {
      if (cancelled || !window.turnstile || !turnstileRef.current) return;
      clearInterval(start);
      widgetId = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: token => setTurnstileToken(token),
      });
    }, 200);
    return () => {
      cancelled = true;
      clearInterval(start);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [isEdit]);

  function pickSlot(c) {
    if (picker === 'main') setMain(c);
    else if (picker === 'relay') setRelay(c);
    else if (picker === 'pet') setPet(c);
    else if (picker === 'treasure') setTreasures(ts => ts.length < 3 ? [...ts, { ...c, level: 0 }] : ts);
    setPicker(null);
  }

  function setTreasureLevel(i, level) {
    setTreasures(ts => ts.map((it, idx) => idx === i ? { ...it, level } : it));
  }

  const combi = useMemo(() => {
    const list = [];
    if (main) list.push({ slot: 'main', name: main.name });
    if (relay) list.push({ slot: 'relay', name: relay.name });
    if (pet) list.push({ slot: 'pet', name: pet.name });
    treasures.forEach(it => list.push({ slot: 'treasure', name: it.name, level: it.level || 0 }));
    return list;
  }, [main, relay, pet, treasures]);

  const canSubmit = !!main && !!pet && purposes.length > 0 && episodes.length > 0 && (isEdit ? true : !!turnstileToken && password.length >= 4);

  async function submit() {
    if (!canSubmit) return;
    setStatus(t.buildSubmitting);
    const fields = {
      purposes,
      episodes,
      combi,
      boosts,
      random_boost: randomBoost,
      power_effects: powerEffects,
      score: score === '' ? null : Number(score),
      coins: coins === '' ? null : Number(coins),
      notes: notes.trim() || null,
      youtube_link: youtube.trim() || null,
    };
    try {
      if (isEdit) {
        await editBuild(editing.build.id, editing.password, fields);
        setStatus(t.buildSaved);
      } else {
        await submitBuild(turnstileToken, { ...fields, password });
        setStatus(t.buildSubmitted);
      }
      setTimeout(onDone, 800);
    } catch {
      setStatus(t.buildSubmitError);
    }
  }

  function slotBox(slotKey, value, setValue) {
    const icon = value ? value.image : null;
    return (
      <div className="build-slot" key={slotKey}>
        <button type="button" className="build-slot-box" onClick={() => setPicker(slotKey)}>
          {icon && <img src={icon} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />}
        </button>
        <span className="build-slot-label">{t.buildSlot[slotKey]}</span>
        {value && <button type="button" className="build-slot-clear" onClick={() => setValue(null)}>{t.buildClear}</button>}
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'block', marginTop: '1rem' }}>
      <div className="grade-filter">
        {PURPOSES.map(p => (
          <button key={p} type="button" className={purposes.includes(p) ? 'active' : ''} onClick={() => toggleInList(purposes, setPurposes, p)}>{t.buildPurpose[p]}</button>
        ))}
      </div>
      <div className="grade-filter">
        {EPISODES.map(ep => (
          <button key={ep} type="button" className={episodes.includes(ep) ? 'active' : ''} onClick={() => toggleInList(episodes, setEpisodes, ep)}>{t.buildEpisode[ep]}</button>
        ))}
      </div>
      <div className="build-slots">
        {slotBox('main', main, setMain)}
        {slotBox('relay', relay, setRelay)}
        {slotBox('pet', pet, setPet)}
      </div>

      <label className="field">{t.buildTreasureSlot}</label>
      <button type="button" className="recipe-btn" onClick={() => treasures.length < 3 && setPicker('treasure')} disabled={treasures.length >= 3}>{t.buildAddTreasure}</button>
      <div className="combi-icons" style={{ marginTop: '0.5rem' }}>
        {treasures.map((it, i) => (
          <div className="treasure-chip" key={i}>
            <div className="combi-icon combi-icon-treasure" title={t.buildClear + ': ' + it.name} onClick={() => setTreasures(ts => ts.filter((_, idx) => idx !== i))} style={{ cursor: 'pointer' }}>
              {it.localImage && <img src={it.localImage} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />}
            </div>
            <select value={it.level || 0} onChange={e => setTreasureLevel(i, Number(e.target.value))}>
              {Array.from({ length: 10 }, (_, lvl) => <option key={lvl} value={lvl}>+{lvl}</option>)}
            </select>
          </div>
        ))}
      </div>

      <label className="field">{t.buildBoosts}</label>
      <div className="grade-filter">
        {BOOSTS.map(b => (
          <button key={b} type="button" className={boosts.includes(b) ? 'active' : ''} onClick={() => toggleInList(boosts, setBoosts, b)}>{t.buildBoostLabel[b]}</button>
        ))}
        <button type="button" className={randomBoost ? 'active' : ''} onClick={() => setShowRandomBoostPicker(s => !s)}>
          {randomBoost ? t.buildRandomBoostLabel[randomBoost] : t.buildRandomBoost}
        </button>
      </div>
      {showRandomBoostPicker && (
        <div className="grade-filter" style={{ marginTop: '0.4rem' }}>
          {RANDOM_BOOST_OPTIONS.map(rb => (
            <button
              key={rb}
              type="button"
              className={randomBoost === rb ? 'active' : ''}
              onClick={() => { setRandomBoost(randomBoost === rb ? null : rb); setShowRandomBoostPicker(false); }}
            >
              {t.buildRandomBoostLabel[rb]}
            </button>
          ))}
        </div>
      )}

      <label className="field">{t.buildPowerEffects}</label>
      <div className="power-effects-grid">
        {POWER_EFFECTS.map(p => {
          const ref = POWER_EFFECT_CHAR[p];
          const char = ref ? characters.find(c => c.kind === ref.kind && c.name === ref.name) : null;
          return (
            <button
              key={p}
              type="button"
              className={'power-effect-btn' + (powerEffects.includes(p) ? ' active' : '')}
              onClick={() => toggleInList(powerEffects, setPowerEffects, p)}
            >
              {char && <img src={char.image} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />}
              <span className="power-effect-name">{t.buildPowerEffectLabel[p]}</span>
              <span className="power-effect-desc">{t.buildPowerEffectDesc[p]}</span>
            </button>
          );
        })}
      </div>

      <div className="build-details-box">
        <div className="build-details-row">
          <label>
            <span className="field">{t.buildScore}</span>
            <input type="number" value={score} onChange={e => setScore(e.target.value)} />
          </label>
          <label>
            <span className="field">{t.buildCoins}</span>
            <input type="number" value={coins} onChange={e => setCoins(e.target.value)} />
          </label>
        </div>
        <label className="field">{t.buildNotes}</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} />
        <label className="field">{t.buildYoutube}</label>
        <input type="url" placeholder={t.buildYoutubePlaceholder} value={youtube} onChange={e => setYoutube(e.target.value)} />
      </div>

      {!isEdit && (
        <div className="build-password-box">
          <label className="field">{t.buildPassword}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <div ref={turnstileRef} style={{ marginTop: '0.6rem' }}></div>
        </div>
      )}
      <div className="nav">
        <button type="button" onClick={submit} disabled={!canSubmit}>{t.buildSubmit}</button>
        <button type="button" onClick={onCancel}>{t.buildBackBtn}</button>
        <span>{status}</span>
      </div>

      {picker && (
        <ItemPickerModal
          title={picker === 'treasure' ? t.buildTreasureSlot : t.buildSlot[picker]}
          kind={picker === 'pet' ? 'pet' : picker === 'treasure' ? 'treasure' : 'cookie'}
          items={items}
          characters={characters}
          t={t}
          onSelect={pickSlot}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

function DonateModal({ t, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal donate-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>&times;</button>
        <h2>{t.donateTitle}</h2>
        <p className="donate-bank">{t.donateBank}: 010-2-59224-9</p>
        <img className="donate-qr" src="donate-qr.jpg" alt="Donate QR code" />
      </div>
    </div>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showDonate, setShowDonate] = useState(false);
  const [version, setVersion] = useState('all');
  const [tier, setTier] = useState('all');
  const [lang, setLang] = useState('en');
  const [initialBuildId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('build');
    return id ? parseInt(id) : null;
  });
  const [page, setPage] = useState(() => (initialBuildId ? 'buildcreator' : 'home'));
  const isAdmin = !!localStorage.getItem('adminPassword');

  useEffect(() => {
    fetchAllTreasures().then(rows => {
      setItems(rows.map(row => ({
        id: row.id,
        name: row.name,
        grade: row.grade,
        section: row.category,
        effect: row.effect,
        effectTh: row.effect_th,
        extra: row.extra,
        localImage: row.image,
        type: row.type,
        baseItem: row.base_item_name,
        ingredients: row.ingredients,
        blessedEffect: row.blessed_effect,
        version: row.source,
        tier: row.tier,
      })));
    });
    fetchAllCharacters().then(setCharacters);
  }, []);

  const t = i18n[lang];
  const grades = useMemo(() => ['all', ...new Set(items.map(it => it.grade))], [items]);
  const evolvesIntoMap = useMemo(() => {
    const m = {};
    items.forEach(it => { if (it.baseItem) m[it.version + '|' + it.baseItem] = it.name; });
    return m;
  }, [items]);
  const imageByName = useMemo(() => {
    const m = {};
    items.forEach(it => { m[it.version + '|' + it.name] = it.localImage; });
    return m;
  }, [items]);
  const cookieImageMap = useMemo(
    () => new Map(characters.filter(c => c.kind === 'cookie').map(c => [c.name, c.image])),
    [characters]
  );
  // The Korean-sourced ability text names the combo-bonus pet as
  // "조합보너스: <이름> (...)" using the same Korean name stored in the pet's
  // own kr_name (both come from the same source pipeline), so match on that
  // rather than the separately machine-translated English text, which often
  // uses a different English rendering for the same pet.
  const comboPetByCookieName = useMemo(() => {
    const pets = characters.filter(c => c.kind === 'pet' && c.kr_name);
    const petByNormKr = new Map(pets.map(p => [p.kr_name.replace(/\s+/g, ''), p]));
    const map = new Map();
    characters.filter(c => c.kind === 'cookie' && c.ability).forEach(c => {
      const m = c.ability.match(/조합보너스\s*:\s*([^\r\n(]+)/);
      if (!m) return;
      const raw = m[1].trim();
      if (!raw || raw === '없음') return;
      const candidates = raw.split(/[,、]/).map(s => s.replace(/\s+/g, ''));
      for (const cand of candidates) {
        if (petByNormKr.has(cand)) { map.set(c.name, petByNormKr.get(cand)); return; }
      }
      const firstCand = candidates[0];
      for (const [normKr, pet] of petByNormKr) {
        if (normKr && firstCand && firstCand.includes(normKr)) { map.set(c.name, pet); return; }
      }
    });
    return map;
  }, [characters]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(it => {
      if (grade !== 'all' && it.grade !== grade) return false;
      if (typeFilter === 'evolved' && it.type !== 'evolved') return false;
      if (version !== 'all' && it.version !== version) return false;
      if (tier !== 'all' && it.tier !== tier) return false;
      if (!q) return true;
      const text = (it.name + ' ' + it.effect + ' ' + it.section + ' ' + (it.extra || '') + ' ' + (it.blessedEffect || '')).toLowerCase();
      return text.includes(q);
    });
  }, [items, query, grade, typeFilter, version, tier]);

  const PAGE_SIZE = 60;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, grade, typeFilter, version, tier]);
  const visibleItems = filtered.slice(0, visibleCount);

  function jumpTo(name) {
    setPage('treasure');
    setQuery(name);
    setGrade('all');
    setTypeFilter('all');
    setVersion('all');
    setTier('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const [charJump, setCharJump] = useState({ kind: 'cookie', query: '' });
  function jumpToCookie(name) {
    setPage('cookies');
    setCharJump({ kind: 'cookie', query: name });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function jumpToPet(name) {
    setPage('pets');
    setCharJump({ kind: 'pet', query: name });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <button type="button" className="donate-btn" onClick={() => setShowDonate(true)}>{t.donateBtn}</button>
      {showDonate && <DonateModal t={t} onClose={() => setShowDonate(false)} />}
      <div className="nav-bar">
        {page !== 'home' && (
          <>
            <button className={page === 'home' ? 'active' : ''} onClick={() => setPage('home')}>{t.navHome}</button>
            <button className={page === 'treasure' ? 'active' : ''} onClick={() => setPage('treasure')}>{t.navTreasure}</button>
            <button className={page === 'tierlist' ? 'active' : ''} onClick={() => setPage('tierlist')}>{t.navTierlist}</button>
            <button className={page === 'cookies' ? 'active' : ''} onClick={() => setPage('cookies')}>{t.navCookies}</button>
            <button className={page === 'pets' ? 'active' : ''} onClick={() => setPage('pets')}>{t.navPets}</button>
            <button className={page === 'buildcreator' ? 'active' : ''} onClick={() => setPage('buildcreator')}>{t.navBuilds}</button>
          </>
        )}
        <div className="lang-toggle">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>TH</button>
        </div>
      </div>
      {page === 'home' && <HomePage t={t} onNavigate={setPage} />}
      {page === 'treasure' && (
        <>
          <h1>{t.title}</h1>
          <div className="toolbar">
            <input id="search" type="text" placeholder={t.placeholder} value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <div className="grade-filter">
            <button className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>{t.all}</button>
            <button className={typeFilter === 'evolved' ? 'active' : ''} onClick={() => setTypeFilter('evolved')}>{t.evolution}</button>
          </div>
          <div className="grade-filter">
            <button className={version === 'all' ? 'active' : ''} onClick={() => setVersion('all')}>{t.versionAll}</button>
            <button className={version === 'line' ? 'active' : ''} onClick={() => setVersion('line')}>{t.versionLine}</button>
            <button className={version === 'kr' ? 'active' : ''} onClick={() => setVersion('kr')}>{t.versionKr}</button>
          </div>
          <div className="grade-filter">
            {grades.map(g => (
              <button key={g} className={grade === g ? 'active' : ''} onClick={() => setGrade(g)}>
                {g === 'all' ? t.all : g + '-grade'}
              </button>
            ))}
          </div>
          <div className="grade-filter">
            <button className={tier === 'all' ? 'active' : ''} onClick={() => setTier('all')}>{t.all}</button>
            {TIERS.map(tr => (
              <button key={tr} className={tier === tr ? 'active' : ''} onClick={() => setTier(tr)}>{tr}</button>
            ))}
          </div>
          <div id="count">{t.count(filtered.length)}</div>
          <div id="list">
            {visibleItems.map((it, i) => (
              <Card key={it.version + it.name + i} item={it} query={query.trim().toLowerCase()} t={t} lang={lang} evolvesTo={evolvesIntoMap[it.version + '|' + it.name]} imageByName={imageByName} onJump={jumpTo} isAdmin={isAdmin} cookieImageMap={cookieImageMap} onJumpToCookie={jumpToCookie} />
            ))}
          </div>
          {visibleCount < filtered.length && (
            <button className="load-more" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>{t.loadMore}</button>
          )}
        </>
      )}
      {page === 'tierlist' && <TierListPage items={items} t={t} onSelect={jumpTo} />}
      {page === 'cookies' && <><h1>{t.navCookies}</h1><CharacterListPage key={charJump.kind === 'cookie' ? charJump.query : ''} characters={characters} kind="cookie" t={t} initialQuery={charJump.kind === 'cookie' ? charJump.query : ''} treasures={items} onJumpToTreasure={jumpTo} comboPetByCookieName={comboPetByCookieName} onJumpToPet={jumpToPet} /></>}
      {page === 'pets' && <><h1>{t.navPets}</h1><CharacterListPage key={charJump.kind === 'pet' ? charJump.query : ''} characters={characters} kind="pet" t={t} initialQuery={charJump.kind === 'pet' ? charJump.query : ''} /></>}
      {page === 'buildcreator' && <><h1>{t.navBuilds}</h1><BuildCreatorPage items={items} characters={characters} t={t} initialBuildId={initialBuildId} /></>}
    </>
  );
}
