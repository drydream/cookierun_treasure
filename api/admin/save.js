// Vercel serverless function: saves an admin edit by committing directly to
// GitHub (main), which triggers a normal Vercel redeploy.
// Requires env vars: GITHUB_TOKEN (repo contents read/write), ADMIN_PASSWORD.
const OWNER = 'drydream';
const REPO = 'cookierun_treasure';
const BRANCH = 'main';

const FILES = {
  kr: 'public/treasures-kr.json',
  line: 'public/treasures.json',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password, source, id, originalName, name, englishName, abilityEn, effect } = req.body;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Wrong password' });
    return;
  }
  const filePath = FILES[source];
  if (!filePath) {
    res.status(400).json({ error: 'Unknown source' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
  };

  try {
    const getRes = await fetch(`${apiUrl}?ref=${BRANCH}`, { headers });
    if (!getRes.ok) throw new Error('GitHub read failed: ' + getRes.status);
    const getData = await getRes.json();
    const content = Buffer.from(getData.content, 'base64').toString('utf8');
    const items = JSON.parse(content);

    let item, commitLabel;
    if (source === 'kr') {
      if (typeof id !== 'number') {
        res.status(400).json({ error: 'Missing id' });
        return;
      }
      item = items.find(it => it.id === id);
      if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
      if (englishName) item.englishName = englishName;
      item.abilityEn = abilityEn;
      commitLabel = `${item.englishName} (kr id ${id})`;
    } else {
      if (!originalName) {
        res.status(400).json({ error: 'Missing originalName' });
        return;
      }
      item = items.find(it => it.name === originalName);
      if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
      if (name) item.name = name;
      item.effect = effect;
      commitLabel = `${item.name} (line)`;
    }

    const newContent = Buffer.from(JSON.stringify(items, null, 1)).toString('base64');
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Admin edit: ${commitLabel}`,
        content: newContent,
        sha: getData.sha,
        branch: BRANCH,
      }),
    });
    if (!putRes.ok) {
      const err = await putRes.text();
      throw new Error('GitHub write failed: ' + putRes.status + ' ' + err);
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
