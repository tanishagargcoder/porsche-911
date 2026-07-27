/**
 * A tiny synthesised engine — no audio files, everything is oscillators and
 * filtered noise. It reads as a turbo flat six from across the room, not from
 * the front row; drop a real recording in and swap `rev()` if you ever want one.
 *
 * Browsers only allow audio after a gesture, so nothing here runs until the
 * sound toggle is actually clicked.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;

export let enabled = false;

function context() {
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** two seconds of white noise, reused by every whoosh */
function noise(c: AudioContext) {
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  return src;
}

/**
 * Try to open the audio device. Browsers only allow this off the back of a real
 * gesture, so this returns false when it's blocked and the caller shows a gate.
 */
/**
 * Must run *synchronously* inside a real tap — iOS only unlocks audio on the
 * same tick as the gesture, so anything behind an `await` is already too late.
 * The one-sample silent buffer is what iOS actually counts as "the user started
 * audio"; resuming alone isn't enough there.
 */
export function prime() {
  const c = context();
  if (!c) return false;

  void c.resume();

  const buffer = c.createBuffer(1, 1, 22050);
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.connect(c.destination);
  source.start(0);

  return true;
}

export async function unlock() {
  const c = context();
  if (!c) return false;
  if (c.state === "running") return true;

  // Chrome leaves this promise *pending* until a real gesture rather than
  // rejecting, so it can never be awaited on its own — race it.
  const resumed = c
    .resume()
    .then(() => c.state === "running")
    .catch(() => false);

  const gaveUp = new Promise<boolean>((r) => setTimeout(() => r(false), 350));

  return Promise.race([resumed, gaveUp]);
}

/**
 * Phones suspend the context when the tab goes to the background. Once it has
 * been unlocked by a gesture, resuming on return is allowed without another one.
 */
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && enabled && ctx?.state === "suspended") {
      void ctx.resume();
    }
  });
}

export function setEnabled(on: boolean) {
  enabled = on;
  if (on) context();
  if (master && ctx) {
    master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.05);
  }
}

/** ignition and a rev — the intro sound */
export function rev() {
  const c = context();
  if (!c || !enabled || !master) return;

  const t = c.currentTime;
  const out = c.createGain();
  out.gain.value = 0;
  out.connect(master);

  // engine body: a stack of detuned saws an octave apart
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(280, t);
  lp.Q.value = 6;
  lp.connect(out);

  const oscs = [1, 2, 3.02, 4.05].map((mult, i) => {
    const o = c.createOscillator();
    o.type = i === 0 ? "sawtooth" : "square";
    o.frequency.setValueAtTime(38 * mult, t);
    // crank, catch, settle
    o.frequency.exponentialRampToValueAtTime(52 * mult, t + 0.35);
    o.frequency.exponentialRampToValueAtTime(165 * mult, t + 1.5);
    o.frequency.exponentialRampToValueAtTime(74 * mult, t + 2.6);
    const g = c.createGain();
    g.gain.value = 0.5 / (i + 1);
    o.connect(g).connect(lp);
    return o;
  });

  lp.frequency.exponentialRampToValueAtTime(2400, t + 1.5);
  lp.frequency.exponentialRampToValueAtTime(600, t + 2.8);

  // intake roar
  const air = noise(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(700, t);
  bp.frequency.exponentialRampToValueAtTime(2800, t + 1.5);
  bp.Q.value = 1.2;
  const airGain = c.createGain();
  airGain.gain.value = 0.12;
  air.connect(bp).connect(airGain).connect(out);

  out.gain.linearRampToValueAtTime(0.9, t + 0.12);
  out.gain.setValueAtTime(0.9, t + 2.2);
  out.gain.exponentialRampToValueAtTime(0.001, t + 3.4);

  oscs.forEach((o) => {
    o.start(t);
    o.stop(t + 3.5);
  });
  air.start(t);
  air.stop(t + 3.5);
}

/** blow-off valve — fires when a macro shot locks on */
export function flutter() {
  const c = context();
  if (!c || !enabled || !master) return;

  const t = c.currentTime;
  const src = noise(c);

  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(3200, t);
  bp.frequency.exponentialRampToValueAtTime(1400, t + 0.35);
  bp.Q.value = 3;

  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

  // the chatter
  const lfo = c.createOscillator();
  lfo.frequency.value = 26;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.09;
  lfo.connect(lfoGain).connect(g.gain);

  src.connect(bp).connect(g).connect(master);
  src.start(t);
  src.stop(t + 0.45);
  lfo.start(t);
  lfo.stop(t + 0.45);
}

/**
 * The fly-past. Noise and a low engine tone sweep from the left ear to the
 * right while the pitch falls away — the doppler is what sells it.
 */
export function whoosh(duration = 1.5) {
  const c = context();
  if (!c || !enabled || !master) return;

  const t = c.currentTime;
  const end = t + duration;
  const mid = t + duration * 0.5;

  const pan = c.createStereoPanner();
  pan.pan.setValueAtTime(-1, t);
  pan.pan.linearRampToValueAtTime(1, end);
  pan.connect(master);

  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.85, mid);
  out.gain.exponentialRampToValueAtTime(0.0001, end);
  out.connect(pan);

  // tyre and body roar
  const air = noise(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(2400, t);
  bp.frequency.exponentialRampToValueAtTime(2900, mid);
  bp.frequency.exponentialRampToValueAtTime(700, end);
  bp.Q.value = 1.1;
  const airGain = c.createGain();
  airGain.gain.value = 0.35;
  air.connect(bp).connect(airGain).connect(out);

  // the engine note itself, dropping as it goes past
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1800, t);
  lp.frequency.exponentialRampToValueAtTime(500, end);
  lp.connect(out);

  const oscs = [1, 2, 3.01].map((mult, i) => {
    const o = c.createOscillator();
    o.type = i === 0 ? "sawtooth" : "square";
    o.frequency.setValueAtTime(150 * mult, t);
    o.frequency.exponentialRampToValueAtTime(165 * mult, mid);
    o.frequency.exponentialRampToValueAtTime(78 * mult, end);
    const g = c.createGain();
    g.gain.value = 0.45 / (i + 1);
    o.connect(g).connect(lp);
    o.start(t);
    o.stop(end + 0.05);
    return o;
  });
  void oscs;

  air.start(t);
  air.stop(end + 0.05);
}

/** a dry click for the paint swatches */
export function tick() {
  const c = context();
  if (!c || !enabled || !master) return;

  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(880, t);
  o.frequency.exponentialRampToValueAtTime(260, t + 0.06);

  const g = c.createGain();
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);

  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.1);
}
