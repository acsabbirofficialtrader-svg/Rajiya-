let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

export function unlockAudio(): AudioContext | null {
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  if (!noiseBuffer) {
    noiseBuffer = audioCtx.createBuffer(1, 2 * audioCtx.sampleRate, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = 2 * Math.random() - 1;
    }
  }
  return audioCtx;
}

interface BurstOptions {
  type?: BiquadFilterType;
  f?: number;
  f2?: number;
  q?: number;
  peak?: number;
  a?: number;
  dur?: number;
  delay?: number;
}

function playNoiseBurst({
  type = 'bandpass',
  f = 800,
  f2,
  q = 0.7,
  peak = 0.3,
  a = 0.04,
  dur = 0.4,
  delay = 0,
}: BurstOptions) {
  const ctx = unlockAudio();
  if (!ctx || !noiseBuffer) return;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;

  const gain = ctx.createGain();
  const startAt = ctx.currentTime + delay;

  filter.frequency.setValueAtTime(f, startAt);
  if (f2) {
    filter.frequency.exponentialRampToValueAtTime(f2, startAt + dur);
  }

  gain.gain.setValueAtTime(1e-4, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + a);
  gain.gain.exponentialRampToValueAtTime(1e-4, startAt + dur);

  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(startAt, Math.random());
  src.stop(startAt + dur + 0.05);
}

export type SfxKind = 'light' | 'ribbon' | 'paper' | 'blow' | 'seal' | 'stamp';

export function playSfx(kind: SfxKind) {
  switch (kind) {
    case 'light':
      playNoiseBurst({ type: 'bandpass', f: 300, f2: 1400, q: 0.8, peak: 0.16, a: 0.03, dur: 0.45 });
      break;
    case 'ribbon':
      playNoiseBurst({ f: 700, f2: 2600, q: 0.9, peak: 0.12, a: 0.08, dur: 0.7 });
      break;
    case 'paper':
      playNoiseBurst({ f: 1900, q: 0.8, peak: 0.1, a: 0.02, dur: 0.22 });
      playNoiseBurst({ f: 1200, q: 0.8, peak: 0.07, a: 0.02, dur: 0.18, delay: 0.12 });
      break;
    case 'blow':
      playNoiseBurst({ f: 650, q: 0.5, peak: 0.32, a: 0.14, dur: 1 });
      break;
    case 'seal':
      playNoiseBurst({ type: 'highpass', f: 2600, q: 0.7, peak: 0.28, a: 0.003, dur: 0.07 });
      playNoiseBurst({ type: 'lowpass', f: 320, q: 1, peak: 0.25, a: 0.005, dur: 0.14, delay: 0.02 });
      break;
    case 'stamp':
      playNoiseBurst({ type: 'lowpass', f: 170, q: 1.2, peak: 0.55, a: 0.004, dur: 0.22 });
      playNoiseBurst({ type: 'bandpass', f: 900, q: 1, peak: 0.08, a: 0.003, dur: 0.06 });
      break;
  }
}

let activePenLoop: { stop: () => void } | null = null;

export function startPenSound() {
  if (activePenLoop) return;
  const ctx = unlockAudio();
  if (!ctx || !noiseBuffer) return;

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3300;
  filter.Q.value = 1.3;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start();

  const timer = window.setInterval(() => {
    gain.gain.setTargetAtTime(0.012 + 0.03 * Math.random(), ctx.currentTime, 0.02);
  }, 70);

  activePenLoop = {
    stop: () => {
      window.clearInterval(timer);
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      window.setTimeout(() => {
        try {
          src.stop();
        } catch {
          // ignore if already stopped
        }
      }, 300);
    },
  };
}

export function stopPenSound() {
  activePenLoop?.stop();
  activePenLoop = null;
}

export function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // ignore unsupported environments
  }
}

export function playWithFadeIn(el: HTMLAudioElement | null, durationMs = 3000) {
  if (!el) return;
  el.volume = 0;
  el.play()
    .then(() => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        el.volume = t * t;
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    })
    .catch(() => {
      el.volume = 1;
    });
}

export function playWhenReady(el: HTMLMediaElement | null, timeoutMs = 6000): Promise<void> {
  if (!el) return Promise.reject(new Error('no video'));
  if (el.readyState >= HTMLMediaElement.HAVE_METADATA) {
    return el.play();
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      el.removeEventListener('loadedmetadata', onReady);
    };
    const onReady = () => {
      cleanup();
      el.play().then(resolve, reject);
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('video not ready'));
    }, timeoutMs);
    el.addEventListener('loadedmetadata', onReady);
  });
}
