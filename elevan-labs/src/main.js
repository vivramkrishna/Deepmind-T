import { Conversation } from '@elevenlabs/client';
import './style.css';
const $ = selector => document.querySelector(selector);
let conversation = null, busy = false, muted = false;
function message(role, text) {
  const box = document.createElement('div'); box.className = `message ${role}`;
  const label = document.createElement('span'); label.textContent = role === 'user' ? 'YOU' : role === 'error' ? 'PLEASE TRY AGAIN' : 'VOICE MATH';
  const p = document.createElement('p'); p.textContent = text; box.append(label, p); $('#messages').append(box); box.scrollIntoView({ block: 'nearest' });
}
async function api(path, body) {
  const response = await fetch(path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed.'); return data;
}
function reset() { conversation = null; muted = false; $('#mute').hidden = true; $('#mute').textContent = 'Mute microphone'; $('#start').textContent = 'Start voice conversation'; $('#voice-status').textContent = 'Conversation ended'; document.body.classList.remove('active'); }
$('#start').addEventListener('click', async () => {
  if (busy) return; busy = true; $('#start').disabled = true;
  try {
    if (conversation) { await conversation.endSession(); reset(); }
    else {
      $('#voice-status').textContent = 'Connecting…';
      const { signedUrl } = await api('/api/session', {});
      conversation = await Conversation.startSession({ signedUrl, connectionType: 'websocket',
        clientTools: { calculate: async ({ expression }) => { try { const result = await api('/api/calculate', { question: expression }); return result.answer; } catch (error) { return `Calculation error: ${error.message}`; } } },
        onMessage: ({ source, message: text }) => message(source === 'user' ? 'user' : 'assistant', text),
        onModeChange: ({ mode }) => { $('#voice-status').textContent = mode === 'speaking' ? 'Agent is speaking…' : 'Listening to you…'; },
        onDisconnect: () => reset(),
        onError: text => message('error', String(text))
      });
      $('#start').textContent = 'End conversation'; $('#mute').hidden = false; document.body.classList.add('active');
      $('#voice-status').textContent = 'Listening to you…';
    }
  } catch (error) { reset(); message('error', error.message); } finally { busy = false; $('#start').disabled = false; }
});
$('#mute').addEventListener('click', () => { if (!conversation) return; muted = !muted; conversation.setMicMuted(muted); $('#mute').textContent = muted ? 'Unmute microphone' : 'Mute microphone'; });
$('#question-form').addEventListener('submit', async event => {
  event.preventDefault(); const question = $('#question').value.trim(); if (!question) return;
  $('#question').value = ''; message('user', question);
  try {
    if (conversation) conversation.sendUserMessage(question);
    else { const { answer, expression } = await api('/api/calculate', { question }); message('assistant', `${expression} = ${answer}`); }
  } catch (error) { message('error', error.message); }
});
document.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => { $('#question').value = button.dataset.question; $('#question-form').requestSubmit(); }));
$('#clear').addEventListener('click', () => { $('#messages').replaceChildren(); message('assistant', 'Transcript cleared. Ask another question.'); });
try {
  const config = await api('/api/config'); $('#connection').textContent = config.voiceReady ? 'ElevenLabs ready' : 'Demo mode'; $('#start').disabled = !config.voiceReady;
  if (!config.voiceReady) { $('#voice-note').textContent = 'Add credentials to .env to enable voice. Try text math now.'; $('#voice-status').textContent = 'Text demo is ready'; }
  const question = new URLSearchParams(location.search).get('question');
  if (question) { $('#question').value = question.slice(0, 250); history.replaceState({}, '', '/'); $('#question-form').requestSubmit(); }
} catch { $('#connection').textContent = 'Server unavailable'; message('error', 'Cannot reach the app server. Restart npm run dev and refresh.'); }
window.addEventListener('pagehide', () => { conversation?.endSession(); });
