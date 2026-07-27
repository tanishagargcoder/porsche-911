/**
 * Per-frame state the camera rig publishes for everyone else — depth of field,
 * the headlight ignition, and whichever beat we're sitting on. Lives outside
 * React so nothing re-renders 60 times a second.
 */
export const rig = {
  /** 0 → 1, how macro the current beat is (drives bokeh and the reticle) */
  detail: 0,
  /** 0 → 1 headlight ignition, ramps up at the headlamp shot and stays lit */
  lights: 0,
  /** index of the beat the timeline is nearest to */
  beat: 0,
  /** true while the user is dragging the car around in photo mode */
  photo: false,
  /** true while the build panel is open — the camera holds a showcase pose */
  configuring: false,
  /**
   * Beat being hovered in the chapter index. The camera flies to it live rather
   * than the card showing a recorded preview — we have the real thing running.
   */
  preview: null as number | null,
  /** km/h during the closing run — 0 whenever the car is parked */
  speed: 0,
  /**
   * Photo mode's frame grab. Registered from inside the Canvas: the renderer
   * no longer keeps the drawing buffer around (it was costing enough memory to
   * lose the GL context), so the frame has to be drawn on demand.
   */
  capture: null as null | (() => string | null),
};
