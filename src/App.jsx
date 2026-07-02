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

function VariantBlock({ v, query, t, evolvesTo, imageByName }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="variant">
      <span className="grade">{v.grade}-grade</span>
      <span className="version-tag">{v.version === 'kr' ? t.versionKr : t.versionLine}</span>
      {v.type === 'evolved' && <span className="evolved-tag">{t.evolved}</span>}
      {v.effect ? (
        <div className="effect">{highlight(v.effect, query)}</div>
      ) : (
        <div className="effect muted">{t.noAbility}</div>
      )}
      {v.blessedEffect && (
        <div className="blessed"><span className="blessed-label">{t.blessed}</span> {highlight(v.blessedEffect, query)}</div>
      )}
      <div className="meta">{v.section}{v.extra ? ' — ' + v.extra : ''}</div>
      {evolvesTo && (
        <div className="evolves-to">
          <span className="label">{t.evolvesTo}</span>{' '}
          <RelatedItem name={evolvesTo} image={imageByName[v.version + '|' + evolvesTo]} versioned={v.version} />
        </div>
      )}
      {v.baseItem && (
        <>
          <button type="button" className="recipe-btn" onClick={() => setOpen(o => !o)}>{t.recipeBtn}</button>
          <div className={'recipe' + (open ? ' open' : '')}>
            <div className="row">
              <span className="label">{t.evolvedFrom}</span>{' '}
              <RelatedItem name={v.baseItem} image={imageByName[v.version + '|' + v.baseItem]} versioned={v.version} />
            </div>
            {v.ingredients && (
              <div className="row">
                <span className="label">{t.ingredients}</span>{' '}
                {v.ingredients.map((ing, i) => (
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
  );
}

function Card({ item, variants, query, t, evolvesIntoMap, imageByName }) {
  return (
    <div className="card">
      <img src={item.localImage} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />
      <div className="body">
        <span className="name">{highlight(item.name, query)}</span>
        {variants.map(v => (
          <VariantBlock
            key={v.version}
            v={v}
            query={query}
            t={t}
            evolvesTo={evolvesIntoMap[v.version + '|' + item.name]}
            imageByName={imageByName}
          />
        ))}
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
      const lineTagged = lineItems.map(it => ({ ...it, version: 'line' }));
      const lineNames = new Set(lineTagged.map(it => it.name));

      // Where a name exists in both LINE and Kakao/Global, keep only the LINE
      // record — one database entry per treasure instead of showing both.
      const krItemsUnique = krItems.filter(it => !lineNames.has(it.name));

      const merged = [...lineTagged, ...krItemsUnique].map(v => ({
        name: v.name,
        localImage: v.localImage,
        variants: [v],
      }));
      setItems(merged);
    });
  }, []);

  const t = i18n[lang];
  const grades = useMemo(() => ['all', ...new Set(items.flatMap(it => it.variants.map(v => v.grade)))], [items]);
  const evolvesIntoMap = useMemo(() => {
    const m = {};
    items.forEach(it => it.variants.forEach(v => { if (v.baseItem) m[v.version + '|' + v.baseItem] = it.name; }));
    return m;
  }, [items]);
  const imageByName = useMemo(() => {
    const m = {};
    items.forEach(it => it.variants.forEach(v => { m[v.version + '|' + it.name] = v.localImage || it.localImage; }));
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .map(it => {
        const variants = version === 'all' ? it.variants : it.variants.filter(v => v.version === version);
        return { ...it, variants };
      })
      .filter(it => {
        if (!it.variants.length) return false;
        if (grade !== 'all' && !it.variants.some(v => v.grade === grade)) return false;
        if (typeFilter === 'evolved' && !it.variants.some(v => v.type === 'evolved')) return false;
        if (!q) return true;
        const text = (it.name + ' ' + it.variants.map(v => v.effect + ' ' + v.section + ' ' + v.extra + ' ' + (v.blessedEffect || '')).join(' ')).toLowerCase();
        return text.includes(q);
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
          <Card key={it.name + i} item={it} variants={it.variants} query={query.trim().toLowerCase()} t={t} evolvesIntoMap={evolvesIntoMap} imageByName={imageByName} />
        ))}
      </div>
      {visibleCount < filtered.length && (
        <button className="load-more" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}>{t.loadMore}</button>
      )}
    </>
  );
}
