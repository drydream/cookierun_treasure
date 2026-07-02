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

function Card({ item, query, t, evolvesTo, imageByName }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <img src={item.localImage} alt="" loading="lazy" onError={e => { e.target.style.visibility = 'hidden'; }} />
      <div className="body">
        <span className="name">{highlight(item.name, query)}</span>
        <span className="grade">{item.grade}-grade</span>
        {item.type === 'evolved' && <span className="evolved-tag">{t.evolved}</span>}
        <div className="effect">{highlight(item.effect, query)}</div>
        {item.blessedEffect && (
          <div className="blessed"><span className="blessed-label">{t.blessed}</span> {highlight(item.blessedEffect, query)}</div>
        )}
        <div className="meta">{item.section}{item.extra ? ' — ' + item.extra : ''}</div>
        {evolvesTo && (
          <div className="evolves-to">
            <span className="label">{t.evolvesTo}</span>{' '}
            <a href={wikiUrl(evolvesTo)} target="_blank" rel="noopener">
              {imageByName[evolvesTo] && <img className="inline-icon" src={imageByName[evolvesTo]} alt="" loading="lazy" />}
              {evolvesTo}
            </a>
          </div>
        )}
        {item.baseItem && (
          <>
            <button type="button" className="recipe-btn" onClick={() => setOpen(o => !o)}>{t.recipeBtn}</button>
            <div className={'recipe' + (open ? ' open' : '')}>
              <div className="row">
                <span className="label">{t.evolvedFrom}</span>{' '}
                <a href={wikiUrl(item.baseItem)} target="_blank" rel="noopener">
                  {imageByName[item.baseItem] && <img className="inline-icon" src={imageByName[item.baseItem]} alt="" loading="lazy" />}
                  {item.baseItem}
                </a>
              </div>
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
  const [lang, setLang] = useState('en');

  useEffect(() => {
    fetch('treasures.json').then(r => r.json()).then(setItems);
  }, []);

  const t = i18n[lang];
  const grades = useMemo(() => ['all', ...new Set(items.map(d => d.grade))], [items]);
  const evolvesIntoMap = useMemo(() => {
    const m = {};
    items.forEach(it => { if (it.baseItem) m[it.baseItem] = it.name; });
    return m;
  }, [items]);
  const imageByName = useMemo(() => {
    const m = {};
    items.forEach(it => { m[it.name] = it.localImage; });
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(it => {
      if (grade !== 'all' && it.grade !== grade) return false;
      if (typeFilter === 'evolved' && it.type !== 'evolved') return false;
      if (!q) return true;
      return (it.name + ' ' + it.effect + ' ' + it.section + ' ' + it.extra + ' ' + (it.blessedEffect || '')).toLowerCase().includes(q);
    });
  }, [items, query, grade, typeFilter]);

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
        {grades.map(g => (
          <button key={g} className={grade === g ? 'active' : ''} onClick={() => setGrade(g)}>
            {g === 'all' ? t.all : g + '-grade'}
          </button>
        ))}
      </div>
      <div id="count">{t.count(filtered.length)}</div>
      <div id="list">
        {filtered.map((it, i) => (
          <Card key={it.name + i} item={it} query={query.trim().toLowerCase()} t={t} evolvesTo={evolvesIntoMap[it.name]} imageByName={imageByName} />
        ))}
      </div>
    </>
  );
}
