import { useEffect, useMemo, useState } from 'react';

const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZGhzbnlubGx6b2l0Ym9sbmdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NTk3MDYsImV4cCI6MjA5ODUzNTcwNn0.yBoBJ3R_AHpjNQG1ikIwfXFOLfWQWSiwZgLaP8m-hxI';

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
    tierEmpty: 'No treasures ranked yet',
    tierFormBase: 'Base form',
    tierFormEvolved: 'Evolved form',
    editBtn: '✎ Edit',
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
    tierEmpty: 'ยังไม่มีการจัดอันดับ',
    tierFormBase: 'ก่อนวิวัฒนาการ',
    tierFormEvolved: 'หลังวิวัฒนาการ',
    editBtn: '✎ แก้ไข',
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
      </div>
    </div>
  );
}

function TierListPage({ items, t, onSelect, isAdmin }) {
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
                    <div className="tier-item" key={it.version + it.name + i}>
                      <button
                        type="button"
                        className="tier-item-btn"
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
                      {isAdmin && <a className="admin-edit-link tier-edit-link" href={`admin.html?edit=${display.id}`} target="_blank" rel="noopener">{t.editBtn}</a>}
                    </div>
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
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showDonate, setShowDonate] = useState(false);
  const [version, setVersion] = useState('all');
  const [tier, setTier] = useState('all');
  const [lang, setLang] = useState('en');
  const [page, setPage] = useState('home');
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
      {page === 'tierlist' && <TierListPage items={items} t={t} onSelect={jumpTo} isAdmin={isAdmin} />}
    </>
  );
}
