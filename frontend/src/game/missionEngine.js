
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

export const MISSION_DURATION = {
  moon: 20,
  mars: 30,
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

const CHOICE_PROFILES = {
  power: [
    {
      label: "Repair the power system",
      description: "Use available resources to restore reliable power.",
      effects: { power: 8, water: -2 },
      score: 15,
      feedback: "Power-system maintenance improved energy reliability.",
    },
    {
      label: "Conserve energy",
      description: "Reduce nonessential energy use.",
      effects: { power: 3, oxygen: -2 },
      score: 8,
      feedback: "Energy was conserved, although some systems had to reduce activity.",
    },
    {
      label: "Ignore the warning",
      description: "Continue operations without intervention.",
      effects: { power: -12 },
      score: -12,
      feedback: "The unresolved power problem reduced available energy.",
    },
  ],

  water: [
    {
      label: "Repair the water system",
      description: "Prioritize repairs and water recovery.",
      effects: { water: 12, power: -5 },
      score: 15,
      feedback: "The water system was repaired and recovery improved.",
    },
    {
      label: "Introduce water rationing",
      description: "Reduce water use while planning repairs.",
      effects: { water: 4, food: -2 },
      score: 8,
      feedback: "Rationing reduced pressure on the remaining water supply.",
    },
    {
      label: "Delay the response",
      description: "Continue operations without addressing the fault.",
      effects: { water: -12 },
      score: -12,
      feedback: "The water problem continued to affect the habitat.",
    },
  ],

  life: [
    {
      label: "Repair life support",
      description: "Prioritize air quality and oxygen safety.",
      effects: { oxygen: 10, power: -6 },
      score: 18,
      feedback: "The crew restored safer life-support operation.",
    },
    {
      label: "Activate backup systems",
      description: "Use backup capacity while reducing activity.",
      effects: { oxygen: 5, food: -3 },
      score: 9,
      feedback: "Backup systems helped stabilize the habitat.",
    },
    {
      label: "Postpone maintenance",
      description: "Monitor the fault without fixing it now.",
      effects: { oxygen: -12 },
      score: -15,
      feedback: "The unresolved fault increased risk to the crew.",
    },
  ],

  radiation: [
    {
      label: "Secure the radiation shelter",
      description: "Move the crew to protection and secure the habitat.",
      effects: { shielding: 12, power: -5 },
      score: 18,
      feedback: "Shelter procedures improved radiation protection.",
    },
    {
      label: "Reinforce shielding",
      description: "Use available materials to improve protection.",
      effects: { shielding: 7, food: -2 },
      score: 10,
      feedback: "Additional shielding reduced exposure risk.",
    },
    {
      label: "Continue normal operations",
      description: "Accept the increased environmental risk.",
      effects: { shielding: -15 },
      score: -15,
      feedback: "The crew remained exposed to a greater radiation risk.",
    },
  ],

  food: [
    {
      label: "Protect food production",
      description: "Repair storage or greenhouse systems.",
      effects: { food: 12, power: -5 },
      score: 15,
      feedback: "Food storage and production became more reliable.",
    },
    {
      label: "Reorganize food supplies",
      description: "Prioritize essential nutrition and reduce waste.",
      effects: { food: 5, water: -2 },
      score: 8,
      feedback: "Careful rationing improved the use of available food.",
    },
    {
      label: "Ignore the shortage",
      description: "Continue the current plan without adjustments.",
      effects: { food: -12 },
      score: -12,
      feedback: "The food supply became less secure.",
    },
  ],

  equipment: [
    {
      label: "Repair the equipment",
      description: "Use power and supplies to restore operation.",
      effects: { power: -5, oxygen: 2 },
      score: 15,
      feedback: "Maintenance restored equipment reliability.",
    },
    {
      label: "Use a backup unit",
      description: "Switch to a backup system where available.",
      effects: { power: -3, shielding: 2 },
      score: 8,
      feedback: "The backup reduced immediate operational risk.",
    },
    {
      label: "Defer maintenance",
      description: "Keep working while postponing repairs.",
      effects: { power: -7 },
      score: -10,
      feedback: "The unresolved equipment issue may cause further disruption.",
    },
  ],

  crew: [
    {
      label: "Prioritize crew wellbeing",
      description: "Provide rest and review the crew's condition.",
      effects: { food: -2, oxygen: 2 },
      score: 15,
      feedback: "Rest and monitoring improved the crew's readiness.",
    },
    {
      label: "Rebalance the workload",
      description: "Redistribute tasks and postpone nonessential work.",
      effects: { power: 2, food: -1 },
      score: 8,
      feedback: "The revised schedule reduced pressure on the crew.",
    },
    {
      label: "Continue the full schedule",
      description: "Keep all planned tasks active.",
      effects: { food: -5, oxygen: -3 },
      score: -10,
      feedback: "The demanding schedule increased crew and resource strain.",
    },
  ],

  science: [
    {
      label: "Run a controlled experiment",
      description: "Proceed with monitoring and a defined energy budget.",
      effects: { power: -5, water: 2 },
      score: 15,
      feedback: "The controlled experiment produced useful mission data.",
    },
    {
      label: "Scale down the experiment",
      description: "Collect limited data while conserving resources.",
      effects: { power: -2 },
      score: 8,
      feedback: "A smaller experiment preserved more resources.",
    },
    {
      label: "Run without safeguards",
      description: "Proceed without the recommended limits.",
      effects: { power: -10, oxygen: -2 },
      score: -12,
      feedback: "Uncontrolled operation increased resource pressure.",
    },
  ],

  weather: [
    {
      label: "Secure the outpost",
      description: "Protect exposed equipment before conditions worsen.",
      effects: { power: -5, shielding: 5 },
      score: 15,
      feedback: "The outpost was secured against the environmental threat.",
    },
    {
      label: "Reduce surface activity",
      description: "Suspend nonessential work until conditions improve.",
      effects: { power: 2, food: -2 },
      score: 8,
      feedback: "Reduced surface activity lowered immediate operational risk.",
    },
    {
      label: "Continue surface operations",
      description: "Keep working despite the warning.",
      effects: { power: -8, shielding: -8 },
      score: -12,
      feedback: "Exposed operations increased risk and resource loss.",
    },
  ],

  logistics: [
    {
      label: "Prioritize critical supplies",
      description: "Allocate resources to essential mission requirements.",
      effects: { water: 3, food: 3, power: -4 },
      score: 15,
      feedback: "Essential supplies were prioritized for the remaining mission.",
    },
    {
      label: "Replan the schedule",
      description: "Delay lower-priority tasks and conserve supplies.",
      effects: { power: 3, food: -2 },
      score: 8,
      feedback: "The revised schedule reduced immediate resource pressure.",
    },
    {
      label: "Keep the original plan",
      description: "Avoid changes to the current schedule.",
      effects: { water: -4, food: -4 },
      score: -10,
      feedback: "The original plan left the supply problem unresolved.",
    },
  ],
};

function buildEvents(environment) {
  return EVENT_DATA[environment].map(
    ([id, title, description, type], index) => ({
      id,
      title,
      description,
      severity: ["life", "radiation", "water"].includes(type)
        ? "critical"
        : "warning",
      day: index + 1,
      choices: CHOICE_PROFILES[type].map((choice, choiceIndex) => ({
        ...choice,
        id: `${id}-choice-${choiceIndex + 1}`,
        effects: { ...choice.effects },
      })),
    })
  );
}

export const MOON_EVENTS = buildEvents("moon");
export const MARS_EVENTS = buildEvents("mars");

// Backward-compatible export for existing imports.
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
      "Keep water, food, oxygen and radiation shielding above zero throughout the campaign.",
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

// Any critical resource reaching 0% causes immediate mission failure.
function hasCriticalFailure(resources) {
  return (
    resources.power <= 0 ||
    resources.water <= 0 ||
    resources.food <= 0 ||
    resources.oxygen <= 0 ||
    resources.shielding <= 0
  );
}

function updateObjectives(state) {
  return state.objectives.map((objective) => {
    if (objective.id === "stable-power") {
      return {
        ...objective,
        // Do not show completed at mission start.
        // Once play begins, this remains complete only while power is positive.
        completed:
          state.eventCount > 0 &&
          state.resources.power > 0,
      };
    }

    if (objective.id === "protect-crew") {
      const crewResources = [
        state.resources.water,
        state.resources.food,
        state.resources.oxygen,
        state.resources.shielding,
      ];

      return {
        ...objective,
        // Do not show completed before the first decision.
        completed:
          state.eventCount > 0 &&
          crewResources.every((value) => value > 0),
      };
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
    // Keep all objectives unchecked at the start of a new mission.
    objectives: INITIAL_OBJECTIVES.map((item) => ({
      ...item,
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

  // Prevent resolving the same event twice.
  if (state.resolvedEventIds.includes(event.id)) {
    return state;
  }

  const choice = event.choices.find((item) => item.id === choiceId);

  if (!choice) {
    return state;
  }

  const resources = { ...state.resources };

  // Apply the selected decision's resource effects.
  for (const [resource, change] of Object.entries(choice.effects)) {
    if (resource in resources) {
      resources[resource] = clamp(resources[resource] + change);
    }
  }

  // Apply daily resource consumption.
  resources.power = clamp(resources.power - 1);
  resources.water = clamp(resources.water - 1);
  resources.food = clamp(resources.food - 1);
  resources.oxygen = clamp(resources.oxygen - 1);

  const resolvedEventIds = [...state.resolvedEventIds, event.id];
  const eventCount = state.eventCount + 1;
  const score = state.score + choice.score;
  const duration = state.duration;
  const events = getEventsForMission(state.environment);

  const criticalFailure = hasCriticalFailure(resources);

  const updated = {
    ...state,
    score,
    resources,
    flags: { ...state.flags, ...(choice.flags ?? {}) },
    eventCount,
    resolvedEventIds,
    currentEvent: null,
    crewStatus: criticalFailure
      ? "Critical"
      : Math.min(
          resources.power,
          resources.water,
          resources.food,
          resources.oxygen,
          resources.shielding
        ) < 25
        ? "At Risk"
        : "Nominal",
    missionStatus: criticalFailure ? "failed" : "active",
    log: [
      `${event.title}: ${choice.label}. ${choice.feedback}`,
      ...state.log,
    ].slice(0, 8),
  };

  // Update objective states after applying this day's decision and resource costs.
  updated.objectives = updateObjectives(updated);

  // Critical failure takes priority over campaign completion.
  if (criticalFailure) {
    updated.log = [
      "MISSION FAILED — A critical habitat resource reached 0%.",
      ...updated.log,
    ].slice(0, 8);

    return updated;
  }

  // Decide success or failure after the final campaign event.
  if (eventCount >= duration) {
    const objectivesComplete = updated.objectives.every(
      (objective) => objective.completed
    );

    updated.missionStatus =
      score > 0 && objectivesComplete ? "success" : "failed";

    updated.currentEvent = null;

    updated.log = [
      updated.missionStatus === "success"
        ? `MISSION SUCCESS — All ${duration} mission events completed and all objectives achieved.`
        : "MISSION FAILED — The campaign ended without meeting every objective or maintaining a positive score.",
      ...updated.log,
    ].slice(0, 8);

    return updated;
  }

  // Continue to the next unique event.
  updated.day = state.day + 1;
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
