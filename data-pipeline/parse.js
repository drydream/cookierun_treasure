const fs = require('fs');
const path = require('path');

function extractImage(s) {
  const m = s.match(/\[\[File:\s*([^|\]]+)/i);
  return m ? m[1].trim() : '';
}

function clean(s) {
  return s
    .replace(/\{\{det\|([^|}]+)\|[^}]*\}\}/g, '$1')
    .replace(/\[\[File:[^\]]*\]\]/g, '')
    .replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/'''/g, '')
    .replace(/\{\{Star\}\}/g, '')
    .trim();
}

function parseGrade(text, grade) {
  const items = [];
  const tableRe = /\{\|[\s\S]*?\n\|\}/g;
  const lines = text.split('\n');
  let currentSub = '';
  let buf = '';
  const sections = [];
  for (const line of lines) {
    if (/^===/.test(line)) {
      if (buf) sections.push([currentSub, buf]);
      currentSub = line.replace(/=/g, '').trim();
      buf = '';
    } else if (/^==[^=]/.test(line)) {
      if (buf) sections.push([currentSub, buf]);
      currentSub = line.replace(/=/g, '').trim();
      buf = '';
    } else {
      buf += line + '\n';
    }
  }
  if (buf) sections.push([currentSub, buf]);

  for (const [sub, content] of sections) {
    const tables = content.match(tableRe) || [];
    for (const table of tables) {
      const rowLines = table.split('\n');
      let header = [];
      let rows = [];
      let curRow = [];
      let inHeader = true;
      let curCell = null;
      for (const l of rowLines) {
        if (l.startsWith('! ')) {
          header.push(clean(l.replace(/^!\s*(scope="col"\s*\|)?/, '')));
        } else if (l.trim() === '|-') {
          if (curCell !== null) curRow.push(curCell);
          if (curRow.length) rows.push(curRow);
          curRow = [];
          curCell = null;
          inHeader = false;
        } else if (l.trim() === '|}') {
          if (curCell !== null) curRow.push(curCell);
          if (curRow.length) rows.push(curRow);
          curRow = [];
          curCell = null;
        } else if (/^\|(?!\})/.test(l) && !l.trim().startsWith('|-')) {
          // new cell, possibly with rowspan attr before final |
          let cellStart = l;
          // handle "| rowspan=... |value" on same line -> take part after last '|'
          const m = cellStart.match(/^\|(?:\s*[a-zA-Z]+="[^"]*"\s*)*\|?(.*)$/);
          if (curCell !== null) curRow.push(curCell);
          curCell = (m ? m[1] : cellStart.slice(1));
        } else {
          // continuation line (bullet or wrapped text) belongs to current cell
          if (curCell !== null) {
            curCell += '\n' + l;
          }
        }
      }
      if (!header.length) continue;
      const rowGrade = grade || ((sub.match(/^([SABC])-grade/i) || [])[1] || '').toUpperCase();
      const blessedIdx = header.findIndex(h => /blessed/i.test(h));
      for (const row of rows) {
        if (row.length < 3) continue;
        const nameRaw = row[0];
        const effectIdx = header.findIndex(h => /effect/i.test(h) && !/blessed/i.test(h));
        const effectRaw = effectIdx >= 0 && row[effectIdx] !== undefined ? row[effectIdx] : (row[2] || '');
        const name = clean(nameRaw);
        if (!name) continue;
        const image = extractImage(row[1] || '');
        const effect = clean(effectRaw).replace(/^\*/gm, '- ').trim();
        const extraCols = [];
        for (let i = 3; i < row.length; i++) {
          if (i === blessedIdx) continue;
          const val = clean(row[i]);
          if (val) extraCols.push(val);
        }
        const item = {
          name,
          grade: rowGrade,
          section: clean(sub),
          effect,
          extra: extraCols.join(' | '),
          image,
          type: grade ? 'base' : 'evolved'
        };
        if (blessedIdx >= 0 && row[blessedIdx] !== undefined) {
          item.blessedEffect = clean(row[blessedIdx]).replace(/^\*/gm, '- ').trim();
        }
        items.push(item);
      }
    }
  }
  return items;
}

const gradeFiles = [
  ['S', 's-grade.txt'],
  ['A', 'a-grade.txt'],
  ['B', 'b-grade.txt'],
  ['C', 'c-grade.txt'],
];

let all = [];
for (const [grade, file] of gradeFiles) {
  const text = fs.readFileSync(path.join(__dirname, 'raw', file), 'utf8');
  all = all.concat(parseGrade(text, grade));
}

const evolveText = fs.readFileSync(path.join(__dirname, 'raw', 'evolve-treasures.txt'), 'utf8');
all = all.concat(parseGrade(evolveText, null));

fs.writeFileSync(path.join(__dirname, 'treasures.json'), JSON.stringify(all, null, 1));
console.log('total items:', all.length);
