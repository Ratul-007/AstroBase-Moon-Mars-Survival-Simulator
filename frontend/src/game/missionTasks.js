/*
 * FIELD TASKS FOR EVERY MISSION EVENT
 *
 * Every daily event (Moon 20 / Mars 30) is completed by playing in the
 * 3D world. A task is a list of steps. Each step is one station the
 * astronaut must reach and use (press its key).
 *
 *  - "safe" stations are inside the blue safe zone.
 *  - "red" stations are OUTSIDE the safe zone, so oxygen drains while
 *    the player is there. Distance grows as the campaign progresses:
 *      first ~30%  -> near ring  (32-38 m)
 *      next  ~40%  -> mid ring   (44-54 m)
 *      last  ~30%  -> far ring   (58-68 m)
 *
 * Station positions are generated from the event id, so they are
 * deterministic: the same event always has its station in the same place.
 *
 * Day 1 of the Moon (moon-01) stays a short tutorial at the existing
 * solar array inside the safe zone.
 */

const DURATION = { moon: 20, mars: 30 };
const RING = { near: [32, 38], mid: [44, 54], far: [58, 68] };

const KIND_LABEL = {
  solar_field: "Remote Solar Field",
  ice_extractor: "Ice Extractor",
  oxygen_gen: "Oxygen Generator",
  greenhouse: "Greenhouse Module",
  repair_bay: "Repair Bay",
  instrument: "Exposed Instrument",
  shelter: "Radiation Shelter",
  exposed_equipment: "Exposed Equipment",
  medical: "Medical Bay",
  sample: "Rock Sample Site",
  lab: "Science Lab",
  supply_drop: "Supply Drop",
};

// Existing objects in the outpost (see MissionScene INTERACTION_TARGETS).
const CACHE_POS = { x: 5.5, z: -3.5 };
const SOLAR_POS = { x: -2.2, z: 1.1 };

function hash01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const round1 = (value) => Math.round(value * 10) / 10;

function ringFor(event) {
  const environment = event.id.startsWith("mars") ? "mars" : "moon";
  const progress = (event.day - 1) / (DURATION[environment] - 1);

  if (progress < 0.3) return RING.near;
  if (progress < 0.7) return RING.mid;
  return RING.far;
}

// ---------- step builders ----------

const cacheStep = (action, doneText) => ({
  stationId: "supply-cache-01",
  kind: "cache",
  label: "Emergency Supply Cache",
  zone: "safe",
  existing: true,
  key: "e",
  position: CACHE_POS,
  action,
  doneText,
});

function outsideStep(event, suffix, kind, action, doneText, options = {}) {
  const seed = `${event.id}:${suffix}`;
  const angle =
    options.angle ?? hash01(`${seed}:angle`) * Math.PI * 2;
  const [min, max] = options.ring ?? ringFor(event);
  const distance = min + hash01(`${seed}:dist`) * (max - min);

  return {
    stationId: seed,
    kind,
    label: options.label ?? KIND_LABEL[kind],
    zone: "red",
    existing: false,
    key: "e",
    angle,
    position: {
      x: round1(Math.cos(angle) * distance),
      z: round1(Math.sin(angle) * distance),
    },
    action,
    doneText,
  };
}

function insideStep(event, suffix, kind, action, doneText) {
  const seed = `${event.id}:${suffix}`;
  const angle = hash01(`${seed}:angle`) * Math.PI * 2;
  const distance = 9 + hash01(`${seed}:dist`) * 4; // clear of existing objects

  return {
    stationId: seed,
    kind,
    label: KIND_LABEL[kind],
    zone: "safe",
    existing: false,
    key: "e",
    angle,
    position: {
      x: round1(Math.cos(angle) * distance),
      z: round1(Math.sin(angle) * distance),
    },
    action,
    doneText,
  };
}

// ---------- one template per event type ----------

const TYPE_TASKS = {
  power: {
    title: "Restore power in the field",
    success: "You installed the spare part and restored power generation.",
    insight: {
      title: "Solar Energy and Power Management",
      fact: "Dust, shadows, panel orientation and equipment faults can reduce solar output. Habitat systems compete for limited power.",
      takeaway: "Preserve energy reserves and prioritize essential habitat systems.",
    },
    steps: (e) => [
      cacheStep("Collect a spare power component", "Spare part collected."),
      outsideStep(e, "a", "solar_field", "Install the part and restore the solar field", "Part installed."),
    ],
  },

  water: {
    title: "Repair the water system",
    success: "You replaced the faulty section and restored water recovery.",
    insight: {
      title: "Water Is a Critical Resource",
      fact: "Water supports drinking, hygiene and other life-support needs. Recycling and leak prevention improve resource availability.",
      takeaway: "Monitor reserves, prevent leaks and reuse water where possible.",
    },
    steps: (e) => [
      cacheStep("Collect a replacement pipe section", "Replacement part collected."),
      outsideStep(e, "a", "ice_extractor", "Fit the part and restart the extractor", "Part fitted."),
    ],
  },

  life: {
    title: "Restart the life-support system",
    success: "You installed the part and the life-support system is stable again.",
    insight: {
      title: "Keeping the Crew Breathing",
      fact: "A crewed habitat must maintain a safe breathable atmosphere through oxygen supply, carbon-dioxide removal and pressure monitoring.",
      takeaway: "Monitor life-support systems and maintain backup plans.",
    },
    steps: (e) => [
      cacheStep("Collect a life-support component", "Component collected."),
      outsideStep(e, "a", "oxygen_gen", "Install the component and restart the generator", "Component installed."),
    ],
  },

  food: {
    title: "Restore food production",
    success: "You repaired the greenhouse unit and crop production recovered.",
    insight: {
      title: "Food for Long-Duration Missions",
      fact: "Growing food in space depends on water, lighting, nutrients, energy and suitable environmental conditions.",
      takeaway: "Plan food reserves across the entire mission, not just the current day.",
    },
    steps: (e) => [
      cacheStep("Collect a greenhouse repair kit", "Repair kit collected."),
      outsideStep(e, "a", "greenhouse", "Repair the greenhouse module", "Module repaired."),
    ],
  },

  equipment: {
    title: "Repair the faulty equipment",
    success: "You fitted the part and the equipment is reliable again.",
    insight: {
      title: "Habitat Maintenance and Reliability",
      fact: "A remote habitat depends on reliable equipment, seals and control systems. Small faults can become serious if ignored.",
      takeaway: "Investigate faults early, follow maintenance procedures and preserve backup equipment.",
    },
    steps: (e) => [
      cacheStep("Collect a spare part", "Spare part collected."),
      outsideStep(e, "a", "repair_bay", "Fit the part and repair the equipment", "Part fitted."),
    ],
  },

  radiation: {
    title: "Protect the crew from radiation",
    success: "You recovered the exposed instrument and sheltered safely.",
    insight: {
      title: "Radiation Protection",
      fact: "The Moon and Mars lack Earth's global magnetic field and thick atmosphere, so space radiation is an important crew-safety consideration.",
      takeaway: "Use suitable shielding, monitor radiation and follow storm-response procedures.",
    },
    steps: (e) => [
      outsideStep(e, "a", "instrument", "Retrieve the exposed instrument", "Instrument recovered."),
      insideStep(e, "b", "shelter", "Return to the radiation shelter", "Safe in the shelter."),
    ],
  },

  weather: {
    title: "Secure the outpost before the storm",
    success: "You secured the exposed equipment and reduced the storm risk.",
    insight: {
      title: "Dust Is an Engineering Challenge",
      fact: "Lunar dust is abrasive and Martian dust can reduce sunlight reaching solar panels. Exposed equipment needs protection.",
      takeaway: "Protect equipment, monitor dust and schedule maintenance.",
    },
    steps: (e) => {
      const first = outsideStep(e, "a", "exposed_equipment", "Secure the first piece of exposed equipment", "First unit secured.", { label: "Exposed Equipment A" });

      // Second unit on the opposite side so the route crosses the safe zone.
      const second = outsideStep(e, "b", "exposed_equipment", "Secure the second piece of exposed equipment", "Second unit secured.", {
        label: "Exposed Equipment B",
        ring: RING.near,
        angle: first.angle + Math.PI + (hash01(`${e.id}:skew`) - 0.5) * 0.6,
      });

      return [first, second];
    },
  },

  crew: {
    title: "Support the crew",
    success: "You delivered the supplies and the crew is rested and ready.",
    insight: {
      title: "Crew Safety and Teamwork",
      fact: "Long-duration missions require teamwork, careful scheduling, rest and attention to crew wellbeing.",
      takeaway: "Balance immediate tasks with long-term crew safety.",
    },
    steps: (e) => [
      cacheStep("Collect medical supplies", "Medical supplies collected."),
      insideStep(e, "a", "medical", "Deliver the supplies to the medical bay", "Supplies delivered."),
    ],
  },

  science: {
    title: "Collect a science sample",
    success: "You brought back a sample and the lab recorded useful data.",
    insight: {
      title: "Scientific Exploration",
      fact: "Space missions have limited time, power and storage, so research must be balanced against operational safety.",
      takeaway: "Prioritize useful experiments without endangering essential systems.",
    },
    steps: (e) => [
      outsideStep(e, "a", "sample", "Collect the rock sample", "Sample collected."),
      insideStep(e, "b", "lab", "Deliver the sample to the science lab", "Sample delivered."),
    ],
  },

  logistics: {
    title: "Recover and deliver supplies",
    success: "You recovered the supply drop and delivered it to the outpost.",
    insight: {
      title: "Logistics Far From Earth",
      fact: "Resupply is slow and expensive, so crews must track supplies carefully and prioritize critical items.",
      takeaway: "Plan deliveries around available resources and crew safety.",
    },
    steps: (e) => [
      outsideStep(e, "a", "supply_drop", "Recover the supply drop", "Supplies recovered."),
      cacheStep("Deliver the supplies to the cache", "Supplies delivered."),
    ],
  },
};

// Day 1 tutorial: short, inside the safe zone, uses the existing solar array.
const TUTORIAL_TASKS = {
  "moon-01": {
    title: "Clear and repair the solar array",
    successTitle: "Solar Array Cleaned and Repaired",
    successText:
      "You cleaned the dust from the panels and restored power generation.",
    learningInsight: {
      title: "Lunar Dust and Solar Power",
      fact: "Lunar dust is fine, abrasive and clings to surfaces. Dust on solar panels reduces how much sunlight becomes electricity.",
      takeaway:
        "Inspect and clean power-generation equipment before energy reserves become critical.",
    },
    steps: [
      {
        stationId: "solar-array-01",
        kind: "solar",
        label: "Solar Array",
        zone: "safe",
        existing: true,
        key: "f",
        position: SOLAR_POS,
        action: "Press F at the solar array to clear the dust and restore output",
        doneText: "Solar array repaired.",
      },
    ],
  },
};

function makeTask(event, spec) {
  return {
    type: event.type,
    choiceIndex: 0, // best outcome, only reachable by playing
    abortChoiceIndex: event.choices.length - 1, // last-resort penalty option
    bonusScore: 5 + (spec.steps.length - 1) * 2,
    badge: "FIELD TASK",
    title: spec.title,
    steps: spec.steps,
    successTitle: spec.successTitle,
    successText: spec.successText,
    learningInsight: spec.learningInsight,
  };
}

function buildTask(event) {
  const tutorial = TUTORIAL_TASKS[event.id];
  if (tutorial) return makeTask(event, tutorial);

  const spec = TYPE_TASKS[event.type];
  if (!spec) return null;

  return makeTask(event, {
    title: spec.title,
    steps: spec.steps(event),
    successTitle: `${event.title}: Resolved`,
    successText: spec.success,
    learningInsight: spec.insight,
  });
}

/*
 * Attaches a field task to an event. The in-field choice gets its text
 * from the task and a score bonus, so playing is always better than
 * aborting. Events without a task are returned unchanged.
 */
export function attachTask(event) {
  const task = buildTask(event);
  if (!task) return event;

  const choices = event.choices.map((choice, index) =>
    index === task.choiceIndex
      ? {
          ...choice,
          label: task.successTitle,
          description: task.successText,
          feedback: `${event.title}: ${task.successText}`,
          score: choice.score + task.bonusScore,
        }
      : choice
  );

  return { ...event, task, choices };
}