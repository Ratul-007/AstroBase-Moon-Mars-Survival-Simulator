import { attachTask } from "./missionTasks";

export const RESOURCE_META = {
  power: { label: "Power", unit: "%", color: "#f5c451" },
  water: { label: "Water", unit: "%", color: "#42bdf5" },
  food: { label: "Food", unit: "%", color: "#78d99a" },
  oxygen: { label: "Oxygen", unit: "%", color: "#b8c7ff" },
  shielding: {
    label: "Radiation Shielding",
    unit: "%",
    color: "#c49bff",
  },
};

export const INITIAL_RESOURCES = {
  power: 85,
  water: 80,
  food: 90,
  oxygen: 95,
  shielding: 85,
};

export const MISSION_DURATION = { moon: 20, mars: 30 };

const DAILY_CONSUMPTION = {
  power: 1,
  water: 1,
  food: 1,
  oxygen: 1,
  shielding: 0,
};

const EVENT_DATA = {
  moon: [
    ["moon-01", "Solar Array Dust Buildup", "Dust is reducing the habitat's solar power generation.", "power"],
    ["moon-02", "Water Recycling Leak", "A leak has been detected in the water recycling line.", "water"],
    ["moon-03", "Air Filter Malfunction", "The habitat's air filtration system is operating inefficiently.", "life"],
    ["moon-04", "Solar Radiation Alert", "A solar radiation event is approaching the lunar outpost.", "radiation"],
    ["moon-05", "Battery Temperature Warning", "A battery module is heating up beyond its normal range.", "power"],
    ["moon-06", "Food Storage Problem", "A refrigeration fault threatens part of the food supply.", "food"],
    ["moon-07", "Oxygen Regulator Fault", "The oxygen regulator is delivering inconsistent pressure.", "life"],
    ["moon-08", "Lunar Rover Breakdown", "The rover has stopped during an important supply trip.", "equipment"],
    ["moon-09", "Water Ice Extraction Delay", "The ice extraction system is producing less water than expected.", "water"],
    ["moon-10", "Habitat Seal Inspection", "A pressure sensor indicates a possible habitat seal problem.", "equipment"],
    ["moon-11", "Dust Storm Approaching", "Fine lunar dust is accumulating around exposed equipment.", "weather"],
    ["moon-12", "Power Distribution Fault", "A power distribution unit is limiting electricity to essential systems.", "power"],
    ["moon-13", "Crew Fatigue Report", "Crew members report fatigue after an intensive work period.", "crew"],
    ["moon-14", "Crop Growth Setback", "The experimental food-growing unit is showing signs of stress.", "food"],
    ["moon-15", "Communication Antenna Fault", "The outpost antenna is losing signal quality.", "equipment"],
    ["moon-16", "Radiation Shelter Inspection", "The radiation shelter needs additional protection before the next solar event.", "radiation"],
    ["moon-17", "Water Purification Alert", "The water purification system has detected a quality problem.", "water"],
    ["moon-18", "Life Support Pump Failure", "A pump in the life-support loop has stopped working correctly.", "life"],
    ["moon-19", "Scientific Equipment Overload", "A science experiment is consuming more power than planned.", "science"],
    ["moon-20", "Final Habitat Systems Check", "The crew must prepare all critical systems for the final mission review.", "logistics"],
  ],
  mars: [
    ["mars-01", "Regional Dust Storm", "A Martian dust storm is reducing solar generation across the outpost.", "weather"],
    ["mars-02", "Water Recovery Failure", "The water recovery system has stopped recycling water efficiently.", "water"],
    ["mars-03", "Oxygen Generator Warning", "The oxygen generation unit is producing less oxygen than required.", "life"],
    ["mars-04", "Radiation Exposure Alert", "Elevated radiation levels require immediate crew protection.", "radiation"],
    ["mars-05", "Solar Panel Degradation", "Accumulated dust and wear have reduced solar panel performance.", "power"],
    ["mars-06", "Food Inventory Shortage", "Food supplies are lower than projected for the current mission day.", "food"],
    ["mars-07", "Habitat Pressure Fluctuation", "The habitat pressure system is reporting unstable readings.", "life"],
    ["mars-08", "Rover Wheel Damage", "A rover has suffered wheel damage during surface operations.", "equipment"],
    ["mars-09", "Ice Drill Overheating", "The subsurface ice drill is overheating during water extraction.", "equipment"],
    ["mars-10", "Battery Storage Fault", "A battery storage unit is failing to hold its expected charge.", "power"],
    ["mars-11", "Greenhouse Temperature Drop", "The greenhouse temperature has fallen below the preferred range.", "food"],
    ["mars-12", "Carbon Dioxide Filter Alert", "The air purification system needs urgent maintenance.", "life"],
    ["mars-13", "Communication Delay", "A communications fault is delaying an important mission update.", "equipment"],
    ["mars-14", "Radiation Shelter Upgrade", "The crew has an opportunity to reinforce the storm shelter.", "radiation"],
    ["mars-15", "Water Tank Contamination", "A sensor has detected possible contamination in a water tank.", "water"],
    ["mars-16", "Power Grid Imbalance", "The outpost's power distribution system is under unexpected load.", "power"],
    ["mars-17", "Crew Medical Check", "A crew member needs rest and a scheduled medical assessment.", "crew"],
    ["mars-18", "Crop Nutrient Deficiency", "The greenhouse crop system is showing signs of nutrient deficiency.", "food"],
    ["mars-19", "Robotic Arm Failure", "A robotic maintenance arm has stopped during a repair task.", "equipment"],
    ["mars-20", "Dust Filter Clogging", "Fine Martian dust is clogging an external air intake filter.", "life"],
    ["mars-21", "Unexpected Energy Demand", "An experiment is drawing more energy than the daily plan allows.", "science"],
    ["mars-22", "Spare Parts Shortage", "The maintenance team has discovered that a critical spare part is missing.", "logistics"],
    ["mars-23", "Water Ice Survey Opportunity", "A new surface reading suggests a more promising nearby ice deposit.", "science"],
    ["mars-24", "Greenhouse Lighting Fault", "Artificial greenhouse lights are consuming power without providing enough light.", "food"],
    ["mars-25", "Dust Storm Shelter Protocol", "A second dust front is approaching and the crew must secure exposed equipment.", "weather"],
    ["mars-26", "Oxygen Sensor Drift", "Two oxygen sensors are producing conflicting measurements.", "life"],
    ["mars-27", "Rover Navigation Error", "The rover navigation system is drifting from its planned route.", "equipment"],
    ["mars-28", "Water Pipe Pressure Drop", "Pressure loss suggests a developing leak in a water supply pipe.", "water"],
    ["mars-29", "Crew Workload Imbalance", "Several crew tasks are overdue and fatigue is increasing.", "crew"],
    ["mars-30", "Final Mission Readiness Review", "The crew must prepare the outpost for the final survival assessment.", "logistics"],
  ],
};

/*
 * Each event type has a different strategy.
 * The displayed labels and feedback also include the current event,
 * so the learning log identifies the actual incident being handled.
 */
const STRATEGIES = {
  power: [
    {
      action: "Repair and stabilize the power system",
      effects: { power: 8, water: -2 },
      score: 15,
      feedback: "Repair work improved power reliability.",
    },
    {
      action: "Switch to essential-load mode",
      effects: { power: 4, oxygen: -1 },
      score: 8,
      feedback: "Essential-load mode conserved energy.",
    },
    {
      action: "Defer the power intervention",
      effects: { power: -10 },
      score: -12,
      feedback: "The unresolved power problem increased risk.",
    },
  ],
  water: [
    {
      action: "Repair and test the water system",
      effects: { water: 10, power: -4 },
      score: 15,
      feedback: "Repairs improved water recovery.",
    },
    {
      action: "Ration water and isolate the fault",
      effects: { water: 4, food: -1 },
      score: 8,
      feedback: "Rationing reduced pressure on the water supply.",
    },
    {
      action: "Delay water-system maintenance",
      effects: { water: -10 },
      score: -12,
      feedback: "The unresolved fault reduced water security.",
    },
  ],
  life: [
    {
      action: "Prioritize life-support repair",
      effects: { oxygen: 10, power: -5 },
      score: 18,
      feedback: "Life-support intervention improved crew safety.",
    },
    {
      action: "Activate backup life-support equipment",
      effects: { oxygen: 5, food: -2 },
      score: 9,
      feedback: "Backup equipment reduced immediate risk.",
    },
    {
      action: "Postpone life-support maintenance",
      effects: { oxygen: -10 },
      score: -15,
      feedback: "Delaying maintenance left the crew exposed to risk.",
    },
  ],
  radiation: [
    {
      action: "Move the crew into the radiation shelter",
      effects: { shielding: 10, power: -4 },
      score: 18,
      feedback: "Shelter procedures improved radiation protection.",
    },
    {
      action: "Reinforce the habitat shielding",
      effects: { shielding: 6, food: -1 },
      score: 10,
      feedback: "Additional shielding reduced exposure risk.",
    },
    {
      action: "Continue without additional protection",
      effects: { shielding: -12 },
      score: -15,
      feedback: "The crew remained at greater radiation risk.",
    },
  ],
  food: [
    {
      action: "Restore food storage or crop production",
      effects: { food: 10, power: -4 },
      score: 15,
      feedback: "Food preservation and production improved.",
    },
    {
      action: "Reallocate food and reduce waste",
      effects: { food: 4, water: -1 },
      score: 8,
      feedback: "Careful allocation extended available food supplies.",
    },
    {
      action: "Leave the food issue unresolved",
      effects: { food: -10 },
      score: -12,
      feedback: "The food shortage became more difficult to manage.",
    },
  ],
  equipment: [
    {
      action: "Perform a controlled equipment repair",
      effects: { power: -4, oxygen: 2 },
      score: 15,
      feedback: "Targeted maintenance improved equipment reliability.",
    },
    {
      action: "Isolate the fault and use a backup",
      effects: { power: -2, shielding: 1 },
      score: 8,
      feedback: "The backup plan reduced immediate disruption.",
    },
    {
      action: "Continue without resolving the fault",
      effects: { power: -6 },
      score: -10,
      feedback: "The equipment fault remained a mission risk.",
    },
  ],
  crew: [
    {
      action: "Schedule crew rest and a health assessment",
      effects: { food: -2, oxygen: 2 },
      score: 15,
      feedback: "Rest and monitoring supported crew readiness.",
    },
    {
      action: "Redistribute tasks across the crew",
      effects: { power: 1, food: -1 },
      score: 8,
      feedback: "A revised workload reduced crew pressure.",
    },
    {
      action: "Maintain the full workload",
      effects: { food: -4, oxygen: -2 },
      score: -10,
      feedback: "The demanding schedule increased crew strain.",
    },
  ],
  science: [
    {
      action: "Run a monitored, limited experiment",
      effects: { power: -4, water: 2 },
      score: 15,
      feedback: "The controlled experiment returned useful data.",
    },
    {
      action: "Reduce the experiment's operating time",
      effects: { power: -2 },
      score: 8,
      feedback: "Scaling back preserved energy.",
    },
    {
      action: "Run the experiment without limits",
      effects: { power: -9, oxygen: -1 },
      score: -12,
      feedback: "Uncontrolled operation placed extra pressure on resources.",
    },
  ],
  weather: [
    {
      action: "Secure exposed equipment and shelter the crew",
      effects: { power: -4, shielding: 4 },
      score: 15,
      feedback: "Securing the outpost reduced environmental risk.",
    },
    {
      action: "Suspend nonessential surface operations",
      effects: { power: 2, food: -1 },
      score: 8,
      feedback: "Reduced surface activity lowered immediate risk.",
    },
    {
      action: "Continue surface operations during the warning",
      effects: { power: -7, shielding: -7 },
      score: -12,
      feedback: "Exposed operations increased resource and safety risks.",
    },
  ],
  logistics: [
    {
      action: "Prioritize critical supplies and safety checks",
      effects: { water: 3, food: 3, power: -3 },
      score: 15,
      feedback: "Critical supplies received priority.",
    },
    {
      action: "Replan the schedule around available resources",
      effects: { power: 2, food: -1 },
      score: 8,
      feedback: "The revised schedule reduced immediate pressure.",
    },
    {
      action: "Keep the existing plan without adjustments",
      effects: { water: -3, food: -3 },
      score: -10,
      feedback: "The unchanged plan left supply risks unresolved.",
    },
  ],
};

function buildEvents(environment) {
  return EVENT_DATA[environment].map(
    ([id, title, description, type], index) => ({
      id,
      title,
      description,
      type,
      severity: ["life", "radiation", "water"].includes(type)
        ? "critical"
        : "warning",
      day: index + 1,
      choices: STRATEGIES[type].map((strategy, choiceIndex) => ({
        id: `${id}-choice-${choiceIndex + 1}`,
        label: `${strategy.action}: ${title}`,
        description: `${strategy.action} in response to ${title}.`,
        effects: { ...strategy.effects },
        score: strategy.score,
        feedback: `${title}: ${strategy.feedback}`,
      })),
    })
  );
}

// attachTask adds a 3D field task to events that have one (see missionTasks.js).
// All other events are returned unchanged.
export const MOON_EVENTS = buildEvents("moon").map(attachTask);
export const MARS_EVENTS = buildEvents("mars").map(attachTask);
export const MISSION_EVENTS = MOON_EVENTS;

export const INITIAL_OBJECTIVES = [
  {
    id: "stable-power",
    title: "Maintain stable power",
    description: "Keep power above zero throughout the campaign.",
    completed: false,
  },
  {
    id: "protect-crew",
    title: "Protect the crew",
    description:
      "Keep water, food, oxygen and radiation shielding above zero.",
    completed: false,
  },
  {
    id: "resolve-events",
    title: "Complete the campaign",
    description: "Resolve every daily mission event.",
    completed: false,
  },
];

const clamp = (value) => Math.min(100, Math.max(0, value));

export function getResourceStatus(value) {
  if (value <= 0) return "critical";
  if (value < 25) return "low";
  if (value < 50) return "caution";
  return "stable";
}

function getEventsForMission(environment) {
  return environment === "mars" ? MARS_EVENTS : MOON_EVENTS;
}

function hasCriticalFailure(resources) {
  return Object.keys(RESOURCE_META).some(
    (resource) => resources[resource] <= 0
  );
}

function updateObjectives(state) {
  const powerSafe = state.resources.power > 0;
  const crewSafe = [
    state.resources.water,
    state.resources.food,
    state.resources.oxygen,
    state.resources.shielding,
  ].every((value) => value > 0);

  return state.objectives.map((objective) => {
    if (objective.id === "stable-power") {
      return { ...objective, completed: state.eventCount > 0 && powerSafe };
    }

    if (objective.id === "protect-crew") {
      return { ...objective, completed: state.eventCount > 0 && crewSafe };
    }

    if (objective.id === "resolve-events") {
      return {
        ...objective,
        completed: state.eventCount >= state.duration,
      };
    }

    return objective;
  });
}

export function createMissionState(environment = "moon") {
  const safeEnvironment = environment === "mars" ? "mars" : "moon";
  const events = getEventsForMission(safeEnvironment);

  return {
    environment: safeEnvironment,
    duration: MISSION_DURATION[safeEnvironment],
    day: 1,
    score: 0,
    resources: { ...INITIAL_RESOURCES },
    crewStatus: "Nominal",
    missionStatus: "active",
    currentEvent: events[0],
    resolvedEventIds: [],
    objectives: INITIAL_OBJECTIVES.map((objective) => ({
      ...objective,
      completed: false,
    })),
    flags: {},
    eventCount: 0,
    log: ["Mission initialized. All habitat systems are online."],
  };
}

export function resolveDecision(state, choiceId) {
  if (state.missionStatus !== "active" || !state.currentEvent) {
    return state;
  }

  const event = state.currentEvent;

  if (state.resolvedEventIds.includes(event.id)) {
    return state;
  }

  const choice = event.choices.find((item) => item.id === choiceId);
  if (!choice) return state;

  const resources = { ...state.resources };

  // Apply the selected decision's effects.
  for (const [resource, change] of Object.entries(choice.effects)) {
    if (resource in resources) {
      resources[resource] = clamp(resources[resource] + change);
    }
  }

  // Apply daily survival costs after the decision.
  for (const [resource, cost] of Object.entries(DAILY_CONSUMPTION)) {
    resources[resource] = clamp(resources[resource] - cost);
  }

  const eventCount = state.eventCount + 1;
  const score = state.score + choice.score;
  const resolvedEventIds = [...state.resolvedEventIds, event.id];

  const updated = {
    ...state,
    score,
    resources,
    eventCount,
    resolvedEventIds,
    currentEvent: null,
    flags: { ...state.flags, ...(choice.flags ?? {}) },
    crewStatus: "Nominal",
    missionStatus: "active",
    log: [
      `${event.title}: ${choice.label}. ${choice.feedback}`,
      ...state.log,
    ].slice(0, 8),
  };

  updated.crewStatus = hasCriticalFailure(resources)
    ? "Critical"
    : Math.min(...Object.values(resources)) < 25
      ? "At Risk"
      : "Nominal";

  updated.objectives = updateObjectives(updated);

  // Any critical resource at 0% means immediate failure.
  if (hasCriticalFailure(resources)) {
    updated.missionStatus = "failed";
    updated.log = [
      "MISSION FAILED — A critical habitat resource reached 0%.",
      ...updated.log,
    ].slice(0, 8);

    return updated;
  }

  // End-of-campaign validation.
  if (eventCount >= state.duration) {
    const objectivesComplete = updated.objectives.every(
      (objective) => objective.completed
    );

    updated.missionStatus =
      eventCount === state.duration &&
      resolvedEventIds.length === state.duration &&
      score > 0 &&
      objectivesComplete
        ? "success"
        : "failed";

    updated.currentEvent = null;
    updated.log = [
      updated.missionStatus === "success"
        ? `MISSION SUCCESS — All ${state.duration} events completed with all objectives achieved and a positive score.`
        : "MISSION FAILED — The campaign ended without meeting every success condition.",
      ...updated.log,
    ].slice(0, 8);

    return updated;
  }

  // Advance exactly one day. Each event has a unique ID.
  const events = getEventsForMission(state.environment);
  updated.day = eventCount + 1;
  updated.currentEvent = events[eventCount];

  return updated;
}

export function getMissionSummary(state) {
  return {
    environment: state.environment,
    score: state.score,
    day: state.day,
    duration: state.duration,
    eventCount: state.eventCount,
    completedObjectives: state.objectives.filter(
      (objective) => objective.completed
    ).length,
    totalObjectives: state.objectives.length,
    missionStatus: state.missionStatus,
    crewStatus: state.crewStatus,
    resources: { ...state.resources },
  };
}