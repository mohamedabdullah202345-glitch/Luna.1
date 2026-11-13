import { motion } from 'motion/react';
import { CallStatus } from '../hooks/useLiveCall';
import { RoomScene } from '../types';
import { LunaCharacter } from './LunaCharacter';

interface VoiceOrbProps {
  status: CallStatus;
  micLevel: number;
  lunaLevel: number;
  isLunaSpeaking: boolean;
  muted: boolean;
  scene: RoomScene;
  lampOn: boolean;
  showCaptions: boolean;
  latestUserLine?: string;
  latestCaption?: string;
  onPress: () => void;
}

const SAKURA_MOTES = [
  { left: '14%', top: '72%', delay: 0, duration: 7.2, size: 5, gold: false },
  { left: '84%', top: '66%', delay: 1.4, duration: 8.1, size: 4, gold: true },
  { left: '20%', top: '28%', delay: 2.2, duration: 7.6, size: 4, gold: false },
  { left: '78%', top: '24%', delay: 0.8, duration: 6.9, size: 5, gold: false },
  { left: '46%', top: '84%', delay: 2.8, duration: 8.5, size: 4, gold: true },
  { left: '68%', top: '44%', delay: 3.1, duration: 7.3, size: 4, gold: true },
];

const EQ_WEIGHTS = [0.35, 0.62, 0.88, 1, 0.84, 0.94, 0.68, 0.52, 0.3];

export function VoiceOrb({
  status,
  micLevel,
  lunaLevel,
  isLunaSpeaking,
  muted,
  scene,
  lampOn,
  showCaptions,
  latestUserLine,
  latestCaption,
  onPress,
}: VoiceOrbProps) {
  const isLive = status === 'live';
  const isConnecting = status === 'connecting';
  const effectiveLamp = lampOn && scene !== 'off';

  const activeVoice = isLunaSpeaking
    ? Math.max(0.22, lunaLevel)
    : isLive && !muted
      ? micLevel
      : 0;

  const sceneWash =
    !effectiveLamp
      ? 'opacity-15 bg-[radial-gradient(ellipse_at_50%_40%,rgba(148,163,184,0.12)_0%,rgba(11,16,32,0)_72%)]'
      : scene === 'moon'
        ? 'opacity-100 bg-[radial-gradient(ellipse_at_28%_22%,rgba(129,140,248,0.24)_0%,rgba(99,102,241,0.1)_42%,rgba(11,16,32,0)_76%)]'
        : scene === 'dusk'
          ? 'opacity-100 bg-[radial-gradient(ellipse_at_50%_36%,rgba(244,143,177,0.26)_0%,rgba(168,85,247,0.1)_46%,rgba(11,16,32,0)_78%)]'
          : 'opacity-100 bg-[radial-gradient(ellipse_at_72%_18%,rgba(243,198,119,0.26)_0%,rgba(244,143,177,0.14)_44%,rgba(11,16,32,0)_76%)]';

  const lampBeamTint =
    scene === 'moon'
      ? 'from-[#A5B4FC]/28 via-[#818CF8]/10 to-transparent'
      : scene === 'dusk'
        ? 'from-[#F48FB1]/28 via-[#C084FC]/10 to-transparent'
        : 'from-[#F3C677]/32 via-[#F48FB1]/12 to-transparent';

  return (
    <div className="relative w-full flex flex-col items-center justify-center select-none">
      <button
        type="button"
        onClick={onPress}
        aria-label={
          isLive || isConnecting
            ? 'End call with Luna'
            : 'Start voice call with Luna'
        }
        className="relative group w-full max-w-[460px] h-[330px] sm:h-[395px] lg:h-[430px] flex items-end justify-center overflow-visible focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F48FB1]"
      >
        {/* Smooth room lighting atmosphere (never flashes on speech frames) */}
        <span
          aria-hidden="true"
          className={`absolute -inset-x-8 -inset-y-4 transition-all duration-700 ease-out pointer-events-none ${sceneWash}`}
        />

        {/* Soft bedside lamp / moonlight cone */}
        <span
          aria-hidden="true"
          className={`absolute top-2 ${
            scene === 'moon' ? 'left-10' : 'right-10'
          } w-64 h-64 rounded-full bg-gradient-to-b ${lampBeamTint} blur-3xl transition-opacity duration-700 ease-out pointer-events-none ${
            effectiveLamp ? 'opacity-90' : 'opacity-0'
          }`}
        />

        {/* Calm drifting sakura petals & warm dust motes */}
        {SAKURA_MOTES.map((mote, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            style={{
              left: mote.left,
              top: mote.top,
              width: mote.size,
              height: mote.gold ? mote.size : mote.size * 1.35,
            }}
            animate={{
              y: [0, -32, -58],
              x: [0, i % 2 === 0 ? 8 : -8, i % 2 === 0 ? -4 : 5],
              rotate: [0, 40, 85],
              opacity: effectiveLamp ? [0, 0.55, 0] : [0, 0.18, 0],
            }}
            transition={{
              duration: mote.duration,
              delay: mote.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`absolute pointer-events-none transition-opacity duration-700 ${
              mote.gold
                ? scene === 'moon'
                  ? 'rounded-full bg-[#C7D2FE]/80 blur-[0.4px]'
                  : 'rounded-full bg-[#F3C677]/80 blur-[0.4px]'
                : 'rounded-tl-full rounded-br-full bg-[#F8BBD0]/65'
            }`}
          />
        ))}

        {/* Frameless Animated Anime Character */}
        <div
          style={{
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,1) 82%, rgba(0,0,0,0) 100%)',
          }}
          className={`relative z-10 w-[305px] sm:w-[365px] lg:w-[395px] h-[320px] sm:h-[385px] lg:h-[415px] flex items-end justify-center transition-all duration-700 ${
            effectiveLamp ? 'brightness-100' : 'brightness-75 contrast-105'
          }`}
        >
          <LunaCharacter
            status={status}
            lunaLevel={lunaLevel}
            micLevel={micLevel}
            isLunaSpeaking={isLunaSpeaking}
            muted={muted}
          />
        </div>

        {/* Clean calm acoustic bars */}
        <div
          aria-hidden="true"
          className="absolute bottom-1 z-30 flex items-center gap-1.5 h-6 pointer-events-none"
        >
          {EQ_WEIGHTS.map((weight, idx) => {
            const barScale =
              isLunaSpeaking || (isLive && !muted)
                ? 0.2 + activeVoice * weight * 0.95
                : isConnecting
                  ? 0.34 + (idx % 2) * 0.22
                  : 0.16;
            return (
              <span
                key={idx}
                style={{
                  transform: `scaleY(${Math.min(1.12, Math.max(0.16, barScale))})`,
                }}
                className={`w-1 h-5 rounded-full origin-center transition-transform duration-100 ${
                  isLunaSpeaking
                    ? 'bg-gradient-to-t from-[#F48FB1] to-[#F3C677]'
                    : isLive && !muted
                      ? 'bg-[#F3C677]/90'
                      : 'bg-white/20'
                }`}
              />
            );
          })}
        </div>
      </button>

      {/* Spacious, crisp subtitles directly beneath Luna */}
      {showCaptions && (
        <div className="mt-2.5 px-4 w-full max-w-lg text-center space-y-1 min-h-[52px]">
          {latestUserLine && isLive && (
            <p className="text-xs text-[#A6B0C9] truncate">
              You: {latestUserLine}
            </p>
          )}
          {latestCaption ? (
            <p className="text-[15px] sm:text-base text-[#F8F4F6] leading-relaxed">
              “{latestCaption}”
            </p>
          ) : (
            <p className="text-sm text-[#A6B0C9]">
              {isConnecting
                ? 'Connecting to Luna...'
                : isLive
                  ? 'Listening for your voice...'
                  : 'Tap Luna or Call to start talking'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
