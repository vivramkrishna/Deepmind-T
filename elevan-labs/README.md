# Voice Math — ElevenLabs app + Chrome extension

Flow: **Your App → ElevenLabs Voice Agent → conversation**.

Simple vanilla JavaScript frontend, Node/Express backend, official ElevenLabs client SDK, and a Manifest V3 extension. Requires Node.js 22+. Everything runs locally; no credentials are needed for the text math demo.

## Run now

```bash
cd elevan-labs
npm install
npm run setup
npm run dev
```

Open http://localhost:3000. Try `24 times 7`, `15% of 200`, `sqrt(81)`, or `(12 + 8) / 4`. Demo accepts digits, not spelled-out numbers; the live agent converts spoken numbers. Expressions are restricted to arithmetic; assignments and arbitrary functions are rejected. Answers use 12 significant digits.

## Add ElevenLabs later

1. Replace `ELEVENLABS_API_KEY` in `.env` with your real key.
2. Run `npm run agent:setup`. This creates an authenticated math agent with the calculator tool and saves its ID in `.agent-id`. Re-running skips an existing configured agent. If creation times out, check the dashboard before retrying to avoid duplicates.
3. Restart `npm run dev`, then click **Start voice conversation** and allow microphone access. Use headphones to avoid feedback.

Alternatively, set `ELEVENLABS_AGENT_ID` for an existing agent. Configure that agent with the prompt and `calculate` client tool from `agent.config.json`; enable user transcript, agent response, audio, interruption, and client tool events. The app retrieves a short-lived signed URL from the backend; the API key never goes to the browser or extension. Live voice needs network access and an ElevenLabs account with available usage. Account/API configuration can only be verified once real credentials are supplied.

## Chrome extension

1. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select this project's `extension` folder.
2. Click the extension toolbar action or press **Alt+Shift+M** to open the app.
3. Select a math question on any page, right-click, and choose **Ask Voice Math**. The app opens and calculates automatically.

Chrome requires you to approve extension installation and microphone permission. The extension sends only explicitly selected text, requires no page-reading host permissions, and contains no credentials. Start the local server first. If you change PORT, update APP_URL in `extension/background.js` and reload the extension. Voice starts with an explicit click in the app.

## Commands

- `npm test`: arithmetic correctness and unsafe/invalid input checks.
- `npm run build`: production frontend bundle.
- `npm start`: serve the built app on localhost.
- `npm run setup`: create placeholder `.env` without overwriting existing values.
- `npm run agent:setup`: provision the agent after adding the key.

## Files and limitations

`src/main.js` handles conversations, transcript, mute and math demo. `server/index.js` handles signed URLs and math requests. `agent.config.json` defines the agent and tool. `extension/` contains the Chrome integration. No conversation history is persisted by this app; ElevenLabs account retention settings govern live sessions. Clear removes the visible transcript, not the live agent's context.

This is a local development app: it binds to 127.0.0.1 and blocks cross-origin API requests. Before remote deployment, add user authentication, per-user rate limits, HTTPS, and deployment-specific origin handling.

API reference: https://elevenlabs.io/docs/eleven-agents/libraries/java-script

Agent creation: https://elevenlabs.io/docs/eleven-agents/api-reference/agents/create
