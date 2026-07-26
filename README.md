# 911 Turbo — Ruby Star

A scroll-driven walkaround of a Porsche 911 Turbo (996), built like a film shoot:
the camera flies around the car as you scroll, stops for macro shots of the
bumper, headlamp, crest, wheel and tail, then pulls back out.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React Three Fiber](https://img.shields.io/badge/react--three--fiber-9-black)
![Tailwind](https://img.shields.io/badge/Tailwind-4-black)

## What's in it

**The ride**
- **Opening title card** — the wordmark resolves out of blur while the car
  streaks left to right past a side-on camera, then the site unlocks.
- **Act 1 — turntable.** The camera holds dead still and the car rotates a full
  360° on the spot, angle counting up as you go.
- **Act 2 — macro.** Five close-ups, each with a targeting reticle and a spec
  panel: bumper, teardrop headlamp, Stuttgart crest, wheel, twin-turbo tail.
- **Act 3 — wide.** The camera pulls back out and drifts while the car keeps
  turning, stats counting up beside it. Ends on **STILL HERE**.

**Toys**
- **Paint switcher** — five colours, morphing rather than snapping. The hero
  headline and the HUD readout both follow the paint.
- **Headlight ignition** — the lamps come on at the headlamp shot and stay lit,
  with light cones and bloom.
- **Photo mode** — near the end, take the camera off the rails and orbit the car
  yourself.
- **Sound** — a synthesised engine rev on the toggle, blow-off chatter whenever a
  macro shot locks on. Oscillators and filtered noise, no audio files.
- **HUD** — corner brackets, scanlines, text that scrambles into place, live
  progress, per-beat ticks.

**Under it**
- Camera work is a keyframed shot list in [`lib/shots.ts`](lib/shots.ts) — real
  metres, since the model is normalised to a 996's actual 4.43 m length.
- Scroll and intro progress live outside React (`lib/scroll.ts`, `lib/rig.ts`) so
  nothing re-renders per frame.
- Depth of field, bloom, grain and fringing via `@react-three/postprocessing`;
  bokeh tightens automatically for the macro beats and is skipped under 900 px.
- Portrait screens pull the camera back so the car stays in frame.
- Honours `prefers-reduced-motion` — smooth scroll, scramble and count-ups all
  step aside.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## The model

The car is **"Porsche 911 Turbo (996)"** by
[Alex.Ka.](https://sketchfab.com/Alex.Ka.) on Sketchfab, licensed
[CC BY-NC 4.0](http://creativecommons.org/licenses/by-nc/4.0/) — **credit is
required and commercial use is not permitted.** The credit is in the page footer;
keep it there.

`public/models/porsche.glb` is an optimised copy of the Sketchfab download
(19 MB → 4.2 MB), produced with:

```bash
npx @gltf-transform/cli optimize scene.gltf porsche.glb --compress quantize --texture-compress webp --texture-size 2048 --palette false --join false --simplify false
```

Those last three flags matter: with palette merging or mesh joining on, the body
paint material gets folded into a shared atlas and the colour switcher stops
working.

The model is a single merged mesh split by material, so there are no separate
door, hood or wheel nodes — parts can only be targeted by material name, which
is why nothing opens or spins.

This is a fan project. Not affiliated with Dr. Ing. h.c. F. Porsche AG.
