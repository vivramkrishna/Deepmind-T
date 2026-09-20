import express from 'express';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { calculate } from '../src/math.js';

const root = fileURLToPath(new URL('../', import.meta.url));
dotenv.config({ path: root + '.env', quiet: true });
const configured = value => Boolean(value && !value.startsWith('replace_'));
let agentId = process.env.ELEVENLABS_AGENT_ID;
if (!configured(agentId)) { try { agentId = readFileSync(root + '.agent-id', 'utf8').trim(); } catch {} }
const ready = configured(process.env.ELEVENLABS_API_KEY) && configured(agentId);
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  if (!['localhost', '127.0.0.1'].includes(req.hostname)) return res.status(403).json({ error: 'Local access only.' });
  if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (origin && origin !== `http://${req.get('host')}`) return res.status(403).json({ error: 'Origin not allowed.' });
    if (req.get('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Cross-site request blocked.' });
  }
  next();
});
app.use(express.json({ limit: '4kb' }));
app.get('/api/config', (req, res) => res.json({ voiceReady: ready }));
app.post('/api/calculate', (req, res) => {
  try { res.json(calculate(req.body?.question)); } catch (error) { res.status(400).json({ error: error.message }); }
});
let lastSession = 0;
app.post('/api/session', async (req, res) => {
  if (!ready) return res.status(503).json({ error: 'Add your ElevenLabs credentials to .env and restart the app.' });
  if (Date.now() - lastSession < 3000) return res.status(429).json({ error: 'Wait a few seconds before starting another call.' });
  lastSession = Date.now();
  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(15000)
    });
    if (!upstream.ok) return res.status(502).json({ error: `ElevenLabs returned ${upstream.status}. Check your key, agent ID, and account access.` });
    const data = await upstream.json();
    if (!data.signed_url) throw new Error('Missing signed URL');
    res.json({ signedUrl: data.signed_url });
  } catch { res.status(502).json({ error: 'Could not connect to ElevenLabs. Please try again.' }); }
});
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API route.' }));
if (process.argv.includes('--production')) app.use(express.static(root + 'dist'));
else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
app.use((error, req, res, next) => res.status(400).json({ error: 'Invalid request.' }));
app.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`Voice Math: http://localhost:${process.env.PORT || 3000} (${ready ? 'ElevenLabs ready' : 'demo mode'})`));
