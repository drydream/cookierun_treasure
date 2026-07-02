// Vercel serverless function: uploads an image to Supabase Storage and
// returns its public URL, for use as a treasure's image path.
// Requires env vars: service_role, ADMIN_PASSWORD.
const SUPABASE_URL = 'https://mcdhsnynllzoitbolngd.supabase.co';
const BUCKET = 'treasure-images';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { password, filename, contentType, dataBase64 } = req.body;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Wrong password' });
    return;
  }
  if (!filename || !dataBase64) {
    res.status(400).json({ error: 'Missing filename or image data' });
    return;
  }

  const serviceKey = process.env.service_role;
  const safeName = filename.toLowerCase().replace(/[^a-z0-9.]+/g, '-');
  const path = `${Date.now()}-${safeName}`;
  const buffer = Buffer.from(dataBase64, 'base64');

  try {
    // Make sure the bucket exists; ignore the error if it already does.
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    });

    const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': contentType || 'application/octet-stream',
      },
      body: buffer,
    });
    if (!upRes.ok) {
      const err = await upRes.text();
      throw new Error('Supabase storage upload failed: ' + upRes.status + ' ' + err);
    }

    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    res.status(200).json({ ok: true, url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
