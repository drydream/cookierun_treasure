import { useEffect, useMemo, useState } from 'react';

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
  },
};

function wikiUrl(name) {
  return 'https://cookierun.fandom.com/wiki/' + encodeURIComponent(name.replace(/ /g, '_'));
}

function highlight(text, q) {
  if (!q) return text;
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
  return text.split(re).map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? <mark key={i}>{part}</mark> : part
  );
}

function RelatedItem({ name, image, versioned }) {
  const content = (
    <>
      {image && <img className="inline-icon" src={image} alt="" loading="lazy" />}
      {name}
    </>
  );
  return versioned === 'line'
    ? <a href={wikiUrl(name)} target="_blank" rel="noopener">{content}</a>
    : <span>{content}</span>;
}

function Card({ item, query, t, evolvesTo, imageByName }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <img src={item.localImage} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />
      <div className="body">
        <span className="name">{highlight(item.name, query)}</span>
        <span className="grade">{item.grade}-grade</span>
        <span className="version-tag">{item.version === 'kr' ? t.versionKr : t.versionLine}</span>
        {item.type === 'evolved' && <span className="evolved-tag">{t.evolved}</span>}
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
            <RelatedItem name={evolvesTo} image={imageByName[item.version + '|' + evolvesTo]} versioned={item.version} />
          </div>
        )}
        {item.baseItem && (
          <>
            <button type="button" className="recipe-btn" onClick={() => setOpen(o => !o)}>{t.recipeBtn}</button>
            <div className={'recipe' + (open ? ' open' : '')}>
              <div className="row">
                <span className="label">{t.evolvedFrom}</span>{' '}
                <RelatedItem name={item.baseItem} image={imageByName[item.version + '|' + item.baseItem]} versioned={item.version} />
              </div>
              {item.ingredients && (
                <div className="row">
                  <span className="label">{t.ingredients}</span>{' '}
                  {item.ingredients.map((ing, i) => (
                    <span key={ing.name}>
                      {i > 0 && ', '}
                      <a href={wikiUrl(ing.name)} target="_blank" rel="noopener">{ing.name}</a>
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

export default function App() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [grade, setGrade] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [version, setVersion] = useState('all');
  const [lang, setLang] = useState('en');

  useEffect(() => {
    Promise.all([
      fetch('treasures.json').then(r => r.json()),
      fetch('treasures-kr.json').then(r => r.json()),
    ]).then(([lineItems, krRaw]) => {
      const idToName = {};
      krRaw.forEach(it => { idToName[it.id] = it.englishName; });
      const krItems = krRaw.map(it => ({
        name: it.englishName,
        grade: it.grade,
        section: it.category,
        effect: it.abilityEn,
        extra: '',
        localImage: it.localImage || '',
        type: it.evolvedFromId ? 'evolved' : 'base',
        baseItem: it.evolvedFromId ? idToName[it.evolvedFromId] : undefined,
        version: 'kr',
      }));
      setItems([...lineItems.map(it => ({ ...it, version: 'line' })), ...krItems]);
    });
  }, []);

  const t = i18n[lang];
  const grades = useMemo(() => ['all', ...new Set(items.map(d => d.grade))], [items]);
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
      if (!q) return true;
      return (it.name + ' ' + it.effect + ' ' + it.section + ' ' + it.extra + ' ' + (it.blessedEffect || '')).toLowerCase().includes(q);
    });
  }, [items, query, grade, typeFilter, version]);

  const PAGE_SIZE = 60;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, grade, typeFilter, version]);
  const visibleItems = filtered.slice(0, visibleCount);

  return (
    <>
      <h1>{t.title}</h1>
      <div className="toolbar">
        <input id="search" type="text" placeholder={t.placeholder} value={query} onChange={e => setQuery(e.target.value)} />
        <div className="lang-toggle">
          <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'th' ? 'active' : ''} onClick={() => setLang('th')}>TH</button>
        </div>
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
      <div id="count">{t.count(filtered.length)}</div>
      <div id="list">
        {visibleItems.map((it, i) => (
          <Card key={it.version + it.name + i} item={it} query={query.trim().toLowerCase()} t={t} evolvesTo={evolvesIntoMap[it.version + '|' + it.name]} imageByName={imageByName} />
        ))}
      </div>
      {visibleCount < filtered.length && (
        <button className="load-more" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>{t.loadMore}</button>
      )}
    </>
  );
}
