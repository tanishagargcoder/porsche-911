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
