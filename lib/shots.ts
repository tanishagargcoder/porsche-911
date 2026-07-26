export type Shot = {
  id: string;
  /** how the copy for this beat is laid out */
  kind:
    | "title"
    | "turn"
    | "detail"
    | "feature"
    | "spec"
    | "timeline"
    | "final"
    | "run";
  kicker?: string;
  title?: string;
  body?: string;
  /** camera position in metres — car is centred at origin, nose at +X, 4.43 m long */
  cam: [number, number, number];
  target: [number, number, number];
  fov: number;
  /** the car's own yaw at this beat, in radians — this is what spins the car */
  yaw: number;
  align?: "left" | "right" | "center";
  /** numbers that count up when the beat lands */
  stats?: { label: string; value: number; suffix?: string; decimals?: number }[];
  /** targeting-reticle readout for the macro shots */
  hud?: {
    code: string;
    label: string;
    specs: [string, string][];
    anchor: "left" | "right";
  };
};

const TURN_CAM: [number, number, number] = [5.6, 1.35, 5.0];
const TURN_TARGET: [number, number, number] = [0, 0.72, 0];
const TURN_FOV = 34;

/**
 * The scroll timeline, in three acts:
 *   1. the car spins on the spot while the camera holds still
 *   2. the camera dives in for macro shots of bumper, lamp, crest, wheel, tail
 *   3. it pulls back out and drifts while the car keeps turning
 */
export const SHOTS: Shot[] = [
  {
    id: "hero",
    kind: "title",
    kicker: "911 Turbo · 996",
    body: "Scroll.",
    cam: TURN_CAM,
    target: TURN_TARGET,
    fov: TURN_FOV,
    yaw: 0,
    align: "center",
  },
  {
    id: "turn-90",
    kind: "turn",
    kicker: "Rotation",
    cam: TURN_CAM,
    target: TURN_TARGET,
    fov: TURN_FOV,
    yaw: -Math.PI / 2,
  },
  {
    id: "turn-180",
    kind: "turn",
    kicker: "Rotation",
    cam: TURN_CAM,
    target: TURN_TARGET,
    fov: TURN_FOV,
    yaw: -Math.PI,
  },
  {
    id: "turn-270",
    kind: "turn",
    kicker: "Rotation",
    cam: TURN_CAM,
    target: TURN_TARGET,
    fov: TURN_FOV,
    yaw: (-Math.PI * 3) / 2,
  },
  {
    id: "turn-360",
    kind: "turn",
    kicker: "Rotation",
    cam: TURN_CAM,
    target: TURN_TARGET,
    fov: TURN_FOV,
    yaw: -Math.PI * 2,
  },

  {
    id: "bumper",
    kind: "detail",
    cam: [4.0, 0.34, 1.7],
    target: [1.95, 0.34, 0.1],
    fov: 28,
    yaw: -Math.PI * 2,
    hud: {
      code: "01 / FRONT",
      label: "Bumper & splitter",
      specs: [
        ["Downforce", "front lip"],
        ["Intakes", "3 × radiator"],
        ["Cd", "0.34"],
      ],
      anchor: "left",
    },
  },
  {
    id: "lamp",
    kind: "detail",
    cam: [3.0, 0.98, 2.0],
    target: [1.55, 0.62, 0.5],
    fov: 24,
    yaw: -Math.PI * 2,
    hud: {
      code: "02 / LIGHT",
      label: "Teardrop headlamp",
      specs: [
        ["Unit", "Litronic"],
        ["Debut", "996, 1997"],
        ["Verdict", "still divisive"],
      ],
      anchor: "right",
    },
  },
  {
    id: "crest",
    kind: "detail",
    cam: [3.05, 1.06, 0.35],
    target: [1.75, 0.63, -0.05],
    fov: 20,
    yaw: -Math.PI * 2,
    hud: {
      code: "03 / CREST",
      label: "Stuttgart shield",
      specs: [
        ["Horse", "Stuttgart"],
        ["Antlers", "Württemberg"],
        ["Since", "1952"],
      ],
      anchor: "left",
    },
  },
  {
    id: "wheel",
    kind: "detail",
    cam: [1.75, 0.44, 3.2],
    target: [1.05, 0.36, 0.88],
    fov: 26,
    yaw: -Math.PI * 2,
    hud: {
      code: "04 / WHEEL",
      label: "Hollow-spoke & big red",
      specs: [
        ["Front", "225/40 ZR18"],
        ["Rear", "295/30 ZR18"],
        ["Calipers", "4-piston"],
      ],
      anchor: "right",
    },
  },
  {
    id: "tail",
    kind: "detail",
    cam: [-4.3, 1.02, 2.6],
    target: [-1.85, 0.72, 0.2],
    fov: 30,
    yaw: -Math.PI * 2,
    hud: {
      code: "05 / REAR",
      label: "Twin-turbo flat six",
      specs: [
        ["Engine", "3.6 L · M96/70"],
        ["Boost", "2 × KKK K04"],
        ["Wing", "deploys @ 120"],
      ],
      anchor: "left",
    },
  },

  {
    // in through the driver's window, looking across the dash
    id: "cabin",
    kind: "detail",
    cam: [0.55, 1.12, 1.35],
    target: [1.1, 0.92, -0.35],
    fov: 40,
    yaw: -Math.PI * 2,
    hud: {
      code: "06 / CABIN",
      label: "Two seats that matter",
      specs: [
        ["Wheel", "3-spoke, airbag"],
        ["Ignition", "left of the column"],
        ["Rear seats", "a formality"],
      ],
      anchor: "left",
    },
  },
  {
    id: "silhouette",
    kind: "feature",
    kicker: "Silhouette",
    title: "The line nobody redrew",
    body: "Thirty-seven years of the same fastback roofline, sloping into haunches that sit wider than the cabin. You know the shape from the shadow alone.",
    cam: [0.4, 0.95, 7.4],
    target: [0, 0.78, 0],
    fov: 30,
    yaw: -Math.PI * 2 - 0.25,
    align: "left",
    stats: [
      { label: "Length", value: 4.43, suffix: "m", decimals: 2 },
      { label: "Width", value: 1.83, suffix: "m", decimals: 2 },
      { label: "Kerb", value: 1540, suffix: "kg" },
    ],
  },
  {
    id: "power",
    kind: "feature",
    kicker: "Output",
    title: "420 hp, all four wheels",
    body: "Water-cooled flat six hung behind the rear axle, feeding a viscous all-wheel-drive system. Zero to sixty in four seconds flat, in the year 2000.",
    cam: [-6.0, 1.8, 4.6],
    target: [-0.6, 0.82, 0],
    fov: 34,
    yaw: -Math.PI * 2 - 0.85,
    align: "right",
    stats: [
      { label: "Power", value: 420, suffix: "hp" },
      { label: "0–100 km/h", value: 4.2, suffix: "s", decimals: 1 },
      { label: "Top speed", value: 305, suffix: "km/h" },
    ],
  },
  {
    // car pushed to one side so the table has room
    id: "spec",
    kind: "spec",
    kicker: "Technical data",
    title: "The numbers",
    cam: [-3.4, 1.5, 7.6],
    target: [-1.6, 0.8, 0],
    fov: 34,
    yaw: -Math.PI * 2 - 1.2,
    align: "right",
  },
  {
    id: "timeline",
    kind: "timeline",
    kicker: "1963 — today",
    title: "Eight generations",
    cam: [4.8, 3.1, 6.4],
    target: [0, 0.7, 0],
    fov: 38,
    yaw: -Math.PI * 2 - 1.45,
    align: "center",
  },
  {
    id: "paint",
    kind: "feature",
    kicker: "Finish",
    title: "A colour with a temper",
    body: "Rubystone Red — Rubinrot — the shade Porsche keeps bringing back because a car this familiar needs one thing that refuses to behave.",
    cam: [5.2, 1.15, 5.8],
    target: [0.2, 0.75, 0],
    fov: 32,
    yaw: -Math.PI * 2 - 1.6,
    align: "left",
  },
  {
    id: "final",
    kind: "final",
    kicker: "1963 — forever",
    title: "Still here",
    body: "Every generation was going to be the one that ruined it. None of them were.",
    cam: [7.4, 2.5, 7.0],
    target: [0, 0.7, 0],
    fov: 40,
    yaw: -Math.PI * 2 - 2.1,
    align: "center",
  },
  {
    // the car straightens up and leaves, same side-on framing as the intro
    id: "runaway",
    kind: "run",
    // kicker is filled in from the selected paint at render time
    kicker: "",
    title: "See you at the lights",
    cam: [0, 1.15, 9],
    target: [0, 0.8, 0],
    fov: 26,
    yaw: -Math.PI * 2,
    align: "center",
  },
];

export type Paint = {
  slug: string;
  name: string;
  code: string;
  hex: string;
  /** one word in the HUD readout */
  mood: string;
  /** sits under the hero wordmark */
  tagline: string;
  /** the finish section rewrites itself per colour */
  title: string;
  body: string;
};

/**
 * Paint options. The body material is recoloured live, and every piece of copy
 * that talks about the colour changes with it — hero, finish section, HUD.
 */
export const PAINTS: Paint[] = [
  {
    slug: "ruby-star",
    name: "Ruby Star",
    code: "M4A",
    hex: "#9e0b3d",
    mood: "Loud",
    tagline: "The one that refuses to behave",
    title: "A colour with a temper",
    body: "Rubystone Red — Rubinrot — the shade Porsche keeps bringing back because a car this familiar needs one thing that argues with it.",
  },
  {
    slug: "guards-red",
    name: "Guards Red",
    code: "84A",
    hex: "#c8102e",
    mood: "Classic",
    tagline: "The colour of every poster",
    title: "Red, and nothing else",
    body: "Indischrot. The default hero shade since the seventies — the one every kid drew on the back of a notebook, and the one every 911 is still measured against.",
  },
  {
    slug: "gt-silver",
    name: "GT Silver",
    code: "M7Z",
    hex: "#b4b8bb",
    mood: "Quiet",
    tagline: "Le Mans, in daylight",
    title: "Silver runs deep",
    body: "The Silver Arrows never really left. On a 911 it hides the creases and shows only the shape, which is precisely the point of it.",
  },
  {
    slug: "racing-yellow",
    name: "Racing Yellow",
    code: "12G",
    hex: "#efd000",
    mood: "Awake",
    tagline: "Impossible to ignore",
    title: "Yellow means business",
    body: "Speedgelb. Reserved for cars that spend their weekends on track and their weekdays being stared at across a car park.",
  },
  {
    slug: "midnight",
    name: "Midnight",
    code: "C9Z",
    hex: "#12151c",
    mood: "Stealth",
    tagline: "Seen late, heard first",
    title: "Black keeps its secrets",
    body: "Basalt after dark. The only finish that lets the intakes and the wing do all the talking, and only ever under a streetlight.",
  },
];

export const paintBySlug = (slug: string | null) =>
  PAINTS.find((p) => p.slug === slug) ?? null;

export const paintByHex = (hex: string) =>
  PAINTS.find((p) => p.hex === hex) ?? PAINTS[0];
