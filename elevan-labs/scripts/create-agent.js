import dotenv from 'dotenv';
import { readFile, writeFile } from 'node:fs/promises';
dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
const key = process.env.ELEVENLABS_API_KEY;
if (!key || key.startsWith('replace_')) throw new Error('Set ELEVENLABS_API_KEY in .env first.');
const savedFile = new URL('../.agent-id', import.meta.url);
let saved;
try { saved = (await readFile(savedFile, 'utf8')).trim(); } catch {}
if (saved || (process.env.ELEVENLABS_AGENT_ID && !process.env.ELEVENLABS_AGENT_ID.startsWith('replace_'))) {
  console.log('An agent is already configured. No duplicate created.');
  process.exit(0);
}
const config = JSON.parse(await readFile(new URL('../agent.config.json', import.meta.url), 'utf8'));
const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'xi-api-key': key },
  body: JSON.stringify(config), signal: AbortSignal.timeout(30000)
});
if (!response.ok) throw new Error(`Agent creation failed (${response.status}). Check key permissions and agent.config.json. No automatic retry was made.`);
const result = await response.json();
if (!result.agent_id) throw new Error('No agent ID returned. Check the ElevenLabs dashboard before retrying.');
await writeFile(savedFile, result.agent_id + '\n', { mode: 0o600 });
console.log(`Agent created and saved: ${result.agent_id}. Restart npm run dev to enable voice.`);
