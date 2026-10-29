import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createMissionState,
  resolveDecision,
  RESOURCE_META,
} from "../game/missionEngine";

const MissionSessionContext = createContext(null);

const clampResource = (value) =>
  Math.min(100, Math.max(0, value));

function buildResourceChanges(before, after) {
  return Object.keys(before).map((key) => ({
    key,
    label: RESOURCE_META[key]?.label ?? key,
    before: before[key],
    after: after[key],
    change: after[key] - before[key],
  }));
}

/*
 * One-time exploration bonuses.
 * These are used when the current event has NO matching field task.
 * Each can be awarded only once per campaign and does not advance the day.
 */
const PHYSICAL_INTERACTIONS = {
  supplies: {
    id: "supply-cache-01",
    title: "Supply Cache Recovered",
    description:
      "You recovered emergency supplies from a surface cache.",
    effects: {
      water: 8,
      food: 8,
      oxygen: 3,
    },
    score: 10,
    learningInsight: {
      title: "Emergency Supplies and Resource Reserves",
      fact:
        "Exploration teams can improve mission resilience by locating and recovering useful supplies. However, every extra surface operation carries time and life-support costs.",
      takeaway:
        "Recover supplies when safe, and balance exploration against suit oxygen and crew safety.",
    },
  },

  solar: {
    id: "solar-array-01",
    title: "Solar Array Serviced",
    description:
      "You serviced the outpost solar array and improved its power reserves.",
    effects: {
      power: 12,
    },
    score: 10,
    learningInsight: {
      title: "Solar Power Maintenance",
      fact:
        "Solar panels provide electricity for habitat systems, but dust and equipment faults can reduce their output.",
      takeaway:
        "Inspect and maintain power-generation equipment before energy reserves become critical.",
    },
  },

  rover: {
    id: "rover-check-01",
    title: "Rover Systems Checked",
    description:
      "You completed a rover systems check and recovered useful operational supplies.",
    effects: {
      power: 4,
      water: 3,
    },
    score: 8,
    learningInsight: {
      title: "Rover Maintenance and Field Operations",
      fact:
        "Rovers support planetary exploration and logistics. Routine inspections can identify problems before they interrupt important surface operations.",
      takeaway:
        "Check vehicle systems and plan field operations around available resources.",
    },
  },
};

export function MissionSessionProvider({
  planet = "moon",
  children,
}) {
  const environment = planet === "mars" ? "mars" : "moon";

  const [sessionVersion, setSessionVersion] = useState(0);

  const [mission, setMission] = useState(() =>
    createMissionState(environment)
  );

  const [resolvedEvent, setResolvedEvent] = useState(null);
  const [missionLog, setMissionLog] = useState([]);

  /*
   * Always-fresh copies of state. The 3D scene may hold on to an older
   * copy of handlePhysicalInteraction, so the handler reads these refs
   * instead of closed-over state. This also prevents a double key press
   * from completing the same task twice.
   */
  // Which step of the current event's field task the player is on.
  const [taskProgress, setTaskProgress] = useState({
    eventId: null,
    stepIndex: 0,
  });

  const missionRef = useRef(mission);
  const resolvedEventRef = useRef(resolvedEvent);
  const taskProgressRef = useRef(taskProgress);
  missionRef.current = mission;
  resolvedEventRef.current = resolvedEvent;
  taskProgressRef.current = taskProgress;

  const handleDecision = useCallback(
    (choiceId) => {
      let decisionResult = null;

      setMission((currentMission) => {
        if (
          currentMission.missionStatus !== "active" ||
          !currentMission.currentEvent
        ) {
          return currentMission;
        }

        const nextMission = resolveDecision(
          currentMission,
          choiceId
        );

        if (
          !nextMission ||
          nextMission === currentMission
        ) {
          return currentMission;
        }

        decisionResult = {
          previousMission: currentMission,
          nextMission,
          choice: currentMission.currentEvent.choices.find(
            (item) => item.id === choiceId
          ),
        };

        return nextMission;
      });

      return decisionResult;
    },
    []
  );

  /*
   * Physical actions in the 3D world.
   * Accepted action names: "supplies", "solar", "rover".
   *
   * 1) If the CURRENT daily event has a field task that uses this
   *    interaction, doing it resolves the event (outcome, score, day
   *    progression and learning log all go through resolveDecision).
   * 2) Otherwise the interaction gives its one-time exploration bonus.
   */
  const handlePhysicalInteraction = useCallback(
    (interactionType, target) => {
      const current = missionRef.current;

      if (current.missionStatus !== "active") {
        return {
          success: false,
          message: "The mission is no longer active.",
        };
      }

      // ---------- 1) FIELD TASK FOR THE CURRENT EVENT ----------
      const event = current.currentEvent;
      const task = event?.task;

      const progress = taskProgressRef.current;
      const stepIndex =
        task && progress.eventId === event.id ? progress.stepIndex : 0;
      const step = task ? task.steps[stepIndex] : null;

      if (task && step && target?.id === step.stationId) {
        if (resolvedEventRef.current) {
          return {
            success: false,
            message:
              "Review the last event report in the Mission panel first.",
          };
        }

        if (current.resolvedEventIds.includes(event.id)) {
          return {
            success: false,
            message: "This event is already resolved.",
          };
        }

        // Not the last step yet: advance to the next station.
        if (stepIndex < task.steps.length - 1) {
          const nextStep = task.steps[stepIndex + 1];
          const nextProgress = {
            eventId: event.id,
            stepIndex: stepIndex + 1,
          };

          taskProgressRef.current = nextProgress;
          setTaskProgress(nextProgress);

          return {
            success: true,
            message: `${step.doneText} Next: ${nextStep.action}.`,
          };
        }

        // Last step: the event is resolved.
        const choice = event.choices[task.choiceIndex];

        if (!choice) {
          return {
            success: false,
            message: "This task is not available.",
          };
        }

        const nextMission = resolveDecision(current, choice.id);

        if (!nextMission || nextMission === current) {
          return {
            success: false,
            message: "Could not complete this task.",
          };
        }

        const resourceChanges = buildResourceChanges(
          current.resources,
          nextMission.resources
        );
        const scoreChange = nextMission.score - current.score;

        const logEntry = {
          id: `task-${event.id}-${sessionVersion}`,

          type: "physical_interaction",
          category: "interaction",
          source: "physical",
          actionType: interactionType,
          interactionType,

          day: current.day,
          eventTitle: event.title,
          eventDescription: event.description,
          choiceTitle: task.successTitle,
          choiceDescription: task.successText,
          feedback: choice.feedback,
          resourceChanges,
          scoreBefore: current.score,
          scoreAfter: nextMission.score,
          scoreChange,
          learningInsight: task.learningInsight,
          statusAfterDecision: nextMission.missionStatus,
        };

        missionRef.current = nextMission; // block duplicate completion

        setMission(nextMission);
        setMissionLog((previous) => [...previous, logEntry]);
        setResolvedEvent({
          title: task.successTitle,
          text: choice.feedback,
          eventTitle: event.title,
          resourceChanges,
          scoreChange,
          learningInsight: task.learningInsight,
          logEntry,
        });

        return {
          success: true,
          message: task.successTitle,
          resourceChanges,
          scoreChange,
        };
      }

      // ---------- 2) ONE-TIME EXPLORATION BONUS ----------
      const interaction = PHYSICAL_INTERACTIONS[interactionType];

      if (!interaction) {
        return {
          success: false,
          message: "Nothing to do here right now.",
        };
      }

      const completedInteractions =
        current.flags?.physicalInteractions ?? {};

      if (completedInteractions[interaction.id]) {
        return {
          success: false,
          message: "You have already completed this task.",
        };
      }

      const nextResources = { ...current.resources };

      for (const [resource, change] of Object.entries(
        interaction.effects
      )) {
        if (!(resource in nextResources)) continue;

        nextResources[resource] = clampResource(
          nextResources[resource] + change
        );
      }

      const nextScore = current.score + interaction.score;

      const nextMission = {
        ...current,
        resources: nextResources,
        score: nextScore,
        flags: {
          ...current.flags,
          physicalInteractions: {
            ...completedInteractions,
            [interaction.id]: true,
          },
        },
        log: [
          `${interaction.title}: ${interaction.description}`,
          ...current.log,
        ].slice(0, 8),
      };

      const resourceChanges = buildResourceChanges(
        current.resources,
        nextResources
      );

      const logEntry = {
        id: `physical-${interaction.id}-${sessionVersion}`,

        type: "physical_interaction",
        category: "interaction",
        source: "physical",
        actionType: interactionType,
        interactionType,

        day: current.day,
        eventTitle: "Surface Exploration",
        eventDescription: interaction.description,
        choiceTitle: interaction.title,
        choiceDescription: interaction.description,
        feedback: interaction.description,
        resourceChanges,
        scoreBefore: current.score,
        scoreAfter: nextScore,
        scoreChange: interaction.score,
        learningInsight: interaction.learningInsight,
        statusAfterDecision: nextMission.missionStatus,
      };

      missionRef.current = nextMission; // block duplicate completion

      setMission(nextMission);
      setMissionLog((previous) => [...previous, logEntry]);

      return {
        success: true,
        message: interaction.title,
        resourceChanges,
        scoreChange: interaction.score,
      };
    },
    [sessionVersion]
  );

  const failMission = useCallback((reason) => {
    setMission((currentMission) => {
      if (currentMission.missionStatus !== "active") {
        return currentMission;
      }

      return {
        ...currentMission,
        missionStatus: "failed",
        currentEvent: null,
        failureReason:
          reason || "The astronaut did not survive.",
      };
    });

    setResolvedEvent(null);
  }, []);

  const nextEvent = useCallback(() => {
    setResolvedEvent(null);
  }, []);

  const restartMission = useCallback(() => {
    setMission(createMissionState(environment));
    setResolvedEvent(null);
    setMissionLog([]);
    taskProgressRef.current = { eventId: null, stepIndex: 0 };
    setTaskProgress({ eventId: null, stepIndex: 0 });
    setSessionVersion((version) => version + 1);
  }, [environment]);

  const taskStepIndex =
    mission.currentEvent?.task &&
    taskProgress.eventId === mission.currentEvent.id
      ? taskProgress.stepIndex
      : 0;

  const value = useMemo(
    () => ({
      planet: environment,
      mission,
      setMission,
      resolvedEvent,
      setResolvedEvent,
      missionLog,
      setMissionLog,
      handleDecision,
      handlePhysicalInteraction,
      failMission,
      nextEvent,
      restartMission,
      sessionVersion,
      taskStepIndex,
    }),
    [
      environment,
      mission,
      resolvedEvent,
      missionLog,
      handleDecision,
      handlePhysicalInteraction,
      failMission,
      nextEvent,
      restartMission,
      sessionVersion,
      taskStepIndex,
    ]
  );

  return (
    <MissionSessionContext.Provider value={value}>
      {children}
    </MissionSessionContext.Provider>
  );
}

export function useMissionSession() {
  const context = useContext(MissionSessionContext);

  if (!context) {
    throw new Error(
      "useMissionSession must be used inside MissionSessionProvider."
    );
  }

  return context;
}