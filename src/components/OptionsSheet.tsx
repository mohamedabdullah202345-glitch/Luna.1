import { Lock, Moon, Sparkles, Sun, Sunset, Volume2, X } from 'lucide-react';
import { LunaMode, RoomScene, VoiceName } from '../types';

interface OptionsSheetProps {
  open: boolean;
  voiceName: VoiceName;
  mode: LunaMode;
  scene: RoomScene;
  lampOn: boolean;
  showCaptions: boolean;
  speakTextReplies: boolean;
  isCallActive: boolean;
  authRequired: boolean;
  onClose: () => void;
  onChangeVoice: (voice: VoiceName) => void;
  onChangeMode: (mode: LunaMode) => void;
  onChangeScene: (scene: RoomScene) => void;
  onToggleLamp: () => void;
  onToggleCaptions: () => void;
  onToggleSpeakReplies: () => void;
  onLockSession: () => void;
}

const VOICES: Array<{ name: VoiceName; note: string }> = [
  { name: 'Sulafat', note: 'Warm & sweet' },
  { name: 'Aoede', note: 'Expressive' },
  { name: 'Leda', note: 'Soft & calm' },
  { name: 'Kore', note: 'Clear tone' },
  { name: 'Zephyr', note: 'Light & airy' },
];

const MODES: Array<{ value: LunaMode; label: string; desc: string }> = [
  { value: 'natural', label: 'Natural Mix', desc: 'English + Egyptian words' },
  { value: 'coach', label: 'English Coach', desc: 'Gentle speaking practice' },
  { value: 'study', label: 'Study Buddy', desc: 'Tasks & focus check-ins' },
  { value: 'night', label: 'Late Night', desc: 'Soft & unhurried talk' },
];

const SCENES: Array<{
  value: RoomScene;
  label: string;
  swatch: string;
}> = [
  {
    value: 'lamp',
    label: 'Warm Lamp',
    swatch: 'from-[#F3C677] to-[#E879A0]',
  },
  {
    value: 'moon',
    label: 'Moonlight',
    swatch: 'from-[#93C5FD] to-[#6366F1]',
  },
  {
    value: 'dusk',
    label: 'Sakura Dusk',
    swatch: 'from-[#F48FB1] to-[#7E57C2]',
  },
  {
    value: 'off',
    label: 'Lights Off',
    swatch: 'from-[#334155] to-[#0F172A]',
  },
];

export function OptionsSheet({
  open,
  voiceName,
  mode,
  scene,
  lampOn,
  showCaptions,
  speakTextReplies,
  isCallActive,
  authRequired,
  onClose,
  onChangeVoice,
  onChangeMode,
  onChangeScene,
  onToggleLamp,
  onToggleCaptions,
  onToggleSpeakReplies,
  onLockSession,
}: OptionsSheetProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Customize Luna"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#040711]/75 backdrop-blur-sm sm:p-4"
    >
      <div className="w-full sm:max-w-lg max-h-[88dvh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#10172B] border border-white/12 overflow-hidden pb-safe shadow-2xl">
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <span className="w-10 h-1.5 rounded-full bg-white/20" />
        </div>

        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="font-display text-lg font-medium text-[#F8F4F6]">
              Atmosphere &amp; Voice
            </h2>
            <p className="text-xs text-[#A6B0C9]">
              Adjust lighting, conversation style, and audio
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close options"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#A6B0C9] hover:text-[#F8F4F6] hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Room Lamp & Scene */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-[#F8F4F6]">
                Room Lighting
              </h3>
              <button
                type="button"
                onClick={onToggleLamp}
                className={`min-h-[38px] px-3.5 rounded-xl text-xs font-medium inline-flex items-center gap-2 border transition-colors whitespace-nowrap ${
                  lampOn && scene !== 'off'
                    ? 'bg-[#F3C677]/15 border-[#F3C677]/40 text-[#F3C677]'
                    : 'bg-white/5 border-white/10 text-[#A6B0C9] hover:text-[#F8F4F6]'
                }`}
              >
                {lampOn && scene !== 'off' ? (
                  <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{lampOn && scene !== 'off' ? 'Lamp On' : 'Lamp Off'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {SCENES.map((item) => {
                const active = scene === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onChangeScene(item.value)}
                    className={`min-h-[48px] px-3.5 py-2.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      active
                        ? 'bg-white/10 border-[#F3C677]/50 text-[#F8F4F6]'
                        : 'bg-[#0B1020]/70 border-white/10 text-[#A6B0C9] hover:text-[#F8F4F6] hover:border-white/20'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`w-5 h-5 rounded-full bg-gradient-to-br ${item.swatch} shrink-0`}
                    />
                    <span className="text-xs font-medium whitespace-nowrap">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Conversation Mode */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#F8F4F6]">
                Conversation Mode
              </h3>
              {isCallActive && (
                <span className="text-[11px] text-[#A6B0C9]">
                  Applies on next call
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {MODES.map((m) => {
                const active = mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => onChangeMode(m.value)}
                    className={`min-h-[56px] px-3.5 py-2.5 rounded-2xl border text-left flex flex-col justify-center transition-all ${
                      active
                        ? 'bg-[#F48FB1]/15 border-[#F48FB1]/45 text-[#F8F4F6]'
                        : 'bg-[#0B1020]/70 border-white/10 text-[#A6B0C9] hover:text-[#F8F4F6] hover:border-white/20'
                    }`}
                  >
                    <span className="text-xs font-semibold whitespace-nowrap">
                      {m.label}
                    </span>
                    <span className="text-[11px] text-[#A6B0C9] mt-0.5 truncate">
                      {m.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Voice Selection */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#F8F4F6]">
                Luna&apos;s Voice
              </h3>
              {isCallActive && (
                <span className="text-[11px] text-[#A6B0C9]">
                  End call to switch
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VOICES.map((v) => {
                const active = voiceName === v.name;
                return (
                  <button
                    key={v.name}
                    type="button"
                    disabled={isCallActive}
                    onClick={() => onChangeVoice(v.name)}
                    className={`min-h-[52px] px-3 py-2 rounded-2xl border text-left flex flex-col justify-center transition-all disabled:opacity-50 ${
                      active
                        ? 'bg-[#F3C677]/15 border-[#F3C677]/45 text-[#F8F4F6]'
                        : 'bg-[#0B1020]/70 border-white/10 text-[#A6B0C9] hover:text-[#F8F4F6]'
                    }`}
                  >
                    <span className="text-xs font-semibold">{v.name}</span>
                    <span className="text-[11px] text-[#A6B0C9]">{v.note}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Playback & Captions */}
          <section className="space-y-2.5">
            <h3 className="text-sm font-semibold text-[#F8F4F6]">
              Audio &amp; Display
            </h3>

            <button
              type="button"
              onClick={onToggleCaptions}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#0B1020]/70 border border-white/10 flex items-center justify-between gap-3 text-left hover:border-white/20 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-xs font-medium text-[#F8F4F6]">
                <Sparkles className="w-4 h-4 text-[#F48FB1]" aria-hidden="true" />
                <span>Live subtitles under Luna</span>
              </span>
              <span
                className={`text-xs font-semibold ${
                  showCaptions ? 'text-[#F3C677]' : 'text-[#7C88A6]'
                }`}
              >
                {showCaptions ? 'On' : 'Off'}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleSpeakReplies}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#0B1020]/70 border border-white/10 flex items-center justify-between gap-3 text-left hover:border-white/20 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-xs font-medium text-[#F8F4F6]">
                <Volume2 className="w-4 h-4 text-[#F3C677]" aria-hidden="true" />
                <span>Speak replies in text chat</span>
              </span>
              <span
                className={`text-xs font-semibold ${
                  speakTextReplies ? 'text-[#F3C677]' : 'text-[#7C88A6]'
                }`}
              >
                {speakTextReplies ? 'On' : 'Off'}
              </span>
            </button>

            {authRequired && (
              <button
                type="button"
                onClick={onLockSession}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#0B1020]/70 border border-white/10 flex items-center justify-between gap-3 text-left hover:border-[#F48FB1]/40 transition-colors"
              >
                <span className="flex items-center gap-2.5 text-xs font-medium text-[#F8F4F6]">
                  <Lock className="w-4 h-4 text-[#F48FB1]" aria-hidden="true" />
                  <span>Lock private session</span>
                </span>
                <Sunset className="w-4 h-4 text-[#7C88A6]" aria-hidden="true" />
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
