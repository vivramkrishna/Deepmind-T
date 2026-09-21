"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom, RoomAudioRenderer, StartAudio, useConnectionState, useLocalParticipant,
  useRoomContext, useTranscriptions, useVoiceAssistant,
} from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { Captions, Check, LoaderCircle, Mic, MicOff, PhoneOff, RefreshCw, Volume2, VolumeX, X } from "lucide-react";

type Phase = "consent" | "microphone" | "requesting" | "joining" | "waiting-agent" | "listening" | "user-speaking" | "thinking" | "speaking" | "reconnecting" | "ending" | "ended" | "error";
type TranscriptLine = { id: string; speaker: "user" | "assistant"; text: string };
type CallError = { code: string; message: string } | null;
type ActiveModel = { id: string; name: string; note?: string } | null;

const COPY: Record<Phase, { title: string; detail: string }> = {
  consent: { title: "మైక్ అనుమతి అవసరం", detail: "కాల్ ప్రారంభించడానికి కింద ఉన్న బటన్‌ను నొక్కండి." },
  microphone: { title: "మైక్‌ను సిద్ధం చేస్తున్నాం", detail: "బ్రౌజర్ అడిగితే మైక్ అనుమతి ఇవ్వండి." },
  requesting: { title: "సురక్షిత కాల్‌ను తయారు చేస్తున్నాం", detail: "ఇది సాధారణంగా కొన్ని సెకన్లు మాత్రమే పడుతుంది." },
  joining: { title: "కాల్‌కు కనెక్ట్ అవుతోంది", detail: "దయచేసి ఈ పేజీని మూసివేయవద్దు." },
  "waiting-agent": { title: "Manaను కలుపుతున్నాం", detail: "Shop assistant సిద్ధమవుతోంది…" },
  listening: { title: "ఏం కావాలో చెప్పండి", detail: "తెలుగు, हिंदी, or Englishలో product అడగండి." },
  "user-speaking": { title: "వింటున్నాను", detail: "Product, size లేదా quantity చెప్పండి." },
  thinking: { title: "Shopలో వెతుకుతున్నాను", detail: "Live price మరియు stock చూస్తున్నాను…" },
  speaking: { title: "Mana మాట్లాడుతోంది", detail: "మధ్యలో కావాలంటే వెంటనే చెప్పండి." },
  reconnecting: { title: "కనెక్షన్‌ను తిరిగి కలుపుతున్నాం", detail: "మీ ఇంటర్నెట్‌ను తనిఖీ చేయండి; కాల్ ఆటోమేటిక్‌గా కొనసాగుతుంది." },
  ending: { title: "కాల్‌ను భద్రపరుస్తున్నాం", detail: "ఒక్క క్షణం వేచి ఉండండి…" },
  ended: { title: "కాల్ ముగిసింది", detail: "మీ సంభాషణ భద్రపరచబడింది." },
  error: { title: "కాల్‌లో సమస్య వచ్చింది", detail: "కింద ఉన్న వివరాలను చూసి మళ్లీ ప్రయత్నించండి." },
};

function reportDiagnostic(event: string, data: Record<string, unknown> = {}) {
  console.info(`[call] ${event}`, data);
  void fetch("/api/diagnostics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event, data, at: new Date().toISOString(), page: "/call" }) }).catch(() => undefined);
}

function friendlyError(cause: unknown): CallError {
  if (cause instanceof DOMException && cause.name === "NotAllowedError") return { code: "MIC_PERMISSION_DENIED", message: "మైక్ అనుమతి ఇవ్వలేదు. అడ్రస్ బార్ దగ్గర మైక్ గుర్తును నొక్కి Allow చేసి మళ్లీ ప్రయత్నించండి." };
  if (cause instanceof DOMException && cause.name === "NotFoundError") return { code: "MIC_NOT_FOUND", message: "ఈ పరికరంలో మైక్ కనిపించలేదు. మైక్‌ను కనెక్ట్ చేసి మళ్లీ ప్రయత్నించండి." };
  return { code: "CALL_START_FAILED", message: cause instanceof Error ? cause.message : "కాల్ ప్రారంభించలేకపోయాం. ఇంటర్నెట్‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి." };
}

function useTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => { if (!running) return; const id = window.setInterval(() => setSeconds((v) => v + 1), 1000); return () => clearInterval(id); }, [running]);
  return { seconds, label: `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}` };
}

function Progress({ phase, connected, agentReady }: { phase: Phase; connected: boolean; agentReady: boolean }) {
  const micReady = !["consent", "microphone", "error"].includes(phase);
  return <div className="connection-steps" aria-label="Call setup progress">
    <span className={micReady ? "done" : phase === "microphone" ? "active" : ""}><i>{micReady ? <Check /> : "1"}</i>మైక్</span>
    <b />
    <span className={connected ? "done" : ["requesting", "joining", "reconnecting"].includes(phase) ? "active" : ""}><i>{connected ? <Check /> : "2"}</i>కాల్</span>
    <b />
    <span className={agentReady ? "done" : phase === "waiting-agent" ? "active" : ""}><i>{agentReady ? <Check /> : "3"}</i>Mana</span>
  </div>;
}

function Orb({ phase }: { phase: Phase }) {
  const busy = ["microphone", "requesting", "joining", "waiting-agent", "reconnecting", "ending"].includes(phase);
  return <div className={`orb phase-${phase}`} aria-hidden="true"><div className="orb-core">{busy ? <LoaderCircle className="orb-loader" /> : <span>లె</span>}</div><div className="sound-bars">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</div></div>;
}

function Transcript({ lines, close, model, responseMs }: { lines: TranscriptLine[]; close: () => void; model: ActiveModel; responseMs?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [lines]);
  return <aside className="transcript-panel" id="live-transcript"><header><div><strong>లైవ్ ట్రాన్స్‌క్రిప్ట్</strong><span><i /> LIVE · {model?.name || "Mana AI"}{responseMs ? ` · ${(responseMs / 1000).toFixed(1)}s` : ""}</span></div><button onClick={close} aria-label="Close"><X /></button></header><div className="transcript-feed" ref={ref} aria-live="polite">{lines.length ? lines.map((line) => <article className={`feed-line ${line.speaker}`} key={line.id}><span>{line.speaker === "user" ? "మీరు" : "Mana"}</span><p>{line.text}</p></article>) : <div className="transcript-empty"><Captions /><p>మీరు మాట్లాడిన తర్వాత conversation ఇక్కడ కనిపిస్తుంది.</p></div>}</div></aside>;
}

type SurfaceProps = { phase: Phase; transcript: TranscriptLine[]; error: CallError; connected?: boolean; agentReady?: boolean; muted: boolean; speakerOn: boolean; onMute: () => void; onSpeaker: () => void; onEnd: () => void; onRetry: () => void; duration: string; model: ActiveModel; responseMs?: number };
function CallSurface(p: SurfaceProps) {
  const [open, setOpen] = useState(false); const latest = p.transcript.at(-1); const copy = COPY[p.phase];
  const controlsDisabled = !["listening", "user-speaking", "thinking", "speaking", "reconnecting", "waiting-agent"].includes(p.phase);
  return <div className={`call-stage ${open ? "transcript-visible" : ""}`}><section className="call-main">
    <div className="call-topbar"><span className={`secure-dot ${p.connected ? "" : "is-connecting"}`} />{p.connected ? "సురక్షిత కాల్" : "కనెక్ట్ అవుతోంది"}<span className="model-chip">{p.model?.name || "Selecting model"}{p.responseMs ? ` · ${(p.responseMs / 1000).toFixed(1)}s` : ""}</span><span className="call-time">{p.connected ? p.duration : "—:—"}</span></div>
    <Progress phase={p.phase} connected={!!p.connected} agentReady={!!p.agentReady} />
    <div className="tutor-name" aria-live="polite"><strong>{copy.title}</strong><span>{copy.detail}</span></div><Orb phase={p.phase} />
    {p.error ? <div className="in-call-error" role="alert"><strong>{COPY.error.title}</strong><span>{p.error.message}</span><small>సమస్య కోడ్: {p.error.code}</small><button onClick={p.onRetry}><RefreshCw /> మళ్లీ ప్రయత్నించండి</button></div> : <div className={`live-caption ${latest ? "" : "caption-placeholder"}`} aria-live="polite"><span>{latest?.speaker === "assistant" ? "MANA" : latest ? "YOU" : p.agentReady ? "READY" : "STATUS"}</span><p>{latest?.text || copy.detail}</p></div>}
    <div className="call-controls"><button className={`round-control ${p.muted ? "control-off" : ""}`} disabled={controlsDisabled} onClick={p.onMute} aria-label="Toggle microphone">{p.muted ? <MicOff /> : <Mic />}</button><button className={`round-control ${!p.speakerOn ? "control-off" : ""}`} disabled={controlsDisabled} onClick={p.onSpeaker} aria-label="Toggle speaker">{p.speakerOn ? <Volume2 /> : <VolumeX />}</button><button className={`round-control ${open ? "control-active" : ""}`} onClick={() => setOpen(!open)} aria-label="Transcript"><Captions /></button><button className="round-control end-control" disabled={p.phase === "ending"} onClick={p.onEnd} aria-label="End call"><PhoneOff fill="currentColor" /></button></div>
    <p className="call-hint">{p.muted ? "మైక్ ఆఫ్‌లో ఉంది — మాట్లాడడానికి మైక్ బటన్ నొక్కండి" : p.agentReady ? "Product add/remove లేదా cart total ఎప్పుడైనా అడగండి" : "పైన ఉన్న మూడు దశలు పూర్తయ్యాక మాట్లాడండి"}</p>
  </section>{open && <Transcript lines={p.transcript} close={() => setOpen(false)} model={p.model} responseMs={p.responseMs} />}</div>;
}

function ConnectedCall({ onEnd, onRetry, onLines, transcript, externalError, duration, model }: { onEnd: () => void; onRetry: () => void; onLines: (v: TranscriptLine[]) => void; transcript: TranscriptLine[]; externalError: CallError; duration: string; model: ActiveModel }) {
  const room = useRoomContext(); const connection = useConnectionState(); const { localParticipant, lastMicrophoneError } = useLocalParticipant();
  const { agent, state: agentState } = useVoiceAssistant(); const transcriptions = useTranscriptions(); const [speakerOn, setSpeakerOn] = useState(true); const [timeoutError, setTimeoutError] = useState<CallError>(null);
  const [responseMs, setResponseMs] = useState<number | undefined>(undefined); const questionStarted = useRef<number | undefined>(undefined);
  const connected = connection === ConnectionState.Connected; const agentReady = !!agent && !["disconnected", "connecting", "initializing", "pre-connect-buffering"].includes(agentState);
  const phase: Phase = connection === ConnectionState.Reconnecting || connection === ConnectionState.SignalReconnecting ? "reconnecting" : !connected ? "joining" : !agentReady ? "waiting-agent" : agentState === "failed" ? "error" : agentState === "speaking" ? "speaking" : agentState === "thinking" ? "thinking" : localParticipant.isSpeaking ? "user-speaking" : "listening";
  useEffect(() => { if (!connected || agentReady) return; const id = window.setTimeout(() => { setTimeoutError({ code: "AGENT_JOIN_TIMEOUT", message: "Mana 20 సెకన్లలో చేరలేదు. Voice agent నడుస్తుందో చూసి మళ్లీ ప్రయత్నించండి." }); reportDiagnostic("agent_timeout", { room: room.name }); }, 20000); return () => clearTimeout(id); }, [agentReady, connected, room.name]);
  useEffect(() => {
    if (!agentReady || transcript.some((line) => line.speaker === "assistant")) return;
    const id = window.setTimeout(() => {
      setTimeoutError({ code: "ASSISTANT_RESPONSE_TIMEOUT", message: "Mana కనెక్ట్ అయింది, కానీ AI service స్పందించలేదు. Model quota లేదా billing చూసి మళ్లీ ప్రయత్నించండి." });
      reportDiagnostic("assistant_response_timeout", { room: room.name });
    }, 15000);
    return () => clearTimeout(id);
  }, [agentReady, room.name, transcript]);
  useEffect(() => { if (lastMicrophoneError) reportDiagnostic("microphone_runtime_error", { message: lastMicrophoneError.message }); }, [lastMicrophoneError]);
  useEffect(() => { const lines = transcriptions.filter((x) => x.text.trim()).map((x) => ({ id: x.streamInfo.id, speaker: x.participantInfo.identity === localParticipant.identity ? "user" as const : "assistant" as const, text: x.text.trim() })); const latest = lines.at(-1); if (latest?.speaker === "user") questionStarted.current ??= performance.now(); if (latest?.speaker === "assistant" && questionStarted.current) { setResponseMs(Math.round(performance.now() - questionStarted.current)); questionStarted.current = undefined; } if (lines.length) onLines(lines); }, [localParticipant.identity, onLines, transcriptions]);
  const error = externalError || timeoutError || (agentState === "failed" ? { code: "AGENT_FAILED", message: "Mana స్పందించడం ఆగిపోయింది. మళ్లీ కాల్ ప్రారంభించండి." } : null) || (lastMicrophoneError ? { code: "MIC_RUNTIME_ERROR", message: "మైక్‌తో కనెక్షన్ పోయింది. మైక్ సెట్టింగ్స్ చూడండి." } : null);
  return <><CallSurface phase={error ? "error" : phase} transcript={transcript} error={error} connected={connected} agentReady={agentReady} muted={!localParticipant.isMicrophoneEnabled} speakerOn={speakerOn} duration={duration} model={model} responseMs={responseMs} onRetry={onRetry} onEnd={onEnd} onMute={() => void localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled)} onSpeaker={() => { const next = !speakerOn; document.querySelectorAll<HTMLAudioElement>("audio").forEach((a) => { a.muted = !next; }); setSpeakerOn(next); }} /><StartAudio className="audio-unlock" label="ట్యూటర్ వాయిస్ వినడానికి ఇక్కడ నొక్కండి" /></>;
}

export default function CallScreen() {
  const [phase, setPhase] = useState<Phase>("consent"); const [token, setToken] = useState(""); const [serverUrl, setServerUrl] = useState(""); const [callId, setCallId] = useState(""); const [model, setModel] = useState<ActiveModel>(null); const [transcript, setTranscript] = useState<TranscriptLine[]>([]); const [error, setError] = useState<CallError>(null);
  const recorder = useRef<MediaRecorder | null>(null); const chunks = useRef<Blob[]>([]); const controller = useRef<AbortController | null>(null); const intentionalEnd = useRef(false); const { seconds, label: duration } = useTimer(!["consent", "microphone", "ended"].includes(phase));
  const stopMedia = useCallback(() => { recorder.current?.stream.getTracks().forEach((t) => t.stop()); }, []);
  const begin = useCallback(async () => { intentionalEnd.current = false; setError(null); setTranscript([]); setToken(""); chunks.current = []; controller.current?.abort(); controller.current = new AbortController();
    try { setPhase("microphone"); if (!navigator.mediaDevices?.getUserMedia) throw new Error("ఈ బ్రౌజర్‌లో మైక్ అందుబాటులో లేదు."); const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); reportDiagnostic("microphone_ready");
      const r = new MediaRecorder(stream, MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? { mimeType: "audio/webm;codecs=opus" } : undefined); recorder.current = r; r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); }; r.start(1000);
      setPhase("requesting"); const response = await fetch("/api/token", { method: "POST", signal: controller.current.signal }); const data = await response.json(); if (!response.ok || !data.token) throw new Error(data.error || "కాల్ సర్వర్ అందుబాటులో లేదు."); setCallId(data.callId); setModel(data.model || null); setServerUrl(data.url); setToken(data.token); setPhase("joining"); reportDiagnostic("token_received", { callId: data.callId, room: data.room, model: data.model?.id });
    } catch (cause) { if (cause instanceof DOMException && cause.name === "AbortError") return; stopMedia(); const next = friendlyError(cause); setError(next); setPhase("consent"); reportDiagnostic("start_failed", { code: next?.code, message: next?.message }); }
  }, [stopMedia]);
  const endCall = useCallback(async () => { intentionalEnd.current = true; controller.current?.abort(); setPhase("ending"); setToken(""); setServerUrl("");
    try { if (recorder.current?.state === "recording") await new Promise<void>((resolve) => { const r = recorder.current!; r.onstop = () => resolve(); r.stop(); }); const recording = new Blob(chunks.current, { type: recorder.current?.mimeType || "audio/webm" }); const form = new FormData(); if (recording.size) form.append("audio", recording, "call.webm"); form.append("transcript", JSON.stringify(transcript)); form.append("language", "te-IN"); form.append("callId", callId); form.append("durationSeconds", String(seconds)); const response = await fetch("/api/conversations", { method: "POST", body: form }); if (!response.ok) throw new Error(`Save failed: ${response.status}`); reportDiagnostic("call_saved", { callId, durationSeconds: seconds, transcriptLines: transcript.length }); setPhase("ended"); }
    catch (cause) { const next = { code: "SAVE_FAILED", message: "కాల్ ముగిసింది, కానీ రికార్డింగ్‌ను భద్రపరచలేకపోయాం. మరోసారి ప్రయత్నించండి." }; setError(next); setPhase("error"); reportDiagnostic("save_failed", { message: cause instanceof Error ? cause.message : String(cause) }); } finally { stopMedia(); }
  }, [callId, seconds, stopMedia, transcript]);
  useEffect(() => () => { controller.current?.abort(); stopMedia(); }, [stopMedia]);
  const consentError = phase === "consent" ? error : null;
  if (phase === "consent") return <main className="consent-shell"><section className="consent-card"><div className="consent-icon"><Mic /></div><p className="eyebrow">MANA MART VOICE SHOPPING</p><h1>ఏం కావాలో మాట్లాడి చెప్పండి</h1><p>తెలుగు, हिंदी, English mixలో products వెతికి cartలో add చేయొచ్చు.</p><Progress phase="consent" connected={false} agentReady={false} />{consentError && <div className="error-box" role="alert"><strong>{consentError.message}</strong><small>సమస్య కోడ్: {consentError.code}</small></div>}<button className="primary-cta" onClick={begin}><Mic /> మైక్‌తో shopping ప్రారంభించండి</button><a className="text-link" href="/">వెనక్కి వెళ్లండి</a></section></main>;
  if (phase === "ended") return <main className="consent-shell"><section className="consent-card ended-card"><div className="ended-check"><Check /></div><h1>{COPY.ended.title}</h1><p>{COPY.ended.detail}</p><a className="primary-cta" href="/call">మళ్లీ shop చేయండి</a><a className="text-link" href="/">హోమ్‌కు వెళ్లండి</a></section></main>;
  if (!token || !serverUrl) return <main className="phone-shell"><CallSurface phase={phase} transcript={transcript} error={error} connected={false} agentReady={false} muted={false} speakerOn duration={duration} model={model} onMute={() => undefined} onSpeaker={() => undefined} onEnd={endCall} onRetry={begin} /></main>;
  return <main className="phone-shell"><LiveKitRoom token={token} serverUrl={serverUrl} connect audio video={false} options={{ adaptiveStream: true, dynacast: true }} onConnected={() => { setPhase("waiting-agent"); reportDiagnostic("room_connected", { callId }); }} onDisconnected={(reason) => { reportDiagnostic("room_disconnected", { callId, reason }); if (!intentionalEnd.current) setError({ code: "ROOM_DISCONNECTED", message: "కాల్ కనెక్షన్ ముగిసింది. ఇంటర్నెట్‌ను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి." }); }} onError={(e) => { setError({ code: "LIVEKIT_ERROR", message: e.message }); reportDiagnostic("livekit_error", { message: e.message }); }} onMediaDeviceFailure={(failure) => { setError({ code: "MEDIA_DEVICE_FAILURE", message: "మైక్ పనిచేయడం లేదు. బ్రౌజర్ మైక్ అనుమతిని తనిఖీ చేయండి." }); reportDiagnostic("media_device_failure", { failure }); }}><ConnectedCall onEnd={endCall} onRetry={begin} onLines={setTranscript} transcript={transcript} externalError={error} duration={duration} model={model} /><RoomAudioRenderer /></LiveKitRoom></main>;
}
