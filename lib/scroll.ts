/**
 * Scroll and intro progress live outside React on purpose — the camera reads
 * them every frame and re-rendering the tree 60 times a second would be silly.
 */
export const scroll = { progress: 0 };

/** how long the opening fly-past runs, in ms — the CSS keyframes match this */
export const INTRO_MS = 3600;

export const intro = {
  /** performance.now() when the fly-past began, 0 until the model has loaded */
  startedAt: 0,
  /** 0 → 1 across the fly-past */
  t: 0,
};

export const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));

/** ease in/out, so the camera settles into each shot instead of sliding past it */
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** remap a sub-range of t to 0..1 */
export const range = (t: number, start: number, end: number) =>
  clamp((t - start) / (end - start));
