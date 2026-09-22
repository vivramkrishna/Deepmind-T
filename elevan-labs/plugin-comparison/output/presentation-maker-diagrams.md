# Presentation Maker: diagram specification

Instruction-based sample using its diagram-slides workflow. This plugin proposes labels and layout; it does not independently render an external deck.

## 1. Demo calculation
Type: process. Direction: left to right. Highlight: local calculator in teal. Labels have four words or fewer.

```mermaid
flowchart LR
  selection[Selected question] --> browser[Browser app]
  browser --> calculator[Local calculator]
  calculator --> answer[Visible answer]
```

## 2. Live conversation
Type: sequence. Show the return path explicitly.

```mermaid
sequenceDiagram
  participant B as Browser app
  participant S as Local server
  participant E as ElevenLabs API
  participant A as Voice agent
  B->>S: Start conversation
  S->>E: Key and agent ID
  E-->>S: Signed URL
  S-->>B: Signed URL
  B->>A: WebSocket audio
  A-->>B: Spoken answer
  A->>B: Calculate request
  B->>S: Math expression
  S-->>B: Math result
  B-->>A: Tool result
  A-->>B: Spoken calculation answer
```

## 3. Automatic setup
Type: process. Highlight: the saved ID, to explain why the user need not enter it manually.

```mermaid
flowchart LR
  key[API key] --> script[Setup script]
  script --> remote[Create agent]
  remote --> saved[Save agent ID]
```

The diagram specification is the Presentation Maker contribution. Mermaid rendering is a separate host capability. The key is server-side; no real credentials are included.
