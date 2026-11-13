import { FormEvent, RefObject } from 'react';
import { Mic, MicOff, Send, Trash2, X } from 'lucide-react';
import { TranscriptEntry } from '../types';

interface ChatPanelProps {
  transcript: TranscriptEntry[];
  inputText: string;
  onChangeInput: (val: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClear: () => void;
  onToggleVoiceNote: () => void;
  isLive: boolean;
  isSendingText: boolean;
  isRecordingNote: boolean;
  transcriptEndRef: RefObject<HTMLDivElement | null>;
  onCloseDrawer?: () => void;
}

export function ChatPanel({
  transcript,
  inputText,
  onChangeInput,
  onSubmit,
  onClear,
  onToggleVoiceNote,
  isLive,
  isSendingText,
  isRecordingNote,
  transcriptEndRef,
  onCloseDrawer,
}: ChatPanelProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-display text-base font-medium text-[#F8F4F6]">
            Conversation
          </h2>
          <p className="text-xs text-[#A6B0C9] tabular-nums">
            {transcript.length} {transcript.length === 1 ? 'message' : 'messages'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {transcript.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear conversation"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#A6B0C9] hover:text-[#F48FB1] hover:bg-white/5 transition-colors"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
          {onCloseDrawer && (
            <button
              type="button"
              onClick={onCloseDrawer}
              aria-label="Close chat drawer"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[#A6B0C9] hover:text-[#F8F4F6] hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
        {transcript.length === 0 ? (
          <div className="h-full min-h-[160px] flex items-center justify-center text-center px-6">
            <p className="text-sm text-[#A6B0C9] leading-relaxed max-w-xs">
              Start a voice call or send a message below. Important things you
              share are saved to Luna&apos;s memory automatically.
            </p>
          </div>
        ) : (
          transcript.map((entry) => {
            const isUser = entry.role === 'user';
            return (
              <div
                key={entry.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-[#F48FB1]/18 border border-[#F48FB1]/25 text-[#F8F4F6] rounded-br-md'
                      : 'bg-[#172038] border border-white/10 text-[#F8F4F6] rounded-bl-md'
                  }`}
                >
                  {entry.text}
                </div>

                {entry.toolEvents && entry.toolEvents.length > 0 && (
                  <div className="mt-1 px-1 space-y-0.5">
                    {entry.toolEvents.map((ev, idx) => (
                      <p
                        key={idx}
                        className="text-[11px] font-mono text-[#F3C677]/90"
                      >
                        {ev.name === 'remember'
                          ? `Remembered: ${String(ev.args.fact ?? '')}`
                          : ev.result}
                      </p>
                    ))}
                  </div>
                )}

                <span className="mt-1 px-1 text-[11px] font-mono text-[#7C88A6] tabular-nums">
                  {isUser ? 'You' : 'Luna'} · {entry.timestamp}
                </span>
              </div>
            );
          })
        )}
        <div ref={transcriptEndRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="p-3 border-t border-white/10 bg-[#0B1020]/75 flex items-center gap-2 shrink-0"
      >
        {!isLive && (
          <button
            type="button"
            onClick={onToggleVoiceNote}
            disabled={isSendingText}
            aria-label={isRecordingNote ? 'Stop recording' : 'Record voice note'}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-colors shrink-0 ${
              isRecordingNote
                ? 'bg-[#F48FB1] border-[#F48FB1] text-[#0B1020]'
                : 'bg-white/5 border-white/10 text-[#A6B0C9] hover:text-[#F8F4F6]'
            }`}
          >
            {isRecordingNote ? (
              <MicOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Mic className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        )}

        <input
          type="text"
          value={inputText}
          onChange={(e) => onChangeInput(e.target.value)}
          disabled={isRecordingNote}
          placeholder={
            isRecordingNote
              ? 'Recording... tap mic to send'
              : isLive
                ? 'Send a note during call...'
                : 'Message Luna...'
          }
          className="flex-1 min-w-0 min-h-[44px] px-3.5 rounded-xl bg-[#131A2E] border border-white/10 text-sm text-[#F8F4F6] placeholder:text-[#7C88A6] focus:outline-none focus:border-[#F48FB1]"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isSendingText || isRecordingNote}
          aria-label="Send message"
          className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-[#F48FB1] hover:bg-[#F7A3C0] text-[#0B1020] flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
