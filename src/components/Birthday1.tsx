import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import {
  Birthday1Data,
  CANDLE_DOLLS_MEDIA,
  MUSIC_PLAYER_UI,
  MemoryItem,
  NoteItem,
  buildBilingualData,
  daysSince,
  getAsset,
  localNum,
} from '../data/birthday1Data';
import { type CardConfigPayload, DEFAULT_CARD_CONFIG } from '../data/cardDefaults';
import {
  playSfx,
  playWhenReady,
  playWithFadeIn,
  startPenSound,
  stopPenSound,
  unlockAudio,
  vibrate,
} from '../utils/sound';
import AdminModal from './AdminModal';

function spawnPetal(container: HTMLElement | null, opts: { cls?: string; size?: number; dur?: number; delay?: number } = {}) {
  if (!container) return;
  const img = document.createElement('img');
  img.src = getAsset('petal');
  img.className = opts.cls ?? 'amb-petal';
  img.alt = '';

  const width = container.clientWidth;
  const height = container.clientHeight;
  const size = (opts.size ?? 20) * (0.7 + 0.6 * Math.random());
  img.style.width = `${size}px`;
  img.style.left = `${Math.random() * width}px`;
  container.appendChild(img);

  const sway = 30 + 50 * Math.random();
  const rot = (Math.random() - 0.5) * 720;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= 6; i++) {
    frames.push({
      transform: `translate(${Math.sin(1.3 * i) * sway}px, ${((height + 80) * i) / 6}px) rotate(${(rot * i) / 6}deg) rotateX(${50 * i}deg)`,
      opacity: i === 6 ? 0.6 : 0.95,
    });
  }

  img.animate(frames, {
    duration: opts.dur ?? 9000 + 4000 * Math.random(),
    delay: opts.delay ?? 0,
    easing: 'linear',
    fill: 'both',
  }).onfinish = () => img.remove();
}

function useRevealOnce<T extends HTMLElement>(threshold: number, onReveal?: (el: T) => void) {
  const ref = useRef<T | null>(null);
  const cbRef = useRef(onReveal);
  useEffect(() => {
    cbRef.current = onReveal;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          if (cbRef.current) {
            cbRef.current(el);
          } else {
            el.classList.add('in');
          }
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      {on ? (
        <path
          d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M16 9l5 6M21 9l-5 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function MusicPlayer({
  music,
  audioRef,
  playing,
  lang,
}: {
  music: Birthday1Data['music'];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  playing: boolean;
  lang: 'bn' | 'en';
}) {
  const ui = MUSIC_PLAYER_UI[lang];
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={`music ${open ? 'is-open' : ''}`}>
      {open && (
        <div className="music__panel" id={panelId}>
          <button
            type="button"
            className="music__play"
            onClick={() => {
              const audio = audioRef.current;
              if (!audio) return;
              if (audio.paused) {
                audio.play().catch(() => {});
              } else {
                audio.pause();
              }
            }}
            aria-pressed={playing}
            aria-label={playing ? ui.pauseMusic : ui.playMusic}
          >
            {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
          </button>
          <div className="music__info">
            <p className="music__title">{music.title || ui.nowPlaying}</p>
            {music.artist && <p className="music__artist">{music.artist}</p>}
            {music.credit && <p className="music__credit">{music.credit}</p>}
          </div>
        </div>
      )}
      <button
        type="button"
        className="music__icon"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? ui.hideMusic : ui.showMusic}
      >
        <SpeakerIcon on={playing} />
      </button>
    </div>
  );
}

function IntroStage({
  d,
  still,
  onOpen,
  onDone,
}: {
  d: Birthday1Data;
  still: boolean;
  onOpen: () => void;
  onDone: () => void;
}) {
  const ui = d.ui;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const coverVidRef = useRef<HTMLVideoElement | null>(null);
  const pullZoneRef = useRef<HTMLDivElement | null>(null);
  const pullArrowRef = useRef<HTMLSpanElement | null>(null);
  const meterRef = useRef<SVGCircleElement | null>(null);
  const heartsRef = useRef<HTMLDivElement | null>(null);
  const petalFallRef = useRef<HTMLDivElement | null>(null);

  const [coverState, setCoverState] = useState({
    ready: false,
    opened: false,
    push: false,
    on: true,
    tapLink: false,
  });
  const [wishOn, setWishOn] = useState(false);
  const [started, setStarted] = useState(false);
  const [layer, setLayer] = useState({ intro: false, reveal: false, blow: false });
  const [blowUiOn, setBlowUiOn] = useState(false);
  const [micState, setMicState] = useState<'off' | 'offer' | 'live'>('off');
  const [pressing] = useState(false);
  const [going, setGoing] = useState(false);

  const coverPhaseRef = useRef<'idle' | 'open'>('idle');
  const wishPhaseRef = useRef<'idle' | 'reveal' | 'wish' | 'blown'>('idle');
  const holdPressedRef = useRef(false);
  const tapTriggeredRef = useRef(false);
  const progressRef = useRef(0);
  const rafRef = useRef(0);
  const micRef = useRef<{ stream: MediaStream; analyser: AnalyserNode } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const timersRef = useRef<number[]>([]);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    scheduleTimer(() => setCoverState((s) => ({ ...s, ready: true })), 250);
    scheduleTimer(() => setCoverState((s) => ({ ...s, tapLink: true })), 3000);
    const timers = timersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      cancelAnimationFrame(rafRef.current);
      micRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, [scheduleTimer]);

  useLayoutEffect(() => {
    const positionPullZone = () => {
      const stage = stageRef.current;
      const zone = pullZoneRef.current;
      if (!stage || !zone) return;
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const scale = Math.max(w / 720, h / 1280);
      zone.style.top = `${(h - 1280 * scale) / 2 + 633.6 * scale - zone.offsetHeight / 2}px`;
    };
    positionPullZone();
    window.addEventListener('resize', positionPullZone);
    return () => window.removeEventListener('resize', positionPullZone);
  }, []);

  function openCover() {
    if (coverPhaseRef.current !== 'idle') return;
    coverPhaseRef.current = 'open';
    unlockAudio();
    playSfx('ribbon');
    onOpen();
    setCoverState((s) => ({ ...s, opened: true }));

    let done = false;
    const finishCover = () => {
      if (done) return;
      done = true;
      setCoverState((s) => ({ ...s, push: true }));
      scheduleTimer(() => {
        setWishOn(true);
        setCoverState((s) => ({ ...s, on: false }));
        playSfx('paper');
      }, 650);
      scheduleTimer(() => coverVidRef.current?.pause(), 1500);
      setLayer({ intro: true, reveal: false, blow: false });
    };

    const vid = coverVidRef.current;
    if (still || !vid) {
      scheduleTimer(finishCover, 700);
      return;
    }

    playWhenReady(vid).catch(finishCover);
    const onTimeUpdate = () => {
      if (vid.duration && vid.currentTime > vid.duration - 0.9) {
        vid.removeEventListener('timeupdate', onTimeUpdate);
        finishCover();
      }
    };
    vid.addEventListener('timeupdate', onTimeUpdate);
    vid.addEventListener('ended', finishCover, { once: true });
    vid.addEventListener('error', finishCover, { once: true });
    scheduleTimer(() => playSfx('paper'), 2600);
    scheduleTimer(finishCover, 7500);
  }

  function burstHearts() {
    const container = heartsRef.current;
    if (still || !container) return;
    for (let i = 0; i < 9; i++) {
      const el = document.createElement('i');
      el.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="currentColor"/></svg>';
      container.appendChild(el);
      const dx = (Math.random() - 0.5) * 220;
      const dy = -160 - 140 * Math.random();
      const sc = 0.6 + 0.9 * Math.random();
      el.animate(
        [
          { transform: 'translate(-50%,0) scale(.2)', opacity: 0 },
          { opacity: 1, offset: 0.25 },
          { transform: `translate(calc(-50% + ${dx}px), ${dy}px) scale(${sc}) rotate(${dx / 8}deg)`, opacity: 0 },
        ],
        {
          duration: 1800 + 700 * Math.random(),
          delay: 90 * i,
          easing: 'cubic-bezier(.2,.6,.3,1)',
          fill: 'both',
        }
      ).onfinish = () => el.remove();
    }
  }

  function finishWishStage() {
    playSfx('paper');
    if (d.petals && !still) {
      for (let i = 0; i < 20; i++) {
        spawnPetal(petalFallRef.current, {
          cls: '',
          size: 24,
          dur: 1900 + 900 * Math.random(),
          delay: 600 * Math.random(),
        });
      }
    }
    scheduleTimer(() => {
      coverVidRef.current?.pause();
      onDone();
    }, still ? 600 : 2400);
  }

  function triggerBlowOut() {
    wishPhaseRef.current = 'blown';
    cancelAnimationFrame(rafRef.current);
    setBlowUiOn(false);
    micRef.current?.stream.getTracks().forEach((t) => t.stop());
    micRef.current = null;
    playSfx('blow');
    vibrate(20);

    let finished = false;
    const onBlownDone = () => {
      if (finished) return;
      finished = true;
      scheduleTimer(finishWishStage, still ? 500 : 900);
    };

    scheduleTimer(burstHearts, 800);
    setLayer((l) => ({ ...l, blow: true }));
    scheduleTimer(() => setLayer((l) => ({ ...l, reveal: false, intro: false })), still ? 50 : 400);
    scheduleTimer(onBlownDone, still ? 800 : 1800);
  }

  function enterWishBlowLoop() {
    if (wishPhaseRef.current !== 'reveal') return;
    wishPhaseRef.current = 'wish';
    setBlowUiOn(true);
    if (d.mic && typeof navigator.mediaDevices?.getUserMedia === 'function') {
      setMicState('offer');
    }

    let lastTime = -1;
    const samples = new Float32Array(1024);

    const tick = (now: number) => {
      if (lastTime < 0) lastTime = now;
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      let rms = 0;
      if (micRef.current) {
        micRef.current.analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          sum += samples[i] * samples[i];
        }
        rms = Math.sqrt(sum / samples.length);
      }

      const delta = tapTriggeredRef.current
        ? dt / 0.7
        : holdPressedRef.current || rms > 0.09
          ? dt / 1.25
          : -dt / 1.6;

      progressRef.current = Math.max(0, Math.min(1, progressRef.current + delta));
      if (meterRef.current) {
        meterRef.current.style.strokeDashoffset = String(276.5 * (1 - progressRef.current));
      }

      if (progressRef.current >= 1) {
        triggerBlowOut();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function triggerTapBlow() {
    if (wishPhaseRef.current === 'wish') {
      unlockAudio();
      tapTriggeredRef.current = true;
      setGoing(true);
    }
  }

  function handlePolaroidClick() {
    if (wishPhaseRef.current === 'wish') {
      triggerTapBlow();
      return;
    }
    if (wishPhaseRef.current !== 'idle' || !wishOn) return;
    wishPhaseRef.current = 'reveal';
    setStarted(true);
    unlockAudio();

    let done = false;
    const onRevealEnd = () => {
      if (done) return;
      done = true;
      enterWishBlowLoop();
    };

    setLayer((l) => ({ ...l, reveal: true }));
    scheduleTimer(() => {
      setLayer((l) => ({ ...l, intro: false }));
    }, still ? 50 : 650);
    scheduleTimer(onRevealEnd, still ? 550 : 1300);
  }

  async function enableMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false },
      });
      const ctx = unlockAudio();
      if (!ctx) throw new Error('no audio');
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      micRef.current = { stream, analyser };
      setMicState('live');
    } catch {
      setMicState('off');
    }
  }

  return (
    <div ref={stageRef} className="stage">
      <section
        className={`scene sc-cover ${coverState.on ? 'on' : ''} ${coverState.ready ? 'ready' : ''} ${
          coverState.opened ? 'opened' : ''
        } ${coverState.push ? 'push' : ''}`}
        aria-label={ui.coverFor}
      >
        {still ? (
          <img
            className="full"
            src={getAsset(coverState.opened ? 'cover-end' : 'cover')}
            alt=""
          />
        ) : (
          <video
            ref={coverVidRef}
            className="full"
            src={getAsset('cover-open')}
            muted
            playsInline
            preload="auto"
            poster={getAsset('cover')}
            aria-hidden="true"
          />
        )}
        <h1 className="cover-for">{ui.coverFor}</h1>
        <div
          ref={pullZoneRef}
          className="pull-zone"
          role="button"
          tabIndex={0}
          aria-label={ui.pull}
          onPointerDown={(e) => {
            dragStartRef.current = { x: e.clientX, y: e.clientY };
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // ignore
            }
            unlockAudio();
          }}
          onPointerMove={(e) => {
            if (!dragStartRef.current) return;
            const dx = e.clientX - dragStartRef.current.x;
            if (pullArrowRef.current) {
              pullArrowRef.current.style.transform = `translateX(${Math.max(-40, Math.min(60, dx))}px)`;
            }
            if (Math.abs(dx) > 55) {
              dragStartRef.current = null;
              openCover();
            }
          }}
          onPointerUp={(e) => {
            const start = dragStartRef.current;
            dragStartRef.current = null;
            if (pullArrowRef.current) {
              pullArrowRef.current.style.transform = '';
            }
            if (start && Math.abs(e.clientX - start.x) < 8 && Math.abs(e.clientY - start.y) < 8) {
              openCover();
            }
          }}
          onPointerCancel={() => {
            dragStartRef.current = null;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openCover();
            }
          }}
        >
          <span ref={pullArrowRef} className="pull-arrow" aria-hidden="true" />
        </div>
        <div className="cover-hint">
          <p className="hand-hint">{ui.pull}</p>
          <button
            type="button"
            className={`soft-link ${coverState.tapLink ? 'on' : ''}`}
            onClick={openCover}
            tabIndex={coverState.tapLink ? 0 : -1}
          >
            {ui.orTap}
          </button>
        </div>
      </section>

      <section
        className={`scene sc-wish clear ${wishOn ? 'on' : ''} ${started ? 'started' : ''} tapmode`}
        aria-label={ui.wishTop}
      >
        <p className="wish-top">{ui.wishTop}</p>
        <div className="pola-big" onClick={handlePolaroidClick}>
          <div className="pola-win">
            <img
              className={`v-intro ${layer.intro ? 'on' : ''}`}
              src={CANDLE_DOLLS_MEDIA.intro}
              alt=""
              draggable={false}
            />
            <img
              className={`v-reveal ${layer.reveal ? 'on' : ''}`}
              src={CANDLE_DOLLS_MEDIA.reveal}
              alt=""
              draggable={false}
            />
            <img
              className={`v-blow ${layer.blow ? 'on' : ''}`}
              src={CANDLE_DOLLS_MEDIA.blown}
              alt=""
              draggable={false}
            />
            <div className={`candle-aura ${(layer.intro || layer.reveal) && !layer.blow ? 'on' : ''}`} aria-hidden="true" />
          </div>
          <img className="pola-frame" src={getAsset('polaroid')} alt="" draggable={false} />
          <div ref={heartsRef} className="hearts" />
        </div>

        <button
          type="button"
          className="hand-hint wish-hint"
          onClick={handlePolaroidClick}
          tabIndex={started ? -1 : 0}
        >
          {ui.touchPhoto}
        </button>

        <div className={`blow-ui ${blowUiOn ? 'on' : ''}`}>
          <p className="wish-note">{ui.makeWish}</p>
          <button
            type="button"
            className={`hold ${pressing ? 'pressing' : ''} ${going ? 'going' : ''}`}
            aria-label={ui.tapGo}
            tabIndex={blowUiOn ? 0 : -1}
            onPointerDown={(e) => {
              e.preventDefault();
              triggerTapBlow();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // ignore
              }
            }}
            onPointerUp={() => {}}
            onPointerCancel={() => {}}
            onLostPointerCapture={() => {}}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                triggerTapBlow();
              }
            }}
          >
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle className="track" cx="50" cy="50" r="44" />
              <circle ref={meterRef} className="meter" cx="50" cy="50" r="44" />
            </svg>
            <span className="puff" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <path
                  d="M8 20h20a6 6 0 1 0-6-6M6 28h28a6 6 0 1 1-6 6M10 24h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </button>
          <p className="hold-label" aria-hidden="true">
            {ui.tapGo}
          </p>
          {micState !== 'off' && (
            <button
              type="button"
              className="soft-link"
              onClick={enableMic}
              disabled={micState === 'live'}
              tabIndex={blowUiOn ? 0 : -1}
            >
              {micState === 'live' ? ui.micLive : ui.micBlow}
            </button>
          )}
        </div>
      </section>

      <div ref={petalFallRef} className="petal-fall" aria-hidden="true" />
    </div>
  );
}

function ScrollHint({ label }: { label: string }) {
  const reduced = useReducedMotion();
  return (
    <button
      type="button"
      className="hint"
      onClick={(e) => {
        const next = e.currentTarget.closest('.sec')?.nextElementSibling;
        next?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      }}
    >
      <span className="mouse" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

const TITLE_STEPS: Array<[string, number]> = [
  ['bow', 250],
  ['for', 650],
  ['happy', 900],
  ['box', 900],
  ['ded', 2500],
  ['under', 3200],
  ['name', 3500],
  ['meta', 3850],
  ['bn', 4150],
  ['seal', 4600],
];

function TitleSection({ d, start, instant }: { d: Birthday1Data; start: boolean; instant: boolean }) {
  const [shown, setShown] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!start) return;
    const timers = TITLE_STEPS.map(([key, delay]) =>
      window.setTimeout(() => {
        setShown((prev) => new Set(prev).add(key));
        if (key === 'seal' && !instant) {
          playSfx('stamp');
        }
      }, instant ? 0 : delay)
    );
    return () => timers.forEach(window.clearTimeout);
  }, [start, instant]);

  const cls = (k: string) => (shown.has(k) ? ' in' : '');
  const ui = d.ui;

  return (
    <section className={`sec s-title${shown.has('box') ? ' in-title' : ''}`}>
      <img className={`t-bow${cls('bow')}`} src={getAsset('bow')} alt="" aria-hidden="true" />
      <div className="t-stamp" aria-hidden="true">
        <img src={getAsset('stamp')} alt="" />
        <span>{d.shortDate}</span>
      </div>
      <div className="title-box">
        {d.from && <p className={`t-for st${cls('for')}`}>{ui.forYou}</p>}
        <h1 className={`t-happy${cls('happy')}`}>{ui.happy}</h1>
        {d.dedication && <p className={`t-ded${cls('ded')}`}>{d.dedication}</p>}
        <svg className={`t-under${cls('under')}`} viewBox="0 0 300 26" aria-hidden="true">
          <path
            pathLength={1}
            d="M6 16 C 60 6, 110 22, 160 12 S 250 6, 280 14 M268 6 c 6 -8 18 -2 10 8 l -6 6 l -7 -6 c -8 -9 3 -15 9 -8"
          />
        </svg>
        <p className={`t-name st${cls('name')}`}>{d.name}</p>
        {d.meta && <p className={`t-meta st${cls('meta')}`}>{d.meta}</p>}
        {d.bnDate && <p className={`t-bn st${cls('bn')}`}>{d.bnDate}</p>}
      </div>
      <img className={`t-seal st${cls('seal')}`} src={getAsset('seal')} alt="" aria-hidden="true" />
      <ScrollHint label={ui.scroll} />
    </section>
  );
}

const MEM_ROTATIONS = [-3, 2.5, -1.5, 3, -2.5, 2, -3.5, 1.5];

function MemoryCard({
  m,
  i,
  onClick,
  innerRef,
}: {
  m: MemoryItem;
  i: number;
  onClick?: () => void;
  innerRef?: (el: HTMLButtonElement | null) => void;
}) {
  const style = {
    '--r': `${MEM_ROTATIONS[i % 8]}deg`,
    '--y': `${i % 2 ? 26 : 0}px`,
    '--tr': `${i % 2 ? 7 : -6}deg`,
  } as React.CSSProperties;

  const content = (
    <>
      {i === 0 ? (
        <img className="clip" src={getAsset('clip')} alt="" aria-hidden="true" />
      ) : (
        <img className="wt" src={getAsset(i % 2 ? 'washi2' : 'washi1')} alt="" aria-hidden="true" />
      )}
      <img className="ph" src={m.src} alt={m.caption} loading="lazy" draggable={false} />
      <span className="cap-box">
        {m.caption && <span className="cap">{m.caption}</span>}
        {m.date && <span className="date">{m.date}</span>}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button ref={innerRef} type="button" className="mem" style={style} data-i={i} onClick={onClick}>
        {content}
      </button>
    );
  }
  return (
    <figure className="mem in" style={style}>
      {content}
    </figure>
  );
}

function MemoriesSection({
  d,
  openLightbox,
  hint,
}: {
  d: Birthday1Data;
  openLightbox: (node: React.ReactNode) => void;
  hint: React.ReactNode;
}) {
  const ui = d.ui;
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const postmarkRef = useRef<SVGSVGElement | null>(null);
  const stampCardRef = useRevealOnce<HTMLDivElement>(0.7, () => {
    window.setTimeout(() => {
      postmarkRef.current?.classList.add('hit');
      playSfx('stamp');
      vibrate(25);
    }, 650);
  });

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          io.unobserve(el);
          window.setTimeout(() => {
            el.classList.add('in');
            playSfx('paper');
          }, (Number(el.dataset.i) % 2) * 160);
        });
      },
      { threshold: 0.25 }
    );
    cardRefs.current.forEach((el) => {
      if (el && !el.classList.contains('in')) io.observe(el);
    });
    return () => io.disconnect();
  }, [d.memories]);

  return (
    <section className="sec s-memories">
      <header className="head rv">
        <h2>{ui.memTitle}</h2>
        {d.memories.length > 0 && <p>{ui.memSub}</p>}
      </header>
      {d.memories.length > 0 && (
        <div className="spread">
          {d.memories.slice(0, 8).map((m, idx) => (
            <MemoryCard
              key={idx}
              m={m}
              i={idx}
              innerRef={(el) => {
                cardRefs.current[idx] = el;
              }}
              onClick={() => {
                playSfx('paper');
                openLightbox(<MemoryCard m={m} i={idx} />);
              }}
            />
          ))}
        </div>
      )}
      {d.togetherSince && (
        <div ref={stampCardRef} className="stamp-card rv">
          <img src={getAsset('stamp')} alt="" />
          <div className="stamp-band">
            <span className="num">{localNum(daysSince(d.togetherSince), d.lang)}</span>
            <span>{ui.togTxt}</span>
          </div>
          <svg ref={postmarkRef} className="postmark" viewBox="0 0 220 120" aria-hidden="true">
            <g fill="none" stroke="currentColor">
              <circle cx="60" cy="60" r="50" strokeWidth="3" />
              <circle cx="60" cy="60" r="40" strokeWidth="1.5" />
              <path
                d="M118 38 q 12 -8 24 0 t 24 0 t 24 0 t 24 0 M118 60 q 12 -8 24 0 t 24 0 t 24 0 t 24 0 M118 82 q 12 -8 24 0 t 24 0 t 24 0 t 24 0"
                strokeWidth="3"
              />
            </g>
            <text x="60" y="66" textAnchor="middle" fill="currentColor">
              {d.shortDate}
            </text>
          </svg>
        </div>
      )}
      {hint}
    </section>
  );
}

const LETTER_AREA = { x: 0.17, y: 0.31, w: 0.62, h: 0.38 };
const waitMs = (ms: number) => new Promise<void>((res) => window.setTimeout(res, ms));

function LetterWriting({
  d,
  still,
  openAtStart,
  scroller,
}: {
  d: Birthday1Data;
  still: boolean;
  openAtStart: boolean;
  scroller: () => HTMLDivElement | null;
}) {
  const ui = d.ui;
  const pageRef = useRef<HTMLDivElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const areaRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLHeadingElement | null>(null);
  const envWrapRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const inkRef = useRef<HTMLDivElement | null>(null);
  const nibRef = useRef<HTMLImageElement | null>(null);

  const [envState, setEnvState] = useState<'sealed' | 'cracked' | 'away' | 'gone'>(
    openAtStart ? 'gone' : 'sealed'
  );
  const [showSkip, setShowSkip] = useState(false);

  const phaseRef = useRef<'sealed' | 'opening' | 'writing' | 'done'>(openAtStart ? 'done' : 'sealed');
  const rafRef = useRef(0);
  const sizeCacheRef = useRef({ w: 0, vh: 0 });
  const prevAreaWidthRef = useRef(0);
  const relayoutRef = useRef<() => void>(() => {});

  const layout = useCallback(() => {
    const page = pageRef.current;
    const bgImg = bgImgRef.current;
    const area = areaRef.current;
    const head = headRef.current;
    if (!page || !bgImg || !area || !head) return;

    const w = page.clientWidth;
    if (!w) return;
    if (sizeCacheRef.current.w !== w) {
      sizeCacheRef.current = { w, vh: scroller()?.clientHeight || window.innerHeight };
    }
    const vh = sizeCacheRef.current.vh;
    const contentH =
      (envWrapRef.current && phaseRef.current === 'sealed'
        ? envWrapRef.current.offsetHeight
        : sheetRef.current?.offsetHeight ?? 0) + 24;

    const baseH = Math.max(Math.min(vh, ((1200 * w) / 896) * 1.25), (1200 * w) / 896);
    const scale = Math.max(w / 896, baseH / 1200);
    const imgW = 896 * scale;
    const imgH = 1200 * scale;
    const imgX = (w - imgW) / 2;
    const imgY = (baseH - imgH) / 2;

    const areaTop = imgY + LETTER_AREA.y * imgH;
    const areaH = Math.max(LETTER_AREA.h * imgH, contentH);
    const totalH = Math.max(baseH, areaTop + areaH + (baseH - (imgY + (LETTER_AREA.y + LETTER_AREA.h) * imgH)));
    const fullScale = Math.max(w / 896, totalH / 1200);
    const fullW = 896 * fullScale;
    const fullH = 1200 * fullScale;

    page.style.height = `${totalH}px`;
    Object.assign(bgImg.style, {
      left: `${(w - fullW) / 2}px`,
      top: `${(totalH - fullH) / 2}px`,
      width: `${fullW}px`,
      height: `${fullH}px`,
    });

    const sideMargin = Math.max(16, imgX + LETTER_AREA.x * imgW, w - (imgX + (LETTER_AREA.x + LETTER_AREA.w) * imgW));
    const areaW = w - 2 * sideMargin;
    Object.assign(area.style, {
      left: `${sideMargin}px`,
      top: `${areaTop}px`,
      width: `${areaW}px`,
      height: `${areaH}px`,
    });

    if (
      phaseRef.current !== 'writing' &&
      prevAreaWidthRef.current &&
      Math.abs(prevAreaWidthRef.current - areaW) > 1
    ) {
      relayoutRef.current();
      return;
    }

    const headMaxW = Math.min(0.34 * imgW, w - 40);
    head.style.top = `${imgY + 0.17 * imgH}px`;
    head.style.left = `${Math.min(Math.max(imgX + 0.575 * imgW, headMaxW / 2 + 20), w - headMaxW / 2 - 20)}px`;
    head.style.fontSize = '';
    let fs = parseFloat(getComputedStyle(head).fontSize);
    while (head.scrollWidth > headMaxW && fs > 18) {
      fs -= 1;
      head.style.fontSize = `${fs}px`;
    }
  }, [scroller]);

  const buildInkLines = useCallback(() => {
    const ink = inkRef.current;
    if (!ink) return;
    const letter = d.letter;
    const blocks: Array<{ cls: string; text: string; gap?: boolean; nowrap?: boolean }> = [
      { cls: 'greet', text: letter.greeting },
      ...letter.paragraphs.map((p) => ({ cls: '', text: p, gap: true })),
      { cls: 'sig', text: letter.signoff, gap: true, nowrap: true },
      { cls: 'sig name', text: letter.signature, nowrap: true },
    ];

    ink.classList.remove('writing');
    ink.replaceChildren();
    prevAreaWidthRef.current = areaRef.current?.clientWidth ?? 0;

    const makeLine = (cls: string, text: string) => {
      const span = document.createElement('span');
      span.className = `ln ${cls}`.trim();
      const inner = document.createElement('span');
      inner.textContent = text;
      span.appendChild(inner);
      return span;
    };

    for (const blk of blocks) {
      if (!blk.text) continue;
      if (blk.gap) {
        const gapEl = document.createElement('span');
        gapEl.className = 'gap';
        ink.appendChild(gapEl);
      }
      if (blk.nowrap) {
        ink.appendChild(makeLine(blk.cls, blk.text));
        continue;
      }

      const probe = document.createElement('p');
      probe.style.margin = '0';
      probe.className = blk.cls;
      const wordSpans: HTMLSpanElement[] = [];

      blk.text.split(/(\s+)/).forEach((part) => {
        if (/^\s+$/.test(part)) {
          probe.appendChild(document.createTextNode(part));
        } else if (part) {
          const wSpan = document.createElement('span');
          wSpan.textContent = part;
          wordSpans.push(wSpan);
          probe.appendChild(wSpan);
        }
      });
      ink.appendChild(probe);

      const lines: string[] = [];
      let currentWords: string[] = [];
      let lastTop: number | null = null;
      for (const wSpan of wordSpans) {
        const top = wSpan.offsetTop;
        if (lastTop !== null && top - lastTop > 4) {
          lines.push(currentWords.join(' '));
          currentWords = [];
        }
        lastTop = top;
        currentWords.push(wSpan.textContent ?? '');
      }
      if (currentWords.length) lines.push(currentWords.join(' '));
      lines.forEach((lineText) => ink.insertBefore(makeLine(blk.cls, lineText), probe));
      probe.remove();
    }

    if (phaseRef.current === 'done' || still) {
      finishWritingInstant();
    } else {
      ink.classList.add('writing');
    }
  }, [d.letter, still]);

  function getLineNodes() {
    return Array.from(inkRef.current?.querySelectorAll<HTMLElement>('.ln') ?? []);
  }

  function finishWritingInstant() {
    cancelAnimationFrame(rafRef.current);
    phaseRef.current = 'done';
    stopPenSound();
    getLineNodes().forEach((ln) => {
      ln.classList.add('done');
      ln.style.clipPath = '';
    });
    inkRef.current?.classList.remove('writing');
    nibRef.current?.classList.remove('on');
    setShowSkip(false);
    window.setTimeout(layout, 0);
  }

  function startWriting() {
    if (still) {
      finishWritingInstant();
      return;
    }
    const ink = inkRef.current;
    const nib = nibRef.current;
    if (!ink || !nib) return;

    phaseRef.current = 'writing';
    nib.classList.add('on');
    const lines = getLineNodes();
    const nibW = nib.offsetWidth;
    const nibH = nib.offsetHeight;

    const writeLine = (idx: number) => {
      if (phaseRef.current !== 'writing') return;
      if (idx >= lines.length) {
        phaseRef.current = 'done';
        nib.classList.remove('on');
        stopPenSound();
        setShowSkip(false);
        ink.classList.remove('writing');
        layout();
        return;
      }

      const ln = lines[idx];
      const textWidth = Math.max(10, (ln.firstElementChild as HTMLElement).offsetWidth);
      const isSig = ln.classList.contains('sig');
      const isName = ln.classList.contains('name');
      const startOffset = isSig ? ln.offsetWidth - textWidth : 0;
      const baseX = ink.offsetLeft + ln.offsetLeft + startOffset;
      const baseY = ink.offsetTop + ln.offsetTop + 0.82 * ln.offsetHeight;
      const duration = Math.max(800, textWidth * (isName ? 11 : 9));
      const startedAt = performance.now();

      startPenSound();

      const step = (now: number) => {
        if (phaseRef.current !== 'writing') return;
        const p = Math.min(1, (now - startedAt) / duration);
        const rightClip = Math.max(0, 100 - ((startOffset + p * textWidth) / ln.offsetWidth) * 100);
        ln.style.clipPath = `inset(-20% ${rightClip}% -20% 0)`;
        nib.style.transform = `translate(${baseX + p * textWidth - 0.002 * nibW}px, ${
          baseY - 0.979 * nibH + 1.5 * Math.sin(now / 45)
        }px)`;

        if (p < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          ln.classList.add('done');
          ln.style.clipPath = '';
          stopPenSound();
          const hasGapAfter = ln.nextElementSibling?.classList.contains('gap');
          window.setTimeout(() => writeLine(idx + 1), hasGapAfter ? 900 : 300);
        }
      };

      rafRef.current = requestAnimationFrame(step);
    };

    writeLine(0);
  }

  async function breakSeal() {
    if (phaseRef.current !== 'sealed') return;
    phaseRef.current = 'opening';
    unlockAudio();
    playSfx('seal');
    vibrate(30);
    setEnvState('cracked');
    await waitMs(still ? 50 : 750);
    setEnvState('away');
    playSfx('paper');
    await waitMs(still ? 50 : 700);
    setEnvState('gone');
  }

  relayoutRef.current = () => {
    buildInkLines();
    layout();
  };

  useLayoutEffect(() => {
    if (envState !== 'gone') return;
    const isOpening = phaseRef.current === 'opening';
    if (phaseRef.current === 'writing') phaseRef.current = 'done';
    layout();
    buildInkLines();
    layout();
    if (isOpening) {
      setShowSkip(!still);
      const timer = window.setTimeout(startWriting, still ? 0 : 1100);
      return () => window.clearTimeout(timer);
    }
  }, [envState, buildInkLines, layout, still]);

  useEffect(() => {
    layout();
    document.fonts?.ready.then(layout).catch(() => {});
    window.addEventListener('resize', layout);
    return () => {
      window.removeEventListener('resize', layout);
      cancelAnimationFrame(rafRef.current);
      stopPenSound();
    };
  }, [layout, d.lang]);

  useEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          head.classList.add('in');
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(head);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={pageRef} className="lpage">
        <img ref={bgImgRef} className="lp-img" src={getAsset('letter-page')} alt="" onLoad={layout} />
        <h2 ref={headRef} className="lp-head">
          {ui.letterTitle}
        </h2>
        <div ref={areaRef} className="lp-area">
          {envState !== 'gone' && (
            <div
              ref={envWrapRef}
              className={`env-wrap ${envState !== 'sealed' ? 'cracked' : ''} ${envState === 'away' ? 'away' : ''}`}
            >
              <img className="env" src={getAsset('envelope')} alt="" />
              <button type="button" className="env-seal" aria-label={ui.breakSeal} onClick={breakSeal}>
                <img className="s-whole" src={getAsset('seal')} alt="" />
                <img className="s-l" src={getAsset('seal-l')} alt="" />
                <img className="s-r" src={getAsset('seal-r')} alt="" />
              </button>
              <p className="hand-hint env-hint" aria-hidden="true">
                {ui.breakSeal}
              </p>
            </div>
          )}
          <article ref={sheetRef} className={`sheet ${envState === 'gone' ? 'show' : ''}`} aria-label={ui.letterTitle}>
            <div ref={inkRef} className="ink" />
            <img ref={nibRef} className="nib" src={getAsset('pen-nib')} alt="" aria-hidden="true" />
          </article>
        </div>
      </div>
      {showSkip && (
        <button type="button" className="soft-link skip" onClick={finishWritingInstant}>
          {ui.skip}
        </button>
      )}
    </>
  );
}

function OpenWhenSection({ d, openLightbox }: { d: Birthday1Data; openLightbox: (n: React.ReactNode) => void }) {
  const [readSet, setReadSet] = useState<Set<number>>(() => new Set());
  if (d.openWhen.length === 0) return null;

  const rotations = [-4, 2, 5];

  return (
    <div className="ow">
      <p className="ow-title rv">{d.ui.owTitle}</p>
      <div className="ow-row">
        {d.openWhen.slice(0, 3).map((item, idx) => (
          <button
            key={idx}
            type="button"
            className={`owe rv${readSet.has(idx) ? ' read' : ''}`}
            style={{ '--r': `${rotations[idx]}deg` } as React.CSSProperties}
            onClick={() => {
              setReadSet((prev) => new Set(prev).add(idx));
              playSfx('seal');
              openLightbox(
                <div className="lb-note">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              );
            }}
          >
            <img className="e" src={getAsset('envelope')} alt="" />
            <img className="s" src={getAsset('seal')} alt="" />
            <span>{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const TAG_LAYOUT = [
  { src: 'tag1', top: 0.31 },
  { src: 'tag3', top: 0.29 },
  { src: 'tag2', top: 0.27 },
];

function NotesSection({ d }: { d: Birthday1Data }) {
  const noteRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    noteRefs.current.forEach((el) => {
      if (el && !el.classList.contains('in')) io.observe(el);
    });
    return () => io.disconnect();
  }, [d.notes]);

  const rows: NoteItem[][] = [];
  for (let i = 0; i < d.notes.length; i += 2) {
    rows.push(d.notes.slice(i, i + 2));
  }

  return (
    <div className="lines">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="line">
          <img className="rib" src={getAsset('ribbon')} alt="" aria-hidden="true" />
          <div className="tags">
            {row.map((note, colIdx) => {
              const idx = rowIdx * 2 + colIdx;
              const tagCfg = TAG_LAYOUT[idx % TAG_LAYOUT.length];
              return (
                <button
                  key={colIdx}
                  ref={(el) => {
                    noteRefs.current[idx] = el;
                  }}
                  type="button"
                  className="note"
                  style={{ animationDelay: `${0.25 * colIdx}s, ${2.4 + 0.25 * colIdx}s` }}
                  onClick={(e) => {
                    const btn = e.currentTarget;
                    btn.classList.remove('in', 'again');
                    void btn.offsetWidth;
                    btn.classList.add('in', 'again');
                    playSfx('paper');
                  }}
                >
                  <img className="tagimg" src={getAsset(tagCfg.src)} alt="" draggable={false} />
                  <img className="pin" src={getAsset('clothespin')} alt="" aria-hidden="true" />
                  <span className="txt" style={{ top: `${tagCfg.top * 100}%` }}>
                    {note.title && <h3>{note.title}</h3>}
                    {note.text && <p>{note.text}</p>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function GiftTicket({ c, peel, tapPeel }: { c: NoteItem; peel: string; tapPeel: boolean }) {
  const [peeled, setPeeled] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const widthRef = useRef(0);

  const removeSticker = () => {
    setPeeled(true);
    playSfx('paper');
    vibrate(12);
  };

  const endDrag = () => {
    if (startXRef.current === null) return;
    const dx = dragX ?? 0;
    startXRef.current = null;
    setDragX(null);
    if (dx > 0.32 * widthRef.current || (dx < 6 && tapPeel)) {
      removeSticker();
    }
  };

  return (
    <div className="ticket rv">
      <img src={getAsset('ticket')} alt="" draggable={false} />
      <div className="tx">
        {c.title && <h3>{c.title}</h3>}
        {c.text && <p>{c.text}</p>}
      </div>
      <button
        type="button"
        className={`sticker${peeled ? ' off' : ''}${dragX !== null ? ' dragging' : ''}`}
        aria-label={peel}
        aria-hidden={peeled}
        tabIndex={peeled ? -1 : 0}
        style={
          dragX !== null
            ? {
                transform: `translateX(${0.9 * dragX}px) rotate(${0.05 * dragX}deg)`,
                boxShadow: `${-0.04 * dragX}px ${0.05 * dragX}px ${0.12 * dragX}px rgba(40,15,10,.35)`,
              }
            : undefined
        }
        onPointerDown={(e) => {
          startXRef.current = e.clientX;
          widthRef.current = e.currentTarget.offsetWidth;
          setDragX(0);
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          unlockAudio();
        }}
        onPointerMove={(e) => {
          if (startXRef.current !== null) {
            setDragX(Math.max(0, e.clientX - startXRef.current));
          }
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            removeSticker();
          }
        }}
      >
        <span>{peel}</span>
      </button>
    </div>
  );
}

function GiftsSection({ d }: { d: Birthday1Data }) {
  const [tapAllowed, setTapAllowed] = useState(false);
  const ticketsRef = useRevealOnce<HTMLDivElement>(0.3, () => {
    window.setTimeout(() => setTapAllowed(true), 3000);
  });

  return (
    <>
      <div ref={ticketsRef} className="tickets">
        {d.coupons.map((c, idx) => (
          <GiftTicket key={idx} c={c} peel={d.ui.peel} tapPeel={tapAllowed} />
        ))}
      </div>
      <p className={`soft-note ${tapAllowed ? 'on' : ''}`}>{d.ui.peelTap}</p>
    </>
  );
}

function ReplySection({
  d,
  ambient,
  still,
}: {
  d: Birthday1Data;
  ambient: () => HTMLDivElement | null;
  still: boolean;
}) {
  const ui = d.ui;
  const inputId = useId();
  const errId = useId();
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState<'form' | 'folding' | 'sealed' | 'flying' | 'sent'>('form');
  const [err, setErr] = useState<string | null>(null);
  const busy = status !== 'form' && status !== 'sent';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = msg.trim();
    if (!trimmed || busy) return;
    setErr(null);

    const speed = still ? 0.05 : 1;
    setStatus('folding');
    playSfx('paper');

    let saved = false;
    try {
      const res = await fetch('/api/replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, lang: d.lang }),
      });
      saved = res.ok;
    } catch {
      saved = false;
    }

    if (!saved) {
      setStatus('form');
      setErr(ui.sendFail);
      return;
    }

    await waitMs(250 * speed);
    await waitMs(900 * speed);

    setStatus('sealed');
    playSfx('stamp');
    vibrate(25);
    await waitMs(700 * speed);

    setStatus('flying');
    playSfx('ribbon');
    await waitMs(900 * speed);

    setStatus('sent');
    setMsg('');
    if (d.petals && !still) {
      for (let i = 0; i < 6; i++) {
        spawnPetal(ambient(), { delay: 300 * i, dur: 6000 + 3000 * Math.random() });
      }
    }
  }

  return (
    <>
      <div className="reply-stage">
        <form className={`card-form rv${status !== 'form' ? ' folding' : ''}`} onSubmit={handleSubmit} id={`${inputId}-form`}>
          <img src={getAsset('notecard')} alt="" />
          <label htmlFor={inputId} className="sr-only">
            {ui.replyLabel}
          </label>
          <textarea
            id={inputId}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            maxLength={600}
            placeholder={ui.replyPh}
            required
            disabled={status !== 'form'}
            aria-describedby={err ? errId : undefined}
          />
        </form>
        <img
          className={`r-env${status === 'sealed' || status === 'flying' || status === 'folding' ? ' on' : ''}${
            status === 'flying' || status === 'sent' ? ' fly' : ''
          }`}
          src={getAsset('envelope')}
          alt=""
          aria-hidden="true"
        />
        <img
          className={`r-seal${status === 'sealed' || status === 'flying' ? ' on' : ''}${
            status === 'flying' || status === 'sent' ? ' fly' : ''
          }`}
          src={getAsset('seal')}
          alt=""
          aria-hidden="true"
        />
        <img
          className={`r-bouquet${status === 'sent' ? ' on' : ''}`}
          src={getAsset('bouquet')}
          alt=""
          aria-hidden="true"
        />
      </div>

      {status === 'sent' ? (
        <>
          <p className="sent" role="status">
            {ui.sent}
          </p>
          <button type="button" className="soft-link again" onClick={() => setStatus('form')}>
            {ui.writeAgain}
          </button>
        </>
      ) : (
        <button className="send" type="submit" form={`${inputId}-form`} disabled={busy || !msg.trim()}>
          {busy ? ui.sending : ui.send}
        </button>
      )}

      {err && (
        <p id={errId} className="form-err" role="alert">
          {err}
        </p>
      )}
      {status !== 'sent' && <p className="form-note">{ui.demoNote}</p>}
    </>
  );
}

function EndSection({
  d,
  onRestart,
  onSecretAdmin,
}: {
  d: Birthday1Data;
  onRestart: () => void;
  onSecretAdmin: () => void;
}) {
  const bowRef = useRevealOnce<HTMLImageElement>(0.5, (el) => {
    el.classList.add('in');
    playSfx('ribbon');
  });
  const secretTapsRef = useRef<number[]>([]);

  const handleSecretTap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    const recent = secretTapsRef.current.filter((t) => now - t < 2500);
    recent.push(now);
    secretTapsRef.current = recent;
    if (recent.length >= 5) {
      secretTapsRef.current = [];
      onSecretAdmin();
    }
  };

  return (
    <section className="sec s-end">
      <img ref={bowRef} className="end-bow" src={getAsset('bow')} alt="" aria-hidden="true" />
      <p className="end-line rv">{d.ui.endLine}</p>
      {d.from && <p className="end-from rv">{d.ui.endFrom}</p>}
      <button type="button" className="soft-link restart" onClick={onRestart}>
        {d.ui.restart}
      </button>
      <div className="credit">
        <div className="credit-box">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onRestart();
            }}
            className="credit-link"
          >
            <span lang="en">Created by</span>
            <svg viewBox="0 0 20 20" role="presentation" aria-hidden="true" className="credit-heart">
              <path
                d="M10 16.2s-6.2-3.9-6.2-8.4A3.6 3.6 0 0 1 10 5.4a3.6 3.6 0 0 1 6.2 2.4c0 4.5-6.2 8.4-6.2 8.4Z"
                fill="currentColor"
              />
            </svg>
            <span lang="bn" className="credit-brand" onClick={handleSecretTap}>
              নিমন্ত্রণ
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

export default function Birthday1() {
  const [lang, setLang] = useState<'bn' | 'en'>('bn');
  const [resetKey, setResetKey] = useState(0);
  const [cardConfig, setCardConfig] = useState<CardConfigPayload>(DEFAULT_CARD_CONFIG);
  const [adminOpen, setAdminOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const p = new URLSearchParams(window.location.search);
    return p.has('admin') || window.location.hash === '#admin' || window.location.pathname === '/admin';
  });

  const bilingual = buildBilingualData(cardConfig);
  const d = bilingual[lang];
  const ui = d.ui;
  const reducedMotion = useReducedMotion() ?? false;

  const [unlocked, setUnlocked] = useState(false);
  const [musicVisible, setMusicVisible] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [eveningBg, setEveningBg] = useState(false);
  const [lightboxNode, setLightboxNode] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    fetch('/api/card', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.bn && data.en && Array.isArray(data.photos)) {
          setCardConfig(data as CardConfigPayload);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#admin') setAdminOpen(true);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAdminOpen((v) => !v);
      }
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const ambientRef = useRef<HTMLDivElement | null>(null);
  const bgPaperRef = useRef<HTMLVideoElement | null>(null);
  const bgEveningRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const eveningTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let wasPlaying = false;
    const onVisibility = () => {
      if (document.hidden) {
        wasPlaying = !audio.paused;
        audio.pause();
      } else if (wasPlaying) {
        audio.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [resetKey]);

  useEffect(() => {
    const ambient = ambientRef.current;
    if (reducedMotion || !ambient) return;
    for (let i = 0; i < 16; i++) {
      const spark = document.createElement('span');
      spark.className = 'spark';
      spark.innerHTML =
        '<svg viewBox="0 0 24 24"><path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0Z" fill="currentColor"/></svg>';
      const edgeBias = Math.random() < 0.7;
      spark.style.left = `${
        edgeBias ? (Math.random() < 0.5 ? 4 + 18 * Math.random() : 78 + 18 * Math.random()) : 20 + 60 * Math.random()
      }%`;
      spark.style.top = `${3 + 92 * Math.random()}%`;
      const size = 7 + 9 * Math.random();
      spark.style.width = `${size}px`;
      spark.style.height = `${size}px`;
      spark.style.animationDelay = `${6 * Math.random()}s`;
      spark.style.animationDuration = `${3.5 + 3 * Math.random()}s`;
      ambient.appendChild(spark);
    }
    return () => ambient.replaceChildren();
  }, [reducedMotion, resetKey]);

  useEffect(() => {
    if (!unlocked || reducedMotion || !d.petals) return;
    let timer = 0;
    const loop = () => {
      if (!document.hidden) spawnPetal(ambientRef.current);
      timer = window.setTimeout(loop, 8000 + 7000 * Math.random());
    };
    timer = window.setTimeout(loop, 2500);
    return () => window.clearTimeout(timer);
  }, [unlocked, reducedMotion, d.petals, resetKey]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    let ticking = false;
    const updateBg = () => {
      ticking = false;
      const sec = eveningTriggerRef.current;
      if (sec) {
        setEveningBg(sec.getBoundingClientRect().top - scroller.getBoundingClientRect().top < 0.55 * scroller.clientHeight);
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateBg);
      }
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [resetKey]);

  useEffect(() => {
    if (reducedMotion) return;
    const activeVid = eveningBg ? bgEveningRef.current : bgPaperRef.current;
    const idleVid = eveningBg ? bgPaperRef.current : bgEveningRef.current;
    if (musicVisible) {
      playWhenReady(activeVid).catch(() => {});
    }
    const timer = window.setTimeout(() => idleVid?.pause(), 1700);
    return () => window.clearTimeout(timer);
  }, [eveningBg, reducedMotion, musicVisible]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    scroller.querySelectorAll('.rv:not(.in)').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [d, unlocked, resetKey]);

  useEffect(() => {
    if (!lightboxNode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxNode(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxNode]);

  const getScroller = useCallback(() => scrollerRef.current, []);

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setMusicPlaying(false);
    setMusicVisible(false);
    setUnlocked(false);
    setEveningBg(false);
    setLightboxNode(null);
    setResetKey((k) => k + 1);
  };

  const scrollHintEl = <ScrollHint label={ui.scroll} />;

  return (
    <main className="b1-stage">
      <div
        key={resetKey}
        className={`b1 ${unlocked ? '' : 'locked'}`}
        data-lang={d.lang}
        lang={d.lang}
        data-lenis-prevent="true"
      >
        <div className="bg" aria-hidden="true">
          {reducedMotion ? (
            <>
              <img className={`bgv ${eveningBg ? '' : 'on'}`} src={getAsset('bg-paper-poster')} alt="" />
              <img className={`bgv ${eveningBg ? 'on' : ''}`} src={getAsset('bg-evening-poster')} alt="" />
            </>
          ) : (
            <>
              <video
                ref={bgPaperRef}
                className={`bgv ${eveningBg ? '' : 'on'}`}
                src={getAsset('bg-paper')}
                muted
                playsInline
                loop
                autoPlay
                preload="auto"
                poster={getAsset('bg-paper-poster')}
              />
              <video
                ref={bgEveningRef}
                className={`bgv ${eveningBg ? 'on' : ''}`}
                src={getAsset('bg-evening')}
                muted
                playsInline
                loop
                preload="auto"
                poster={getAsset('bg-evening-poster')}
              />
            </>
          )}
          <div ref={ambientRef} className="ambient" />
        </div>

        <div ref={scrollerRef} className="b1-scroll">
          <div>
            <TitleSection d={d} start={unlocked} instant={reducedMotion} />

            <MemoriesSection d={d} openLightbox={setLightboxNode} hint={scrollHintEl} />

            <section className="sec s-letters">
              <LetterWriting d={d} still={reducedMotion} openAtStart={false} scroller={getScroller} />
              <OpenWhenSection d={d} openLightbox={setLightboxNode} />
              {scrollHintEl}
            </section>

            {d.notes.length > 0 && (
              <section className="sec s-notes">
                <header className="head rv">
                  <h2>{ui.notesTitle}</h2>
                  <p>{ui.notesSub}</p>
                </header>
                <NotesSection d={d} />
                {scrollHintEl}
              </section>
            )}

            {d.coupons.length > 0 && (
              <section ref={eveningTriggerRef} className="sec s-gifts">
                <header className="head rv">
                  <h2>{ui.giftTitle}</h2>
                  <p>{ui.giftSub}</p>
                </header>
                <GiftsSection d={d} />
                {scrollHintEl}
              </section>
            )}

            <section className="sec s-reply">
              <header className="head rv">
                <h2>{ui.replyTitle}</h2>
              </header>
              <ReplySection d={d} ambient={() => ambientRef.current} still={reducedMotion} />
            </section>

            <EndSection d={d} onRestart={handleRestart} onSecretAdmin={() => setAdminOpen(true)} />
          </div>
        </div>

        {!unlocked && (
          <IntroStage
            d={d}
            still={reducedMotion}
            onOpen={() => {
              setMusicVisible(true);
              playWithFadeIn(audioRef.current);
              playWhenReady(bgPaperRef.current).catch(() => {});
            }}
            onDone={() => {
              scrollerRef.current?.scrollTo(0, 0);
              setUnlocked(true);
            }}
          />
        )}

        {lightboxNode && (
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={ui.close}
            onClick={() => setLightboxNode(null)}
          >
            <button type="button" className="sr-only" autoFocus onClick={() => setLightboxNode(null)}>
              {ui.close}
            </button>
            <div className="lb-card">{lightboxNode}</div>
          </div>
        )}

        <div className="lang" role="group" aria-label="Language">
          {(['bn', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={lang === code}
              onClick={() => setLang(code)}
            >
              {code === 'bn' ? 'বাং' : 'EN'}
            </button>
          ))}
        </div>

        <audio
          ref={audioRef}
          src={d.music.src}
          loop
          preload="none"
          onPlay={() => setMusicPlaying(true)}
          onPause={() => setMusicPlaying(false)}
        />
        {musicVisible && (
          <MusicPlayer music={d.music} audioRef={audioRef} playing={musicPlaying} lang={d.lang} />
        )}
      </div>

      <AdminModal
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onCardUpdated={(nextCard) => {
          setCardConfig(nextCard);
        }}
      />
    </main>
  );
}
