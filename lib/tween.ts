/**
 * Scroll tween we drive ourselves.
 *
 * We stop Lenis, animate the window directly, and hand the scroll back
 * afterwards. Doing it here rather than through `lenis.scrollTo` means chapter
 * jumps and the hands-free film behave identically when Lenis isn't running at
 * all — which is the case under prefers-reduced-motion.
 */

let raf = 0;

export type ScrollHost = {
  stop: () => void;
  start: () => void;
} | null;

export function cancelScrollTween() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

export function tweenScrollTo(
  to: number,
  ms: number,
  host: ScrollHost,
  onDone?: () => void,
  /** linear for the hands-free film, eased for chapter jumps */
  easing: (t: number) => number = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
) {
  cancelScrollTween();
  host?.stop();

  const from = window.scrollY;
  const max = document.body.scrollHeight - window.innerHeight;
  const target = Math.max(0, Math.min(to, max));
  const t0 = performance.now();

  const step = (now: number) => {
    const p = ms <= 0 ? 1 : Math.min(1, (now - t0) / ms);
    window.scrollTo(0, from + (target - from) * easing(p));

    if (p < 1) {
      raf = requestAnimationFrame(step);
      return;
    }

    raf = 0;
    host?.start();
    onDone?.();
  };

  raf = requestAnimationFrame(step);
}

/** stop a running tween and give the scroll back to Lenis */
export function releaseScrollTween(host: ScrollHost) {
  cancelScrollTween();
  host?.start();
}
