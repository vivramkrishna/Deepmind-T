# Mana Mart — Multilingual Voice Shop Assistant

An installable PWA that feels like a phone call. Customers speak naturally in Telugu, Hindi, or English; LiveKit carries the audio, while Sarvam handles speech and conversation intelligence. A password-protected dashboard manages products, stock, orders, and conversations.

## What is included

- Mobile-first, phone-call user interface
- Telugu/Hindi/English Sarvam STT and TTS configuration
- One Sarvam stack for STT, conversational intelligence, and TTS, with shop search, cart, and checkout tools
- Guest use: no student account or sign-in
- Explicit recording consent before microphone access
- Password-protected admin conversation dashboard
- Supabase-backed products, stock, carts, and orders
- Local transcript and WebM recording storage for the development build
- Demo mode that works before API credentials are added
- PWA manifest, app icon, offline shell, and home-screen installation support

## Project structure

```text
app/                  Next.js PWA, API routes, student and admin pages
components/           Call screen and admin dashboard
data/                 Local development transcripts and recordings
voice-agent/          LiveKit Python voice agent
```

## 1. Run the web app

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The customer call screen is at `/call` and the owner dashboard is at `/admin`.

The development admin password defaults to `change-this-before-sharing`. Set a strong `ADMIN_PASSWORD` in `.env.local` before letting anyone else access the app.

## 2. Set up the Supabase database

Add `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_DB_URL` to `.env.local`. The secret key must stay server-only. Then create the schema and seed the sample catalogue:

```bash
npm run db:migrate
```

The migration is safe to rerun and does not reset stock or prices changed in the dashboard. `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_JWKS_URL` are reserved for future customer/admin authentication and are not required by the current guest app.

## 3. Configure LiveKit

Create a LiveKit Cloud project or use a self-hosted LiveKit server. Put its WebSocket URL, API key, and secret in `.env.local`:

```dotenv
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
NEXT_PUBLIC_DEMO_MODE=false
```

The browser receives a short-lived room token from `/api/token`. LiveKit credentials are never exposed to the browser.

## 4. Run the voice agent

Requirements: Python 3.10+.

```bash
cd voice-agent
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python agent.py download-files
python agent.py dev
```

Fill `voice-agent/.env` with the same LiveKit credentials plus `SARVAM_API_KEY`. Keep `APP_WEBHOOK_SECRET` identical in the web app and agent environment files.

The current provider choices are:

- Sarvam Saaras v4 STT in Telugu code-mix mode
- Sarvam 105B Conversations (`sarvam-105b-conversations`) for natural multilingual dialogue and tool use
- Sarvam Bulbul v3 TTS, Telugu output

Set `SARVAM_CHAT_MODEL` in `.env.local` only if you want to change the Sarvam chat model. The default is the conversational model tuned for voice-agent workloads.

## 5. Install on a phone

The phone must access the app through HTTPS for microphone and PWA installation support.

- Android/Chrome: open the app, use the browser menu, and choose **Add to Home screen**.
- iPhone/Safari: open the Share menu and choose **Add to Home Screen**.

For local phone testing, expose the development server through a temporary HTTPS tunnel. Cloudflare Tunnel is a good option; deployment can later move to Render, Cloudflare, or another Node-compatible host.

## Storage behavior

This first local build stores structured conversations in `data/conversations.json` and uploaded browser recordings in `data/recordings/`. The browser recording contains the student's microphone audio. LiveKit Cloud Agent Insights can provide full-session agent recordings when recording is enabled for the project.

Local files are intentionally simple for development. Before public deployment, replace them with:

- PostgreSQL for transcript and session metadata
- S3/R2-compatible object storage for audio
- A signed-cookie admin session instead of sending the admin password on each request
- A retention policy and delete/export controls

## Privacy checklist before a real launch

- Write a clear recording and retention policy.
- Choose how long audio and transcripts are kept.
- Encrypt stored recordings and restrict object access.
- Add deletion controls and audit logs for administrators.
- If children may use the app, obtain appropriate legal/privacy review and guardian consent where required.

## Production deployment direction

The web app can run on Render as a Node web service. The Python voice agent should run as a separate always-on worker. LiveKit Cloud provides WebRTC infrastructure. For a short mobile test without deployment, run both services locally and expose only the web app through Cloudflare Tunnel; the voice agent connects outward to LiveKit and does not need its own public port.
