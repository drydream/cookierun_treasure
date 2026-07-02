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
    buildShare: 'Share to Facebook',
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
    buildShare: 'แชร์ไป Facebook',
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
  return `${window.location.origin}${window.location.pathname}?build=${id}`;
}

// Open to the public (no admin password), but gated by a Cloudflare
// Turnstile bot check verified server-side in /api/submit-build.
async function submitBuild(purpose, episode, combi, turnstileToken) {
  const res = await fetch('/api/submit-build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose, episode, combi, turnstileToken }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
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

function Card({ item, query, t, evolvesTo, imageByName, onJump, isAdmin }) {
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
        {item.effect ? (
          <div className="effect">{highlight(item.effect, query)}</div>
        ) : (
          <div className="effect muted">{t.noAbility}</div>
        )}
        {item.blessedEffect && (
          <div className="blessed"><span className="blessed-label">{t.blessed}</span> {highlight(item.blessedEffect, query)}</div>
        )}
        <div className="meta">{item.section}{item.extra ? ' — ' + item.extra : ''}</div>
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

function CharacterListPage({ characters, kind, t }) {
  const [query, setQuery] = useState('');
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
            {filtered.map(c => (
              <div className="card" key={c.id}>
                {c.image && <img src={c.image} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />}
                <div className="body">
                  <span className="name">{c.name}</span>
                  {c.grade && <span className="grade">{c.grade}-grade</span>}
                  {(c.ability_en || c.ability) && <div className="effect">{c.ability_en || c.ability}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function resolveCombiIcon(entry, items, characters) {
  if (entry.kind === 'treasure') {
    const it = items.find(x => x.name === entry.name);
    return it ? it.localImage : null;
  }
  const c = characters.find(x => x.kind === entry.kind && x.name === entry.name);
  return c ? c.image : null;
}

function BuildCreatorPage({ items, characters, t, initialBuildId }) {
  const [view, setView] = useState('browse');
  const [purpose, setPurpose] = useState('score');
  const [episode, setEpisode] = useState('ep1');
  const [builds, setBuilds] = useState([]);
  const [highlightId, setHighlightId] = useState(initialBuildId || null);

  useEffect(() => {
    fetchAllBuilds().then(setBuilds);
  }, []);

  useEffect(() => {
    if (!initialBuildId) return;
    fetchBuildById(initialBuildId).then(b => {
      if (b) { setPurpose(b.purpose); setEpisode(b.episode); }
    });
  }, [initialBuildId]);

  const filtered = useMemo(
    () => builds.filter(b => b.purpose === purpose && b.episode === episode),
    [builds, purpose, episode]
  );

  function backToBrowse() {
    setView('browse');
    fetchAllBuilds().then(setBuilds);
  }

  function shareBuild(id) {
    setHighlightId(null);
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareBuildUrl(id)), '_blank', 'noopener');
  }

  return (
    <>
      <div className="grade-filter">
        {PURPOSES.map(p => (
          <button key={p} className={purpose === p ? 'active' : ''} onClick={() => setPurpose(p)}>{t.buildPurpose[p]}</button>
        ))}
      </div>
      <div className="grade-filter">
        {EPISODES.map(ep => (
          <button key={ep} className={episode === ep ? 'active' : ''} onClick={() => setEpisode(ep)}>{t.buildEpisode[ep]}</button>
        ))}
      </div>
      {view === 'add' ? (
        <BuildAddForm items={items} characters={characters} t={t} purpose={purpose} episode={episode} onDone={backToBrowse} onCancel={() => setView('browse')} />
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
                        <div className={'combi-icon combi-icon-' + entry.kind} key={i} title={entry.name}>
                          {icon && <img src={icon} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />}
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" className="recipe-btn" style={{ marginTop: '0.5rem' }} onClick={() => shareBuild(b.id)}>{t.buildShare}</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function BuildAddForm({ items, characters, t, purpose, episode, onDone, onCancel }) {
  const [kind, setKind] = useState('cookie');
  const [name, setName] = useState('');
  const [combi, setCombi] = useState([]);
  const [status, setStatus] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  useEffect(() => {
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
  }, []);

  const candidateNames = useMemo(() => {
    if (kind === 'treasure') return [...new Set(items.map(it => it.name))];
    return characters.filter(c => c.kind === kind).map(c => c.name);
  }, [kind, items, characters]);

  function addToCombi() {
    const n = name.trim();
    if (!n || !candidateNames.includes(n)) return;
    setCombi(c => [...c, { kind, name: n }]);
    setName('');
  }

  function removeFromCombi(i) {
    setCombi(c => c.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (combi.length === 0 || !turnstileToken) return;
    setStatus(t.buildSubmitting);
    try {
      await submitBuild(purpose, episode, combi, turnstileToken);
      setStatus(t.buildSubmitted);
      setTimeout(onDone, 800);
    } catch {
      setStatus(t.buildSubmitError);
    }
  }

  return (
    <div className="card" style={{ display: 'block', marginTop: '1rem' }}>
      <div className="grade-filter">
        {['cookie', 'pet', 'treasure'].map(k => (
          <button key={k} className={kind === k ? 'active' : ''} onClick={() => setKind(k)}>{t.buildKind[k]}</button>
        ))}
      </div>
      <div className="toolbar">
        <input list="buildCandidates" placeholder={t.buildSearchPlaceholder} value={name} onChange={e => setName(e.target.value)} />
        <datalist id="buildCandidates">
          {candidateNames.map(n => <option value={n} key={n} />)}
        </datalist>
        <button type="button" className="recipe-btn" onClick={addToCombi}>{t.buildAddItem}</button>
      </div>
      <div className="combi-icons" style={{ marginTop: '0.6rem' }}>
        {combi.length === 0 && <span className="tier-empty">{t.buildCombiEmpty}</span>}
        {combi.map((entry, i) => {
          const icon = resolveCombiIcon(entry, items, characters);
          return (
            <div className={'combi-icon combi-icon-' + entry.kind} key={i} title={entry.name} onClick={() => removeFromCombi(i)} style={{ cursor: 'pointer' }}>
              {icon && <img src={icon} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />}
            </div>
          );
        })}
      </div>
      <div ref={turnstileRef} style={{ marginTop: '0.6rem' }}></div>
      <div className="nav">
        <button type="button" onClick={submit} disabled={combi.length === 0 || !turnstileToken}>{t.buildSubmit}</button>
        <button type="button" onClick={onCancel}>{t.buildBackBtn}</button>
        <span>{status}</span>
      </div>
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
              <Card key={it.version + it.name + i} item={it} query={query.trim().toLowerCase()} t={t} evolvesTo={evolvesIntoMap[it.version + '|' + it.name]} imageByName={imageByName} onJump={jumpTo} isAdmin={isAdmin} />
            ))}
          </div>
          {visibleCount < filtered.length && (
            <button className="load-more" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>{t.loadMore}</button>
          )}
        </>
      )}
      {page === 'tierlist' && <TierListPage items={items} t={t} onSelect={jumpTo} />}
      {page === 'cookies' && <><h1>{t.navCookies}</h1><CharacterListPage characters={characters} kind="cookie" t={t} /></>}
      {page === 'pets' && <><h1>{t.navPets}</h1><CharacterListPage characters={characters} kind="pet" t={t} /></>}
      {page === 'buildcreator' && <><h1>{t.navBuilds}</h1><BuildCreatorPage items={items} characters={characters} t={t} initialBuildId={initialBuildId} /></>}
    </>
  );
}
