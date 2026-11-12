// =============================================================================
// Launch Lite: timeline + per-planet settings.
// Change durations here. Everything else follows from this file.
// =============================================================================

export const clamp01 = (v) => Math.min(1, Math.max(0, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smoothstep = (a, b, v) => {
  const k = clamp01((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};

// Seconds per phase. Total is 22 s. The player can skip at any moment.
const TIMELINE = [
  { key: "countdown", label: "COUNTDOWN", duration: 4 },
  { key: "ignition", label: "IGNITION", duration: 2 },
  { key: "liftoff", label: "LIFTOFF", duration: 5 },
  { key: "travel", label: "SPACE TRAVEL", duration: 5 },
  { key: "landing", label: "LANDING", duration: 6 },
];

let cursor = 0;
export const PHASES = TIMELINE.map((phase) => {
  const withTimes = { ...phase, start: cursor, end: cursor + phase.duration };
  cursor = withTimes.end;
  return withTimes;
});

export const TOTAL_TIME = cursor;
export const PHASE_BY_KEY = Object.fromEntries(PHASES.map((p) => [p.key, p]));

// The 3D "stage" changes here (launch pad -> deep space -> surface).
// A short fade to black hides each cut.
export const STAGE_CUTS = [PHASE_BY_KEY.liftoff.end, PHASE_BY_KEY.travel.end];

export function getPhase(t) {
  for (const phase of PHASES) {
    if (t < phase.end) {
      return { ...phase, local: clamp01((t - phase.start) / phase.duration) };
    }
  }
  const last = PHASES[PHASES.length - 1];
  return { ...last, local: 1 };
}

// 0 = fully visible, 1 = black. Fade in at the start, dip at each stage cut,
// and fade out at the very end.
export function fadeAt(t) {
  const tri = (center, width) => Math.max(0, 1 - Math.abs(t - center) / width);
  const fadeIn = Math.max(0, 1 - t / 0.8);
  const fadeOut = clamp01(t - (TOTAL_TIME - 1));
  return Math.max(fadeIn, tri(STAGE_CUTS[0], 0.5), tri(STAGE_CUTS[1], 0.5), fadeOut);
}

// -----------------------------------------------------------------------------
// Planet settings
//
// textureUrl: OPTIONAL equirectangular NASA map (a flat, wide world map).
//   If the file exists in public/images/, it is wrapped on the sphere.
//   If it does not exist, the sphere gets simple procedural colours instead.
//   Do NOT use the round "globe" photos here, they will look stretched.
// -----------------------------------------------------------------------------

export const EARTH_SPEC = {
  colors: ["#1d4f91", "#2f7d4f", "#f2f6fa"],
  atmosphere: "#6bb7ff",
  cap: true,
  textureUrl: "/images/earth-map.jpg",
};

export const PLANETS = {
  moon: {
    key: "moon",
    outpost: "MOON OUTPOST",
    accent: "#7dd3fc",
    planet: {
      colors: ["#8a909b", "#6c727d", "#b9bec7"],
      atmosphere: null,
      cap: false,
      textureUrl: "/images/moon-map.jpg",
    },
    landing: {
      ground: "#747b87",
      rock: "#7d848f",
      dust: "#b6bcc6",
      sky: "#04060c",
      fog: "#04060c",
      fogNear: 70,
      fogFar: 190,
      starOpacity: 1,
      exponent: 2.2, // higher = softer, floatier touchdown
      earthInSky: true,
      sun: { color: "#fff3d7", intensity: 3.1 },
    },
    captions: {
      countdown: "All systems are go. The crew is strapped in.",
      ignition: "Engines ignite! The whole pad is shaking.",
      liftoff: "To escape Earth’s gravity, a rocket needs about 40,000 km/h.",
      travel: "The Moon is about 384,000 km away. Apollo crews needed about 3 days to get there.",
      landing: "The Moon has about one-sixth of Earth’s gravity, so landing is slow and floaty.",
    },
  },
  mars: {
    key: "mars",
    outpost: "MARS OUTPOST",
    accent: "#ffad8a",
    planet: {
      colors: ["#9a4a36", "#7a3a2c", "#c98a62"],
      atmosphere: "#d98b6a",
      cap: true,
      textureUrl: "/images/mars-map.jpg",
    },
    landing: {
      ground: "#854536",
      rock: "#a75b43",
      dust: "#c98a6b",
      sky: "#3a2224",
      fog: "#3a2224",
      fogNear: 35,
      fogFar: 120,
      starOpacity: 0.3,
      exponent: 1.7,
      earthInSky: false,
      sun: { color: "#ffd0b5", intensity: 2.3 },
    },
    captions: {
      countdown: "All systems are go. The crew is strapped in.",
      ignition: "Engines ignite! The whole pad is shaking.",
      liftoff: "To escape Earth’s gravity, a rocket needs about 40,000 km/h.",
      travel: "Mars is at least 55 million km away, so a real trip takes about 6 to 9 months.",
      landing: "Mars has thin air and about 38% of Earth’s gravity. Landing there is tricky.",
    },
  },
};