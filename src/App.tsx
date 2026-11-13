import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  CheckSquare,
  Lightbulb,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ChatPanel } from './components/ChatPanel';
import { MemoriesSheet } from './components/MemoriesSheet';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OptionsSheet } from './components/OptionsSheet';
import { PWAInstallButton } from './components/PWAInstallButton';
import { VoiceOrb } from './components/VoiceOrb';
import { useLiveCall } from './hooks/useLiveCall';
import {
  LunaMode,
  MemoryCategory,
  MemoryFact,
  RoomScene,
  TaskItem,
  ToolEvent,
  TranscriptEntry,
  VoiceName,
} from './types';

const TRANSCRIPT_STORAGE_KEY = 'luna_transcript_v1';
const TOKEN_STORAGE_KEY = 'luna_access_token_v1';
const PREFS_STORAGE_KEY = 'luna_prefs_v1';

interface StoredPrefs {
  voiceName?: VoiceName;
  mode?: LunaMode;
  scene?: RoomScene;
  lampOn?: boolean;
  showCaptions?: boolean;
  speakTextReplies?: boolean;
}

function loadPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPrefs) : {};
  } catch {
    return {};
  }
}

function formatTime(): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
}

function loadStoredTranscript(): TranscriptEntry[] {
  try {
    const raw = localStorage.getItem(TRANSCRIPT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-80) : [];
  } catch {
    return [];
  }
}

const MODE_LABELS: Record<LunaMode, string> = {
  natural: 'Natural Mix',
  coach: 'English Coach',
  study: 'Study Buddy',
  night: 'Late Night',
};

const QUICK_STARTERS = [
  'Check my tasks for today',
  'Let us practice English for 5 minutes',
  'Quiz me on something I am learning',
  'Give me a warm pep talk',
];

export default function App() {
  const initialPrefs = useRef<StoredPrefs>(loadPrefs());

  const [authChecking, setAuthChecking] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [authorized, setAuthorized] = useState(true);
  const [accessToken, setAccessToken] = useState<string>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const [voiceName, setVoiceName] = useState<VoiceName>(
    initialPrefs.current.voiceName ?? 'Sulafat'
  );
  const [mode, setMode] = useState<LunaMode>(
    initialPrefs.current.mode ?? 'natural'
  );
  const [scene, setScene] = useState<RoomScene>(
    initialPrefs.current.scene ?? 'lamp'
  );
  const [lampOn, setLampOn] = useState<boolean>(
    initialPrefs.current.lampOn ?? true
  );
  const [showCaptions, setShowCaptions] = useState<boolean>(
    initialPrefs.current.showCaptions ?? true
  );
  const [speakTextReplies, setSpeakTextReplies] = useState<boolean>(
    initialPrefs.current.speakTextReplies ?? true
  );

  const [notebookOpen, setNotebookOpen] = useState(false);
  const [notebookTab, setNotebookTab] = useState<'memories' | 'tasks'>('memories');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);

  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(() =>
    loadStoredTranscript()
  );
  const [inputText, setInputText] = useState('');
  const [isSendingText, setIsSendingText] = useState(false);
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [ttsLevel, setTtsLevel] = useState(0);
  const [isRecordingNote, setIsRecordingNote] = useState(false);

  const transcriptRef = useRef<TranscriptEntry[]>(transcript);
  const liveUserTurnIdRef = useRef<string | null>(null);
  const liveAssistantTurnIdRef = useRef<string | null>(null);
  const pendingToolsRef = useRef<ToolEvent[]>([]);
  const ttsCtxRef = useRef<AudioContext | null>(null);
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ttsRafRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        PREFS_STORAGE_KEY,
        JSON.stringify({
          voiceName,
          mode,
          scene,
          lampOn,
          showCaptions,
          speakTextReplies,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [lampOn, mode, scene, showCaptions, speakTextReplies, voiceName]);

  useEffect(() => {
    transcriptRef.current = transcript;
    try {
      localStorage.setItem(
        TRANSCRIPT_STORAGE_KEY,
        JSON.stringify(transcript.slice(-80))
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [transcript]);

  const apiFetch = useCallback(
    (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return fetch(input, { ...init, headers });
    },
    [accessToken]
  );

  // Verify access token configuration on startup
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiFetch('/api/auth/status');
        const data = (await res.json()) as {
          authRequired?: boolean;
          authorized?: boolean;
        };
        if (!active) return;
        setAuthRequired(Boolean(data.authRequired));
        setAuthorized(Boolean(data.authorized ?? !data.authRequired));
      } catch {
        if (active) setAuthorized(true);
      } finally {
        if (active) setAuthChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFetch]);

  const loadMemories = useCallback(async () => {
    if (!authorized) return;
    try {
      const res = await apiFetch('/api/memories');
      if (!res.ok) return;
      const data = (await res.json()) as { facts: MemoryFact[] };
      setFacts(data.facts ?? []);
    } catch {
      // Ignore transient network errors
    }
  }, [apiFetch, authorized]);

  const loadTasks = useCallback(async () => {
    if (!authorized) return;
    try {
      const res = await apiFetch('/api/tasks');
      if (!res.ok) return;
      const data = (await res.json()) as { tasks: TaskItem[] };
      setTasks(data.tasks ?? []);
    } catch {
      // Ignore transient network errors
    }
  }, [apiFetch, authorized]);

  useEffect(() => {
    if (authorized && !authChecking) {
      loadMemories();
      loadTasks();
    }
  }, [authChecking, authorized, loadMemories, loadTasks]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, chatDrawerOpen]);

  const stopTtsPlayback = useCallback(() => {
    if (ttsRafRef.current !== null) {
      cancelAnimationFrame(ttsRafRef.current);
      ttsRafRef.current = null;
    }
    if (ttsSourceRef.current) {
      try {
        ttsSourceRef.current.stop();
      } catch {
        // Ignore already stopped
      }
      ttsSourceRef.current = null;
    }
    setIsPlayingTts(false);
    setTtsLevel(0);
  }, []);

  const appendLiveTranscript = useCallback(
    (role: 'user' | 'assistant', chunk: string) => {
      const ref =
        role === 'user' ? liveUserTurnIdRef : liveAssistantTurnIdRef;
      const otherRef =
        role === 'user' ? liveAssistantTurnIdRef : liveUserTurnIdRef;
      otherRef.current = null;

      setTranscript((prev) => {
        if (ref.current) {
          return prev.map((item) =>
            item.id === ref.current
              ? { ...item, text: `${item.text}${chunk}` }
              : item
          );
        }
        const id = `${role}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        ref.current = id;
        const tools =
          role === 'assistant' && pendingToolsRef.current.length > 0
            ? [...pendingToolsRef.current]
            : undefined;
        if (role === 'assistant') {
          pendingToolsRef.current = [];
        }
        return [
          ...prev,
          {
            id,
            role,
            text: chunk.trimStart(),
            timestamp: formatTime(),
            toolEvents: tools,
          },
        ];
      });
    },
    []
  );

  const handleTurnComplete = useCallback(() => {
    liveUserTurnIdRef.current = null;
    liveAssistantTurnIdRef.current = null;
  }, []);

  const handleLiveToolEvent = useCallback(
    (ev: ToolEvent) => {
      if (ev.name === 'remember' || ev.name === 'forget') {
        loadMemories();
      }
      if (
        ev.name === 'get_tasks' ||
        ev.name === 'create_task' ||
        ev.name === 'complete_task'
      ) {
        loadTasks();
      }
      if (liveAssistantTurnIdRef.current) {
        const targetId = liveAssistantTurnIdRef.current;
        setTranscript((prev) =>
          prev.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  toolEvents: [...(item.toolEvents ?? []), ev],
                }
              : item
          )
        );
      } else {
        pendingToolsRef.current.push(ev);
      }
    },
    [loadMemories, loadTasks]
  );

  const handleCallEnded = useCallback(
    (endedMood: string | null) => {
      const recent = transcriptRef.current.slice(-18);
      if (recent.length < 2) return;
      apiFetch('/api/session-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: recent.map((m) => ({ role: m.role, text: m.text })),
          mood: endedMood ?? '',
        }),
      }).catch(() => {});
    },
    [apiFetch]
  );

  const liveCall = useLiveCall({
    voiceName,
    mode,
    accessToken,
    onUserTranscript: (chunk) => appendLiveTranscript('user', chunk),
    onAssistantTranscript: (chunk) => appendLiveTranscript('assistant', chunk),
    onTurnComplete: handleTurnComplete,
    onToolEvent: handleLiveToolEvent,
    onCallEnded: handleCallEnded,
  });

  const isLive = liveCall.status === 'live';
  const isConnecting =
    liveCall.status === 'connecting' || liveCall.status === 'reconnecting';
  const isLunaSpeaking = liveCall.isLunaSpeaking || isPlayingTts;
  const activeLunaLevel = liveCall.isLunaSpeaking ? liveCall.lunaLevel : ttsLevel;
  const latestLunaLine = [...transcript]
    .reverse()
    .find((t) => t.role === 'assistant')?.text;
  const latestUserLine = [...transcript]
    .reverse()
    .find((t) => t.role === 'user')?.text;
  const nextOpenTask = tasks.find((t) => !t.done);

  const handleToggleCall = useCallback(() => {
    if (isLive || isConnecting) {
      liveCall.endCall();
    } else {
      stopTtsPlayback();
      liveCall.startCall();
    }
  }, [isConnecting, isLive, liveCall, stopTtsPlayback]);

  // Real AudioContext + AnalyserNode playback for TTS so lip-sync matches actual speech
  const speakWithTts = useCallback(
    async (text: string) => {
      if (!speakTextReplies || !text.trim()) return;
      try {
        if (!ttsCtxRef.current) {
          ttsCtxRef.current = new AudioContext();
        }
        const ctx = ttsCtxRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }

        const res = await apiFetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceName }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { audioBase64?: string };
        if (!data.audioBase64) return;

        stopTtsPlayback();

        const binary = atob(data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));

        const source = ctx.createBufferSource();
        source.buffer = decoded;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        analyser.connect(ctx.destination);

        ttsSourceRef.current = source;
        setIsPlayingTts(true);

        const meterData = new Uint8Array(64);
        const tick = () => {
          if (!ttsSourceRef.current) return;
          analyser.getByteTimeDomainData(meterData);
          let sumSq = 0;
          for (let i = 0; i < meterData.length; i++) {
            const c = (meterData[i] - 128) / 128;
            sumSq += c * c;
          }
          const rms = Math.sqrt(sumSq / meterData.length);
          setTtsLevel(Math.min(1, rms * 5.2));
          ttsRafRef.current = requestAnimationFrame(tick);
        };
        ttsRafRef.current = requestAnimationFrame(tick);

        source.onended = () => {
          ttsSourceRef.current = null;
          if (ttsRafRef.current !== null) {
            cancelAnimationFrame(ttsRafRef.current);
            ttsRafRef.current = null;
          }
          setIsPlayingTts(false);
          setTtsLevel(0);
        };
        source.start();
      } catch {
        stopTtsPlayback();
      }
    },
    [apiFetch, speakTextReplies, stopTtsPlayback, voiceName]
  );

  const handleSendMessage = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      if (isLive) {
        setTranscript((prev) => [
          ...prev,
          {
            id: `user-${Date.now()}`,
            role: 'user',
            text: clean,
            timestamp: formatTime(),
          },
        ]);
        liveCall.sendTextDuringCall(clean);
        return;
      }

      const userEntry: TranscriptEntry = {
        id: `user-${Date.now()}`,
        role: 'user',
        text: clean,
        timestamp: formatTime(),
      };
      const updated = [...transcript, userEntry];
      setTranscript(updated);
      setIsSendingText(true);

      try {
        const res = await apiFetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            messages: updated.map((m) => ({ role: m.role, text: m.text })),
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          toolEvents?: ToolEvent[];
          facts?: MemoryFact[];
          error?: string;
        };

        if (!res.ok) {
          setTranscript((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'assistant',
              text: data.error ?? 'Sorry babee, I could not reach the server.',
              timestamp: formatTime(),
            },
          ]);
          return;
        }

        if (data.facts) setFacts(data.facts);
        if (
          data.toolEvents?.some(
            (ev) =>
              ev.name === 'get_tasks' ||
              ev.name === 'create_task' ||
              ev.name === 'complete_task'
          )
        ) {
          loadTasks();
        }
        const replyText = data.reply ?? '';
        setTranscript((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            text: replyText,
            timestamp: formatTime(),
            toolEvents: data.toolEvents,
          },
        ]);

        if (replyText) {
          await speakWithTts(replyText);
        }
      } catch {
        setTranscript((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            text: 'Network error while reaching Luna.',
            timestamp: formatTime(),
          },
        ]);
      } finally {
        setIsSendingText(false);
      }
    },
    [apiFetch, isLive, liveCall, loadTasks, mode, speakWithTts, transcript]
  );

  const handleSubmitForm = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSendingText) return;
    const msg = inputText;
    setInputText('');
    handleSendMessage(msg);
  };

  const handleToggleVoiceNote = useCallback(async () => {
    if (isRecordingNote && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingNote(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        for (const t of stream.getTracks()) t.stop();
        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const dataUrl = String(reader.result ?? '');
          const base64 = dataUrl.split(',')[1];
          if (!base64) return;
          setIsSendingText(true);
          try {
            const res = await apiFetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64,
                mimeType: blob.type || 'audio/webm',
              }),
            });
            const data = (await res.json()) as { text?: string };
            if (data.text?.trim()) {
              await handleSendMessage(data.text.trim());
            } else {
              setIsSendingText(false);
            }
          } catch {
            setIsSendingText(false);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingNote(true);
    } catch {
      setIsRecordingNote(false);
    }
  }, [apiFetch, handleSendMessage, isRecordingNote]);

  const handleAddMemory = useCallback(
    async (fact: string, category: MemoryCategory) => {
      const res = await apiFetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact, category }),
      });
      if (res.ok) {
        const data = (await res.json()) as { facts: MemoryFact[] };
        setFacts(data.facts ?? []);
      }
    },
    [apiFetch]
  );

  const handleDeleteMemory = useCallback(
    async (index: number) => {
      const res = await apiFetch(`/api/memories/${index}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = (await res.json()) as { facts: MemoryFact[] };
        setFacts(data.facts ?? []);
      }
    },
    [apiFetch]
  );

  const handleAddTask = useCallback(
    async (title: string) => {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const data = (await res.json()) as { tasks: TaskItem[] };
        setTasks(data.tasks ?? []);
      }
    },
    [apiFetch]
  );

  const handleCompleteTask = useCallback(
    async (id: string) => {
      const res = await apiFetch(`/api/tasks/${encodeURIComponent(id)}/complete`, {
        method: 'PATCH',
      });
      if (res.ok) {
        const data = (await res.json()) as { tasks: TaskItem[] };
        setTasks(data.tasks ?? []);
      }
    },
    [apiFetch]
  );

  const handlePasscodeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clean = passcodeInput.trim();
    if (!clean) return;
    setPasscodeError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: clean }),
      });
      if (!res.ok) {
        setPasscodeError('Incorrect passcode.');
        return;
      }
      localStorage.setItem(TOKEN_STORAGE_KEY, clean);
      setAccessToken(clean);
      setAuthorized(true);
      setPasscodeInput('');
    } catch {
      setPasscodeError('Could not verify passcode.');
    }
  };

  const handleLockSession = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore
    }
    if (isLive || isConnecting) {
      liveCall.endCall();
    }
    setOptionsOpen(false);
    setAccessToken('');
    setAuthorized(false);
  }, [isConnecting, isLive, liveCall]);

  const handleToggleLamp = useCallback(() => {
    if (scene === 'off') {
      setScene('lamp');
      setLampOn(true);
      return;
    }
    setLampOn((prev) => !prev);
  }, [scene]);

  const handleSelectScene = useCallback((nextScene: RoomScene) => {
    setScene(nextScene);
    setLampOn(nextScene !== 'off');
  }, []);

  if (authChecking) {
    return (
      <div className="min-h-[100dvh] bg-[#070B16] text-[#A6B0C9] flex items-center justify-center text-sm">
        Connecting...
      </div>
    );
  }

  if (authRequired && !authorized) {
    return (
      <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_50%_20%,#1B1633_0%,#070B16_75%)] text-[#F8F4F6] flex items-center justify-center p-6">
        <form
          onSubmit={handlePasscodeSubmit}
          className="w-full max-w-sm rounded-3xl bg-[#11182D]/90 border border-[#F48FB1]/25 p-6 space-y-4 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-[#F48FB1]/15 flex items-center justify-center text-[#F48FB1]">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-xl font-medium">Luna</h1>
              <p className="text-xs text-[#A6B0C9]">
                Enter your private access passcode
              </p>
            </div>
          </div>

          <input
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder="Access passcode..."
            autoFocus
            className="w-full min-h-[46px] px-4 rounded-xl bg-[#080C1A] border border-white/10 text-sm text-[#F8F4F6] placeholder:text-[#7C88A6] focus:outline-none focus:border-[#F48FB1]"
          />

          {passcodeError && (
            <p className="text-xs text-[#F48FB1]">{passcodeError}</p>
          )}

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#F48FB1] to-[#F3C677] text-[#0B1020] text-sm font-semibold"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  const effectiveLamp = lampOn && scene !== 'off';
  const stageBgStyle = !effectiveLamp
    ? 'bg-[radial-gradient(circle_at_50%_20%,#111629_0%,#060913_68%,#04060D_100%)]'
    : scene === 'moon'
      ? 'bg-[radial-gradient(ellipse_at_20%_10%,#1C254A_0%,#0B1124_52%,#070A16_100%)]'
      : scene === 'dusk'
        ? 'bg-[radial-gradient(ellipse_at_75%_10%,#2B1839_0%,#131830_52%,#070B17_100%)]'
        : 'bg-[radial-gradient(ellipse_at_80%_8%,#2B2032_0%,#121933_48%,#080C19_100%)]';

  const statusLabel =
    liveCall.status === 'reconnecting'
      ? 'Reconnecting'
      : liveCall.status === 'connecting'
        ? 'Connecting'
        : isLive
          ? isLunaSpeaking
            ? 'Speaking'
            : liveCall.muted
              ? 'Muted'
              : 'Listening'
          : isLunaSpeaking
            ? 'Speaking'
            : 'Ready';

  return (
    <div
      onPointerDown={() => {
        if (isLive || isConnecting) liveCall.resumeAudioContexts();
      }}
      className={`min-h-[100dvh] flex flex-col text-[#F8F4F6] pt-safe pb-safe transition-colors duration-700 ${stageBgStyle}`}
    >
      <OfflineIndicator />

      <header className="sticky top-0 z-30 h-14 bg-[#080C18]/70 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <span className="font-display text-xl font-semibold tracking-tight text-[#F8F4F6] whitespace-nowrap shrink-0">
            Luna
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />

            <button
              type="button"
              onClick={handleToggleLamp}
              aria-label={effectiveLamp ? 'Turn room lamp off' : 'Turn room lamp on'}
              title={effectiveLamp ? 'Turn lamp off' : 'Turn lamp on'}
              className={`min-h-[40px] min-w-[40px] px-3 rounded-xl border inline-flex items-center justify-center gap-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                effectiveLamp
                  ? 'bg-[#F3C677]/15 border-[#F3C677]/35 text-[#F3C677]'
                  : 'bg-[#121A30]/80 border-white/10 text-[#A6B0C9] hover:text-[#F8F4F6]'
              }`}
            >
              <Lightbulb className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">
                {effectiveLamp ? 'Lamp' : 'Dim'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setOptionsOpen(true)}
              aria-label="Open atmosphere and voice options"
              className="min-h-[40px] px-3 rounded-xl bg-[#121A30]/80 hover:bg-[#19233D] border border-white/10 text-xs font-medium text-[#F8F4F6] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <SlidersHorizontal
                className="w-3.5 h-3.5 text-[#F48FB1]"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Options</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 lg:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section
          aria-label="Voice Call Stage"
          className="lg:col-span-7 flex flex-col items-center justify-between py-2 lg:py-4"
        >
          <div className="text-center space-y-1">
            <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-[#F8F4F6]">
              Luna
            </h1>
            <p className="text-xs sm:text-sm text-[#A6B0C9]">
              <span className={isLive ? 'text-[#F3C677]' : 'text-[#A6B0C9]'}>
                {statusLabel}
              </span>
              <span aria-hidden="true"> · </span>
              <span>{MODE_LABELS[mode]}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono text-xs">{voiceName}</span>
              {liveCall.mood && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>{liveCall.mood}</span>
                </>
              )}
            </p>
          </div>

          <div className="my-1 w-full flex justify-center">
            <VoiceOrb
              status={isConnecting ? 'connecting' : liveCall.status}
              micLevel={liveCall.micLevel}
              lunaLevel={activeLunaLevel}
              isLunaSpeaking={isLunaSpeaking}
              muted={liveCall.muted}
              scene={scene}
              lampOn={lampOn}
              showCaptions={showCaptions}
              latestUserLine={latestUserLine}
              latestCaption={latestLunaLine}
              onPress={handleToggleCall}
            />
          </div>

          {liveCall.error && (
            <div
              role="alert"
              className="mb-3 px-4 py-2.5 rounded-2xl bg-[#F48FB1]/15 border border-[#F48FB1]/30 text-xs text-[#F8BBD0] text-center max-w-sm"
            >
              {liveCall.error}
            </div>
          )}

          <div className="w-full max-w-lg space-y-3 px-1">
            {/* Next open task focus strip */}
            {nextOpenTask && !isLive && (
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#10172B]/75 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setNotebookTab('tasks');
                    setNotebookOpen(true);
                  }}
                  className="flex items-center gap-2.5 min-w-0 text-left group"
                >
                  <CheckSquare
                    className="w-4 h-4 text-[#F3C677] shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-xs text-[#F8F4F6] truncate group-hover:text-[#F3C677] transition-colors">
                    Next task: {nextOpenTask.title}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSendMessage(
                      `Help me plan my task: ${nextOpenTask.title}`
                    )
                  }
                  disabled={isSendingText}
                  className="text-xs font-medium text-[#F48FB1] hover:underline whitespace-nowrap shrink-0"
                >
                  Discuss
                </button>
              </div>
            )}

            {/* Quick starters */}
            {!isLunaSpeaking && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {QUICK_STARTERS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={isSendingText}
                    onClick={() => handleSendMessage(prompt)}
                    className="min-h-[38px] px-3.5 rounded-xl bg-[#10172B]/80 hover:bg-[#18223F] border border-white/10 text-xs text-[#D5DCEB] hover:text-[#F8F4F6] whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {isLive && (
              <div className="flex items-center justify-center gap-2 text-[11px] text-[#A6B0C9]">
                <span>{liveCall.muted ? 'Mic muted' : 'Mic active'}</span>
                <span className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <span
                    style={{
                      transform: `scaleX(${liveCall.muted ? 0 : Math.max(0.06, liveCall.micLevel)})`,
                    }}
                    className="block w-full h-full origin-left rounded-full bg-[#F3C677] transition-transform duration-75"
                  />
                </span>
              </div>
            )}

            {/* Primary Call Controls */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={
                  isLive
                    ? liveCall.toggleMute
                    : () => setSpeakTextReplies((prev) => !prev)
                }
                aria-label={
                  isLive
                    ? liveCall.muted
                      ? 'Unmute microphone'
                      : 'Mute microphone'
                    : speakTextReplies
                      ? 'Disable spoken text replies'
                      : 'Enable spoken text replies'
                }
                className={`min-h-[52px] min-w-[52px] flex items-center justify-center rounded-2xl border transition-colors ${
                  isLive && liveCall.muted
                    ? 'bg-[#F48FB1]/20 border-[#F48FB1]/40 text-[#F48FB1]'
                    : 'bg-[#10172B]/90 hover:bg-[#19233D] border-white/10 text-[#F8F4F6]'
                }`}
              >
                {isLive ? (
                  liveCall.muted ? (
                    <MicOff className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Mic className="w-5 h-5 text-[#F3C677]" aria-hidden="true" />
                  )
                ) : speakTextReplies ? (
                  <Volume2 className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-5 h-5 text-[#A6B0C9]" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={handleToggleCall}
                className={`flex-1 min-h-[54px] px-6 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-semibold transition-all active:scale-[0.98] whitespace-nowrap ${
                  isLive || isConnecting
                    ? 'bg-[#18213B] hover:bg-[#212D4E] text-[#F8F4F6] border border-white/15'
                    : 'bg-gradient-to-r from-[#F48FB1] to-[#F3C677] hover:brightness-105 text-[#0B1020] shadow-lg shadow-[#F48FB1]/15'
                }`}
              >
                {isLive || isConnecting ? (
                  <>
                    <PhoneOff className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {liveCall.status === 'connecting'
                        ? 'Cancel'
                        : 'End Call'}
                    </span>
                  </>
                ) : (
                  <>
                    <Phone className="w-4 h-4" aria-hidden="true" />
                    <span>Call Luna</span>
                  </>
                )}
              </button>
            </div>

            {/* Clean Quick Navigation Dock (no unread number badges) */}
            <nav
              aria-label="Quick tools"
              className="grid grid-cols-4 lg:grid-cols-3 gap-2 pt-1"
            >
              <button
                type="button"
                onClick={() => setChatDrawerOpen(true)}
                className="lg:hidden min-h-[44px] px-3 rounded-xl bg-[#10172B]/80 hover:bg-[#19233D] border border-white/10 text-xs font-medium text-[#D5DCEB] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <MessageSquare
                  className="w-4 h-4 text-[#F48FB1]"
                  aria-hidden="true"
                />
                <span>Chat</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNotebookTab('tasks');
                  setNotebookOpen(true);
                }}
                className="min-h-[44px] px-3 rounded-xl bg-[#10172B]/80 hover:bg-[#19233D] border border-white/10 text-xs font-medium text-[#D5DCEB] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <CheckSquare
                  className="w-4 h-4 text-[#F3C677]"
                  aria-hidden="true"
                />
                <span>Tasks</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNotebookTab('memories');
                  setNotebookOpen(true);
                }}
                className="min-h-[44px] px-3 rounded-xl bg-[#10172B]/80 hover:bg-[#19233D] border border-white/10 text-xs font-medium text-[#D5DCEB] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <Bookmark
                  className="w-4 h-4 text-[#F48FB1]"
                  aria-hidden="true"
                />
                <span>Memories</span>
              </button>

              <button
                type="button"
                onClick={() => setOptionsOpen(true)}
                className="min-h-[44px] px-3 rounded-xl bg-[#10172B]/80 hover:bg-[#19233D] border border-white/10 text-xs font-medium text-[#D5DCEB] flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <SlidersHorizontal
                  className="w-4 h-4 text-[#A6B0C9]"
                  aria-hidden="true"
                />
                <span>Vibe</span>
              </button>
            </nav>
          </div>
        </section>

        <section
          aria-label="Conversation transcript"
          className="hidden lg:flex lg:col-span-5 flex-col bg-[#10172B]/75 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden max-h-[calc(100dvh-6.75rem)]"
        >
          <ChatPanel
            transcript={transcript}
            inputText={inputText}
            onChangeInput={setInputText}
            onSubmit={handleSubmitForm}
            onClear={() => setTranscript([])}
            onToggleVoiceNote={handleToggleVoiceNote}
            isLive={isLive}
            isSendingText={isSendingText}
            isRecordingNote={isRecordingNote}
            transcriptEndRef={transcriptEndRef}
          />
        </section>
      </main>

      {chatDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Conversation Drawer"
          className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-[#040711]/75 backdrop-blur-sm"
        >
          <div className="w-full h-[84dvh] flex flex-col rounded-t-3xl bg-[#10172B] border-t border-[#F48FB1]/20 overflow-hidden pb-safe shadow-2xl">
            <div className="pt-3 pb-1 flex justify-center shrink-0">
              <span className="w-10 h-1.5 rounded-full bg-white/20" />
            </div>
            <ChatPanel
              transcript={transcript}
              inputText={inputText}
              onChangeInput={setInputText}
              onSubmit={handleSubmitForm}
              onClear={() => setTranscript([])}
              onToggleVoiceNote={handleToggleVoiceNote}
              isLive={isLive}
              isSendingText={isSendingText}
              isRecordingNote={isRecordingNote}
              transcriptEndRef={transcriptEndRef}
              onCloseDrawer={() => setChatDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      <MemoriesSheet
        open={notebookOpen}
        initialTab={notebookTab}
        facts={facts}
        tasks={tasks}
        onClose={() => setNotebookOpen(false)}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        onAddTask={handleAddTask}
        onCompleteTask={handleCompleteTask}
      />

      <OptionsSheet
        open={optionsOpen}
        voiceName={voiceName}
        mode={mode}
        scene={scene}
        lampOn={lampOn}
        showCaptions={showCaptions}
        speakTextReplies={speakTextReplies}
        isCallActive={isLive || isConnecting}
        authRequired={authRequired}
        onClose={() => setOptionsOpen(false)}
        onChangeVoice={setVoiceName}
        onChangeMode={setMode}
        onChangeScene={handleSelectScene}
        onToggleLamp={handleToggleLamp}
        onToggleCaptions={() => setShowCaptions((p) => !p)}
        onToggleSpeakReplies={() => setSpeakTextReplies((p) => !p)}
        onLockSession={handleLockSession}
      />
    </div>
  );
}
