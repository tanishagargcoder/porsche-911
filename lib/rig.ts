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
};
