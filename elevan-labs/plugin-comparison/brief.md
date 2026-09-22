# Common comparison brief

Audience: the app owner, learning how Voice Math works. Four short slides or one architecture diagram per plugin. Compare factual clarity, readable labels, editable output and practical access, without fabricated numerical scores.

Ground truth is the current code in src/main.js, server/index.js, scripts/create-agent.js and extension/background.js. No secrets or .env values are part of this brief.

1. Chrome extension opens the local browser app with selected math text in a URL parameter. It does not call ElevenLabs directly.
2. Without a live conversation, browser calls POST /api/calculate. Express uses mathjs locally and returns the answer. No credentials are needed.
3. To start voice, browser calls POST /api/session. Server uses API key and agent ID to request an ElevenLabs signed URL. The browser uses the signed URL to connect directly to the ElevenLabs agent over WebSocket for audio and transcript.
4. Agent calculation requests execute the browser calculate client tool, which calls the same local math endpoint. The tool result returns through the browser to the agent.
5. The user supplies ELEVENLABS_API_KEY. npm run agent:setup creates the remote agent and saves its ID to .agent-id. The ID is required internally but need not be entered manually. Restart after setup.
6. Secrets stay server-side. No database or persistent local transcript exists. Live voice still needs actual credential testing.

Plugin separation matters: AI Graphic Design and Superdesign use the same Superdesign service. Presentation Maker and Presentation Generator are instruction-based skills, not independent remote image generation engines. Readability judgments apply only to outputs actually produced and inspected here.
