/**
 * The configurable bits. Material names come from the Sketchfab model:
 * `rim1`/`rim2`/`rim_bolts` are the wheel faces, and `suport` is the brake
 * caliper — identified by position, since it sits 23 cm off the axle at the
 * edge of the disc rather than being centred on it like the hub.
 */

export type Wheel = {
  slug: string;
  name: string;
  hex: string;
  metalness: number;
  roughness: number;
  note: string;
};

export const WHEELS: Wheel[] = [
  {
    slug: "silver",
    name: "Sport Classic Silver",
    hex: "#c6c9ce",
    metalness: 1,
    roughness: 0.2,
    note: "18-inch hollow-spoke",
  },
  {
    slug: "black",
    name: "Satin Black",
    hex: "#191a1e",
    metalness: 0.92,
    roughness: 0.4,
    note: "18-inch, painted",
  },
  {
    slug: "platinum",
    name: "Platinum Satin",
    hex: "#8b8f96",
    metalness: 1,
    roughness: 0.46,
    note: "18-inch, brushed",
  },
];

export type Caliper = { slug: string; name: string; hex: string };

export const CALIPERS: Caliper[] = [
  { slug: "red", name: "Red", hex: "#bf1220" },
  { slug: "yellow", name: "Yellow", hex: "#efc400" },
  { slug: "black", name: "Black", hex: "#131418" },
];

export const wheelBySlug = (slug: string | null) =>
  WHEELS.find((w) => w.slug === slug) ?? WHEELS[0];

export const caliperBySlug = (slug: string | null) =>
  CALIPERS.find((c) => c.slug === slug) ?? CALIPERS[0];
