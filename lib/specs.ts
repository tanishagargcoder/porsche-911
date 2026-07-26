/** 996.1 Turbo, as sold in 2000. */
export const SPECS: { group: string; rows: [string, string][] }[] = [
  {
    group: "Engine",
    rows: [
      ["Layout", "Rear-mounted flat six"],
      ["Displacement", "3600 cc"],
      ["Bore × stroke", "100.0 × 76.4 mm"],
      ["Induction", "Two KKK K04 turbochargers"],
      ["Power", "420 hp @ 6000 rpm"],
      ["Torque", "560 Nm @ 2700–4600 rpm"],
    ],
  },
  {
    group: "Drivetrain",
    rows: [
      ["Drive", "All-wheel drive"],
      ["Gearbox", "6-speed manual"],
      ["Optional", "5-speed Tiptronic S"],
    ],
  },
  {
    group: "Performance",
    rows: [
      ["0–100 km/h", "4.2 s"],
      ["0–200 km/h", "13.6 s"],
      ["Top speed", "305 km/h"],
    ],
  },
  {
    group: "Body",
    rows: [
      ["Length", "4435 mm"],
      ["Width", "1830 mm"],
      ["Height", "1295 mm"],
      ["Wheelbase", "2350 mm"],
      ["Kerb weight", "1540 kg"],
      ["Drag coefficient", "0.34"],
    ],
  },
];

export type Generation = {
  code: string;
  years: string;
  note: string;
  current?: boolean;
};

export const GENERATIONS: Generation[] = [
  { code: "901 / 911", years: "1963", note: "The original, air-cooled" },
  { code: "G-series", years: "1973", note: "Impact bumpers, first Turbo" },
  { code: "964", years: "1989", note: "Modernised, still air-cooled" },
  { code: "993", years: "1993", note: "The last air-cooled 911" },
  { code: "996", years: "1997", note: "Water-cooled. This one.", current: true },
  { code: "997", years: "2004", note: "Round headlamps return" },
  { code: "991", years: "2011", note: "Longer, wider, all-alloy" },
  { code: "992", years: "2019", note: "The one in showrooms" },
];
