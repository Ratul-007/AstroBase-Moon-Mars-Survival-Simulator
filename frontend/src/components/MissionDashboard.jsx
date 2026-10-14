
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  RESOURCE_META,
  createMissionState,
  resolveDecision,
} from "../game/missionEngine";

// --------------------------------------------------
// SPACE SCIENCE LEARNING INSIGHTS
// Specific event titles are matched before descriptions
// and broad keywords to prevent incorrect lessons.
// --------------------------------------------------

function getLearningInsight(event) {
  const title = (event?.title ?? "").toLowerCase();
  const description = (event?.description ?? "").toLowerCase();
  const text = `${title} ${description}`;

  // Specific event: communication antenna fault.
  if (
    title.includes("communication antenna fault") ||
    (title.includes("antenna") && title.includes("fault"))
  ) {
    return {
      title: "Communication Systems and Antenna Maintenance",
      fact:
        "Communication antennas connect a planetary habitat with Earth and other mission systems. Faults can interrupt updates, scientific data transfer and access to remote support. Because communication delays can be significant, crews also need reliable local procedures.",
      takeaway:
        "Inspect communication equipment regularly, investigate faults early and maintain backup communication procedures before a minor fault becomes a mission-wide problem.",
    };
  }

  // Specific event: crop growth setback.
  if (
    title.includes("crop growth setback") ||
    (title.includes("crop") &&
      (title.includes("growth") || title.includes("setback")))
  ) {
    return {
      title: "Food Production and Long-Term Reserves",
      fact:
        "Growing food in a space habitat depends on healthy plants, adequate water, lighting, nutrients and suitable environmental conditions. A crop setback can reduce future food availability even when current food stores appear sufficient.",
      takeaway:
        "Plan food reserves across the entire mission, monitor crop health and keep backup food supplies for periods of reduced production.",
    };
  }

  // Specific radiation-related events take priority over solar-energy lessons.
  if (
    title.includes("solar radiation") ||
    title.includes("radiation alert") ||
    title.includes("radiation storm") ||
    title.includes("solar storm") ||
    title.includes("cosmic ray") ||
    title.includes("radiation shielding") ||
    title.includes("radiation")
  ) {
    return {
      title: "Radiation Protection",
      fact:
        "The Moon and Mars lack Earth's strong global magnetic-field and atmospheric protection. Space radiation is a serious design consideration for habitats and crew safety.",
      takeaway:
        "Use suitable shielding, monitor radiation conditions and follow storm-response procedures to reduce crew exposure.",
    };
  }

  // Maintenance-related events should be recognized before generic power lessons.
  if (
    title.includes("maintenance") ||
    title.includes("equipment fault") ||
    title.includes("equipment failure") ||
    title.includes("equipment malfunction") ||
    title.includes("system malfunction") ||
    title.includes("pressure leak") ||
    title.includes("habitat seal") ||
    title.includes("air filter") ||
    title.includes("filter malfunction") ||
    title.includes("seal inspection") ||
    title.includes("defer maintenance") ||
    title.includes("repair")
  ) {
    return {
      title: "Habitat Maintenance and Reliability",
      fact:
        "A remote habitat depends on reliable equipment, filters, seals and control systems. Delaying maintenance can allow a small fault to become a larger problem, while crews may have limited spare parts and delayed support from Earth.",
      takeaway:
        "Investigate faults early, follow maintenance procedures and preserve backup equipment so small problems do not escalate.",
    };
  }

  // General communication events.
  if (
    title.includes("communication") ||
    title.includes("antenna") ||
    title.includes("signal") ||
    title.includes("contact")
  ) {
    return {
      title: "Communication Systems in Space",
      fact:
        "Communication between Earth and another world can be delayed or interrupted. Mars communication delays vary with the planets' positions, so crews cannot always rely on immediate replies.",
      takeaway:
        "Maintain reliable communication equipment, use backup procedures and make safe decisions independently when immediate support is unavailable.",
    };
  }

  // Match other lessons using event title and description.
  const lessons = [
    {
      keywords: [
        "air filter",
        "filter malfunction",
        "habitat seal",
        "seal inspection",
        "pressure leak",
        "equipment malfunction",
        "system malfunction",
        "unexpected equipment failure",
      ],
      title: "Habitat Maintenance and Reliability",
      fact:
        "A habitat depends on reliable filters, seals and pressure-control equipment. Small faults can become serious if they are not detected and addressed early.",
      takeaway:
        "Inspect equipment regularly, repair faults promptly and preserve backup systems.",
    },
    {
      keywords: [
        "unexpected energy demand",
        "energy demand",
        "power budget",
        "power shortage",
        "power fluctuation",
        "solar power",
        "solar panel",
        "solar array",
        "sunlight",
        "solar",
      ],
      title: "Solar Energy and Power Management",
      fact:
        "Solar panels can generate electricity from sunlight, but dust, shadows, panel orientation and environmental conditions can reduce output. Habitat systems also compete for limited power.",
      takeaway:
        "Astronauts need energy reserves and must prioritize essential habitat systems.",
    },
    {
      keywords: ["water", "ice", "recycling", "leak"],
      title: "Water Is a Critical Resource",
      fact:
        "Water supports drinking, hygiene and other life-support needs. Future habitats may use recycling systems and investigate local ice where available.",
      takeaway:
        "Preventing leaks, reusing water and monitoring reserves improve mission resilience.",
    },
    {
      keywords: [
        "oxygen",
        "air supply",
        "breathing",
        "atmosphere",
        "carbon dioxide",
      ],
      title: "Keeping the Crew Breathing",
      fact:
        "A crewed habitat must maintain a safe breathable atmosphere. Oxygen supply, carbon-dioxide removal, pressure and leak monitoring all matter.",
      takeaway:
        "Life-support systems need monitoring, backup plans and careful resource allocation.",
    },
    {
      keywords: ["food", "crop", "plant", "harvest", "nutrition"],
      title: "Food for Long-Duration Missions",
      fact:
        "Space crews need reliable food supplies and balanced nutrition. Growing food in space habitats is promising but requires water, energy, equipment and time.",
      takeaway:
        "Food reserves should be planned across the entire mission, not just the current day.",
    },
    {
      keywords: ["dust", "sandstorm", "dust storm"],
      title: "Dust Is an Engineering Challenge",
      fact:
        "Lunar dust is abrasive and can cling to surfaces. Martian dust can also affect equipment and reduce sunlight reaching solar panels.",
      takeaway:
        "Dust monitoring, equipment protection and maintenance help keep a habitat operational.",
    },
    {
      keywords: [
        "temperature",
        "cold",
        "heat",
        "thermal",
        "freeze",
        "freezing",
        "overheating",
      ],
      title: "Surviving Extreme Temperatures",
      fact:
        "The Moon experiences extreme temperature conditions, while Mars is generally cold and has a thin atmosphere. Habitats need insulation and thermal control.",
      takeaway:
        "Temperature regulation uses energy, so thermal safety must be included in power planning.",
    },
    {
      keywords: ["medical", "injury", "health", "illness", "emergency"],
      title: "Crew Health and Emergency Planning",
      fact:
        "Medical support is harder to provide far from Earth because evacuation and resupply may take a long time.",
      takeaway:
        "Preventive care, emergency supplies and clear response procedures are essential.",
    },
    {
      keywords: [
        "equipment",
        "repair",
        "maintenance",
        "failure",
        "machine",
        "malfunction",
        "inspection",
      ],
      title: "Reliability and Redundancy",
      fact:
        "A remote habitat must be designed for maintenance because spare parts and expert help may not be immediately available.",
      takeaway:
        "Checking equipment early and preserving backup capacity can prevent a small issue from escalating.",
    },
    {
      keywords: ["crew", "team", "conflict", "fatigue", "morale"],
      title: "Crew Safety and Teamwork",
      fact:
        "Long-duration missions require teamwork, careful scheduling, rest and attention to crew health as well as technical systems.",
      takeaway:
        "A good mission plan balances immediate tasks with long-term crew wellbeing.",
    },
    {
      keywords: ["experiment", "science", "research", "sample"],
      title: "Scientific Exploration",
      fact:
        "Space missions have limited time, power and storage. Scientists and crews must balance research opportunities with operational safety.",
      takeaway:
        "Prioritize experiments that provide useful information without endangering essential systems.",
    },
  ];

  const matchedLesson = lessons.find((lesson) =>
    lesson.keywords.some((keyword) => text.includes(keyword))
  );

  if (matchedLesson) return matchedLesson;

  return {
    title: "Systems Thinking in Space",
    fact:
      "A planetary habitat is an interconnected system. Power, water, food, oxygen, equipment and crew safety can affect one another.",
    takeaway:
      "Before choosing an action, consider both its immediate benefit and its long-term resource cost.",
  };
}

function formatDelta(value) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function MissionDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const learningLogRef = useRef(null);

  const isMars = location.state?.planet === "mars";
  const environment = isMars ? "mars" : "moon";
  const planetName = isMars ? "Mars Outpost" : "Moon Outpost";
  const planetIcon = isMars ? "🔴" : "🌕";
  const accent = isMars ? "#fb923c" : "#7dd3fc";

  const [mission, setMission] = useState(() =>
    createMissionState(environment)
  );

  const [resolvedEvent, setResolvedEvent] = useState(null);
  const [missionLog, setMissionLog] = useState([]);
  const [showMissionLog, setShowMissionLog] = useState(false);
  const [scrollToLearningLog, setScrollToLearningLog] = useState(false);

  useEffect(() => {
    setMission(createMissionState(environment));
    setResolvedEvent(null);
    setMissionLog([]);
    setShowMissionLog(false);
    setScrollToLearningLog(false);
  }, [environment]);

  useEffect(() => {
    if (!showMissionLog || !scrollToLearningLog) return;

    learningLogRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setScrollToLearningLog(false);
  }, [showMissionLog, scrollToLearningLog]);

  const resources = mission.resources;
  const score = mission.score;
  const day = mission.day;
  const currentEvent = mission.currentEvent;

  const isGameOver =
    mission.missionStatus === "success" ||
    mission.missionStatus === "failed";

  const isSuccess = mission.missionStatus === "success";

  const isCriticalFailure =
    mission.missionStatus === "failed" &&
    (
      resources.power <= 0 ||
      resources.water <= 0 ||
      resources.food <= 0 ||
      resources.oxygen <= 0 ||
      resources.shielding <= 0
    );

  const completedObjectives = mission.objectives.filter(
    (objective) => objective.completed
  ).length;

  // --------------------------------------------------
  // LEARNING LOG NAVIGATION
  // --------------------------------------------------

  const openLearningLog = () => {
    setShowMissionLog(true);
    setScrollToLearningLog(true);
  };

  // --------------------------------------------------
  // DECISION HANDLER + LEARNING LOG
  // --------------------------------------------------

  const handleDecision = (choiceId) => {
    if (
      !currentEvent ||
      resolvedEvent ||
      mission.missionStatus !== "active"
    ) {
      return;
    }

    const choice = currentEvent.choices.find(
      (item) => item.id === choiceId
    );

    if (!choice) return;

    const nextMission = resolveDecision(mission, choiceId);

    if (nextMission === mission) return;

    const resourceChanges = Object.keys(mission.resources).map((key) => ({
      key,
      label: RESOURCE_META[key]?.label ?? key,
      before: mission.resources[key],
      after: nextMission.resources[key],
      change: nextMission.resources[key] - mission.resources[key],
    }));

    const scoreChange = nextMission.score - mission.score;

    // Match the lesson to the event's specific title first.
    const learningInsight = getLearningInsight(currentEvent);

    const logEntry = {
      id: `${mission.eventCount}-${Date.now()}`,
      day: mission.day,
      eventTitle: currentEvent.title,
      eventDescription: currentEvent.description,
      choiceTitle: choice.label,
      choiceDescription: choice.description,
      feedback: choice.feedback,
      resourceChanges,
      scoreBefore: mission.score,
      scoreAfter: nextMission.score,
      scoreChange,
      learningInsight,
      statusAfterDecision: nextMission.missionStatus,
    };

    setMission(nextMission);
    setMissionLog((previousLog) => [...previousLog, logEntry]);

    setResolvedEvent({
      title: choice.label,
      text: choice.feedback,
      eventTitle: currentEvent.title,
      resourceChanges,
      scoreChange,
      learningInsight,
      logEntry,
    });
  };

  const nextEvent = () => {
    setResolvedEvent(null);
  };

  const restartMission = () => {
    setMission(createMissionState(environment));
    setResolvedEvent(null);
    setMissionLog([]);
    setShowMissionLog(false);
    setScrollToLearningLog(false);
  };

  const evaluatePerformance = () => {
    if (mission.missionStatus === "success") {
      if (score >= 50) {
        return "Excellent decisions helped protect the crew and complete the mission.";
      }

      return "All mission objectives were completed successfully.";
    }

    if (isCriticalFailure) {
      return "A critical habitat resource reached 0%. The colony could not continue.";
    }

    if (score <= 0) {
      return "The mission ended with a non-positive score. Review your decisions and try again.";
    }

    return "One or more mission objectives were not completed.";
  };

  const resourceStatus = (value) => {
    if (value <= 0) return "CRITICAL";
    if (value < 25) return "LOW";
    if (value < 50) return "CAUTION";
    return "STABLE";
  };

  const panelStyle = {
    background: "rgba(12, 23, 46, 0.88)",
    border: "1px solid #263755",
    borderRadius: "16px",
    padding: "22px",
    minWidth: 0,
  };

  const statCardStyle = {
    background: "#0a1429",
    border: "1px solid #263755",
    borderRadius: "12px",
    padding: "18px",
    flex: "1 1 135px",
    minWidth: 0,
    textAlign: "left",
  };

  const smallLabelStyle = {
    color: "#94a8c7",
    fontSize: "0.78rem",
    letterSpacing: "1px",
    textTransform: "uppercase",
  };

  const sectionHeadingStyle = {
    margin: "7px 0 12px",
    fontSize: "1.25rem",
  };

  const mutedTextStyle = {
    color: "#aebed6",
    fontSize: "0.92rem",
    lineHeight: 1.7,
  };

  // --------------------------------------------------
  // REUSABLE MISSION LOG PANEL
  // --------------------------------------------------

  const renderMissionLog = () => (
    <section
      ref={learningLogRef}
      style={{
        ...panelStyle,
        scrollMarginTop: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <span style={smallLabelStyle}>DECISION HISTORY</span>
          <h2 style={sectionHeadingStyle}>Mission Learning Log</h2>
          <p style={{ ...mutedTextStyle, margin: 0 }}>
            Review your decisions and the effects they had on the habitat.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowMissionLog((visible) => !visible)}
          style={{
            padding: "10px 14px",
            borderRadius: "9px",
            border: "1px solid #405070",
            background: "#101d36",
            color: "#eef4ff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {showMissionLog ? "Hide Log ▲" : `View Log (${missionLog.length}) ▼`}
        </button>
      </div>

      {showMissionLog && (
        <div style={{ display: "grid", gap: "14px", marginTop: "18px" }}>
          {missionLog.length === 0 ? (
            <div
              style={{
                padding: "18px",
                borderRadius: "10px",
                background: "#0a1429",
                color: "#94a8c7",
              }}
            >
              No decisions recorded yet. Complete your first mission event to
              start building your learning log.
            </div>
          ) : (
            [...missionLog].reverse().map((entry) => (
              <article
                key={entry.id}
                style={{
                  padding: "17px",
                  borderRadius: "12px",
                  background: "#0a1429",
                  border: "1px solid #2a3b58",
                }}
              >
                <span style={smallLabelStyle}>
                  DAY {entry.day} · {entry.eventTitle}
                </span>

                <h3 style={{ margin: "8px 0", color: "#eef4ff" }}>
                  {entry.choiceTitle}
                </h3>

                <p style={{ ...mutedTextStyle, margin: "0 0 10px" }}>
                  {entry.feedback}
                </p>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    margin: "12px 0",
                  }}
                >
                  {entry.resourceChanges.map((item) => (
                    <span
                      key={item.key}
                      style={{
                        padding: "6px 9px",
                        borderRadius: "7px",
                        background: "#111e37",
                        color:
                          item.change > 0
                            ? "#86efac"
                            : item.change < 0
                              ? "#fca5a5"
                              : "#cbd5e1",
                        fontSize: "0.82rem",
                      }}
                    >
                      {item.label} {formatDelta(item.change)}
                    </span>
                  ))}

                  <span
                    style={{
                      padding: "6px 9px",
                      borderRadius: "7px",
                      background: "#111e37",
                      color:
                        entry.scoreChange >= 0 ? "#86efac" : "#fca5a5",
                      fontSize: "0.82rem",
                    }}
                  >
                    Score {formatDelta(entry.scoreChange)}
                  </span>
                </div>

                <div
                  style={{
                    padding: "13px",
                    borderRadius: "9px",
                    background: "#10253a",
                    borderLeft: "3px solid #7dd3fc",
                  }}
                >
                  <strong style={{ color: "#7dd3fc" }}>
                    {entry.learningInsight.title}
                  </strong>
                  <p style={{ ...mutedTextStyle, margin: "6px 0 0" }}>
                    {entry.learningInsight.takeaway}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </section>
  );

  // --------------------------------------------------
  // FINAL RESULTS
  // --------------------------------------------------

  if (isGameOver && !resolvedEvent) {
    return (
      <section
        className="mission-dashboard"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "22px",
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "24px",
          color: "#eef4ff",
        }}
      >
        <header
          style={{
            ...panelStyle,
            textAlign: "center",
            padding: "34px 22px",
            borderColor: isSuccess ? "#28664d" : "#713b48",
            background: isSuccess
              ? "linear-gradient(145deg, #102b2b, #0b172b 70%)"
              : "linear-gradient(145deg, #321923, #10172a 70%)",
          }}
        >
          <div style={{ fontSize: "2.8rem", marginBottom: "10px" }}>
            {isSuccess ? "🚀" : "⚠️"}
          </div>

          <span
            className="mission-type"
            style={{
              color: isSuccess ? "#86efac" : "#fca5a5",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            {isSuccess ? "MISSION SUCCESS" : "MISSION FAILED"}
          </span>

          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              lineHeight: 1.15,
              margin: "14px 0",
              color: isSuccess ? "#86efac" : "#f87171",
            }}
          >
            {isSuccess ? "Survival Achieved!" : "Colony Lost"}
          </h1>

          <p
            style={{
              color: "#b7c5dc",
              maxWidth: "650px",
              lineHeight: 1.7,
              margin: "0 auto",
            }}
          >
            {evaluatePerformance()}
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
              marginTop: "20px",
              padding: "9px 14px",
              borderRadius: "30px",
              background: "#081224",
              border: "1px solid #2a3b58",
              color: "#d8e5fb",
              fontSize: "0.9rem",
            }}
          >
            <span>{planetIcon}</span>
            <span>{planetName}</span>
            <span style={{ color: "#647795" }}>•</span>
            <span>{mission.duration}-Day Campaign</span>
          </div>
        </header>

        <section style={panelStyle}>
          <div style={{ marginBottom: "18px" }}>
            <span style={smallLabelStyle}>MISSION REPORT</span>
            <h2 style={{ margin: "7px 0 0", fontSize: "1.4rem" }}>
              Final Performance
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div
              style={{
                ...statCardStyle,
                borderColor: isSuccess ? "#28664d" : "#713b48",
              }}
            >
              <span style={smallLabelStyle}>Final Score</span>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginTop: "8px",
                  color: accent,
                }}
              >
                {score}
              </div>
            </div>

            <div style={statCardStyle}>
              <span style={smallLabelStyle}>Events Resolved</span>
              <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "8px" }}>
                {mission.eventCount}
                <span style={{ color: "#8294b1", fontSize: "1rem" }}>
                  {" "}/ {mission.duration}
                </span>
              </div>
            </div>

            <div style={statCardStyle}>
              <span style={smallLabelStyle}>Mission Day</span>
              <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "8px" }}>
                {day}
                <span style={{ color: "#8294b1", fontSize: "1rem" }}>
                  {" "}/ {mission.duration}
                </span>
              </div>
            </div>

            <div style={statCardStyle}>
              <span style={smallLabelStyle}>Objectives</span>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "bold",
                  marginTop: "8px",
                  color:
                    completedObjectives === mission.objectives.length
                      ? "#86efac"
                      : "#fbbf24",
                }}
              >
                {completedObjectives}
                <span style={{ color: "#8294b1", fontSize: "1rem" }}>
                  {" "}/ {mission.objectives.length}
                </span>
              </div>
            </div>

            <div style={statCardStyle}>
              <span style={smallLabelStyle}>Learning Log</span>
              <div style={{ fontSize: "2rem", fontWeight: "bold", marginTop: "8px" }}>
                {missionLog.length}
              </div>
              <span style={{ color: "#94a8c7", fontSize: "0.8rem" }}>
                decisions reviewed
              </span>
            </div>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={{ marginBottom: "20px" }}>
            <span style={smallLabelStyle}>HABITAT SYSTEMS</span>
            <h2 style={{ margin: "7px 0 0", fontSize: "1.4rem" }}>
              Final Resource Status
            </h2>
            <p style={{ color: "#94a8c7", margin: "8px 0 0", fontSize: "0.92rem" }}>
              Resource levels recorded at the end of your mission.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            {Object.entries(resources).map(([key, value]) => {
              const meta = RESOURCE_META[key];
              const depleted = value <= 0;

              return (
                <div
                  key={key}
                  style={{
                    background: "#0a1429",
                    border: `1px solid ${depleted ? "#9f3d4b" : "#263755"}`,
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ color: "#dce7f8", fontSize: "0.92rem" }}>
                      {meta.label}
                    </span>
                    <strong
                      style={{
                        color: depleted ? "#f87171" : meta.color,
                        fontSize: "1.25rem",
                      }}
                    >
                      {value}{meta.unit}
                    </strong>
                  </div>

                  <div
                    style={{
                      height: "8px",
                      background: "#1d2b44",
                      borderRadius: "20px",
                      overflow: "hidden",
                      margin: "13px 0 9px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(0, Math.min(100, value))}%`,
                        background: depleted ? "#f87171" : meta.color,
                        borderRadius: "20px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>

                  <span
                    style={{
                      color: depleted
                        ? "#f87171"
                        : value < 25
                          ? "#fbbf24"
                          : "#91a5c5",
                      fontSize: "0.75rem",
                      letterSpacing: "0.8px",
                    }}
                  >
                    {resourceStatus(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section style={panelStyle}>
          <span style={smallLabelStyle}>MISSION GOALS</span>
          <h2 style={{ margin: "7px 0 18px", fontSize: "1.4rem" }}>
            Objective Report
          </h2>

          <div style={{ display: "grid", gap: "12px" }}>
            {mission.objectives.map((objective) => (
              <div
                key={objective.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "14px",
                  borderRadius: "10px",
                  background: "#0a1429",
                  border: `1px solid ${objective.completed ? "#245743" : "#34415a"}`,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "27px",
                    height: "27px",
                    flexShrink: 0,
                    borderRadius: "50%",
                    background: objective.completed ? "#163c30" : "#253047",
                    color: objective.completed ? "#86efac" : "#a7b5cc",
                    fontWeight: "bold",
                  }}
                >
                  {objective.completed ? "✓" : "○"}
                </span>

                <div>
                  <strong style={{ display: "block", marginBottom: "5px" }}>
                    {objective.title}
                  </strong>
                  <span style={{ color: "#94a8c7", fontSize: "0.88rem", lineHeight: 1.5 }}>
                    {objective.description}
                  </span>
                </div>

                <span
                  style={{
                    marginLeft: "auto",
                    paddingLeft: "8px",
                    color: objective.completed ? "#86efac" : "#a7b5cc",
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {objective.completed ? "COMPLETE" : "INCOMPLETE"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Final learning debrief */}
        <section style={panelStyle}>
          <span style={smallLabelStyle}>AFTER-ACTION REVIEW</span>
          <h2 style={{ margin: "7px 0 12px", fontSize: "1.4rem" }}>
            What Did You Learn?
          </h2>
          <p style={mutedTextStyle}>
            You recorded {missionLog.length} decisions during this campaign.
            Review the log to understand how your choices changed habitat
            resources and affected the mission score.
          </p>

          <button
            type="button"
            onClick={openLearningLog}
            style={{
              padding: "12px 16px",
              borderRadius: "9px",
              border: "1px solid #405070",
              background: "#101d36",
              color: "#eef4ff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {showMissionLog ? "Review Decisions Again ↓" : "Review My Decisions ▼"}
          </button>

          {showMissionLog && (
            <div
              ref={learningLogRef}
              style={{
                display: "grid",
                gap: "14px",
                marginTop: "18px",
                scrollMarginTop: "24px",
              }}
            >
              {missionLog.length === 0 ? (
                <p style={mutedTextStyle}>No decision history is available.</p>
              ) : (
                [...missionLog].reverse().map((entry) => (
                  <article
                    key={entry.id}
                    style={{
                      padding: "17px",
                      borderRadius: "12px",
                      background: "#0a1429",
                      border: "1px solid #2a3b58",
                    }}
                  >
                    <span style={smallLabelStyle}>
                      DAY {entry.day} · {entry.eventTitle}
                    </span>
                    <h3 style={{ margin: "8px 0", color: "#eef4ff" }}>
                      {entry.choiceTitle}
                    </h3>
                    <p style={{ ...mutedTextStyle, margin: "0 0 10px" }}>
                      {entry.feedback}
                    </p>

                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "12px 0" }}>
                      {entry.resourceChanges.map((item) => (
                        <span
                          key={item.key}
                          style={{
                            padding: "6px 9px",
                            borderRadius: "7px",
                            background: "#111e37",
                            color: item.change > 0 ? "#86efac" : item.change < 0 ? "#fca5a5" : "#cbd5e1",
                            fontSize: "0.82rem",
                          }}
                        >
                          {item.label} {formatDelta(item.change)}
                        </span>
                      ))}
                      <span
                        style={{
                          padding: "6px 9px",
                          borderRadius: "7px",
                          background: "#111e37",
                          color: entry.scoreChange >= 0 ? "#86efac" : "#fca5a5",
                          fontSize: "0.82rem",
                        }}
                      >
                        Score {formatDelta(entry.scoreChange)}
                      </span>
                    </div>

                    <div style={{ padding: "13px", borderRadius: "9px", background: "#10253a", borderLeft: "3px solid #7dd3fc" }}>
                      <strong style={{ color: "#7dd3fc" }}>
                        {entry.learningInsight.title}
                      </strong>
                      <p style={{ ...mutedTextStyle, margin: "6px 0" }}>
                        {entry.learningInsight.fact}
                      </p>
                      <p style={{ ...mutedTextStyle, margin: 0 }}>
                        <strong>Takeaway: </strong>
                        {entry.learningInsight.takeaway}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </section>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
            paddingBottom: "20px",
          }}
        >
          <button
            className="primary-btn"
            onClick={restartMission}
            style={{
              background: accent,
              color: "#06101f",
              padding: "14px 25px",
              border: "none",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
              minHeight: "48px",
            }}
          >
            ↻ Restart Mission
          </button>

          <button
            className="secondary-btn"
            onClick={() => navigate("/missions")}
            style={{
              background: "transparent",
              color: "#eef4ff",
              padding: "14px 25px",
              border: "1px solid #405070",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
              minHeight: "48px",
            }}
          >
            ← Back to Missions
          </button>
        </div>
      </section>
    );
  }

  // --------------------------------------------------
  // ACTIVE MISSION DASHBOARD
  // --------------------------------------------------

  return (
    <section className="mission-dashboard">
      <header className="dashboard-header">
        <div>
          <span className="mission-type">ACTIVE MISSION</span>
          <h1>
            {planetIcon} {planetName}
          </h1>
        </div>

        <div className="mission-day">
          <span>MISSION DAY</span>
          <strong>
            Day {day} of {mission.duration}
          </strong>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Mission Resources */}
        <section className="resource-panel">
          <div className="panel-heading">
            <h2>Mission Resources</h2>
            <span>
              STATUS:{" "}
              {mission.crewStatus === "Critical"
                ? "CRITICAL"
                : mission.crewStatus === "At Risk"
                  ? "AT RISK"
                  : "STABLE"}
            </span>
          </div>

          <div className="resource-grid">
            {Object.entries(resources).map(([key, value]) => {
              const meta = RESOURCE_META[key];

              return (
                <div className="resource-card" key={key}>
                  <span>{meta.label}</span>
                  <strong>
                    {value}{meta.unit}
                  </strong>

                  <div className="resource-bar">
                    <div
                      className="resource-fill"
                      style={{
                        width: `${Math.max(0, Math.min(100, value))}%`,
                        background: meta.color,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>

                  <small>{resourceStatus(value)}</small>
                </div>
              );
            })}
          </div>
        </section>

        {/* Event and decision feedback */}
        <section className="event-panel">
          <span className="mission-type">
            {resolvedEvent
              ? "DECISION REVIEW"
              : `MISSION EVENT ${mission.eventCount + 1} OF ${mission.duration}`}
          </span>

          <h2>
            {resolvedEvent
              ? resolvedEvent.title
              : currentEvent?.title ?? "Mission Results"}
          </h2>

          <p>
            {resolvedEvent
              ? resolvedEvent.text
              : currentEvent?.description ?? "Preparing your mission results..."}
          </p>

          {!resolvedEvent && currentEvent && (
            <div
              style={{
                margin: "18px 0",
                padding: "14px",
                borderRadius: "10px",
                background: "#0a1429",
                border: "1px solid #2a3b58",
              }}
            >
              <strong style={{ color: accent }}>Think Like an Astronaut</strong>
              <p style={{ ...mutedTextStyle, margin: "7px 0 0" }}>
                Before choosing, consider crew safety, available resources and
                how today's decision might affect the rest of the campaign.
              </p>
            </div>
          )}

          <div className="decision-options">
            {!resolvedEvent && currentEvent ? (
              currentEvent.choices.map((choice) => (
                <button
                  key={choice.id}
                  className="decision-btn"
                  onClick={() => handleDecision(choice.id)}
                  style={{
                    minHeight: "90px",
                    height: "auto",
                    padding: "16px",
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                  }}
                >
                  <strong>{choice.label}</strong>
                  <span
                    style={{
                      display: "block",
                      marginTop: "6px",
                      fontSize: "0.85rem",
                      fontWeight: "normal",
                      lineHeight: 1.5,
                    }}
                  >
                    {choice.description}
                  </span>
                </button>
              ))
            ) : resolvedEvent ? (
              <div style={{ width: "100%", display: "grid", gap: "16px" }}>
                {/* Resource impact */}
                <section
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    background: "#0a1429",
                    border: "1px solid #2a3b58",
                  }}
                >
                  <h3 style={{ margin: "0 0 12px" }}>📊 Resource Impact</h3>
                  <p style={{ ...mutedTextStyle, marginTop: 0 }}>
                    Net change after your choice and the mission's daily
                    resource consumption.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {resolvedEvent.resourceChanges.map((item) => (
                      <div
                        key={item.key}
                        style={{
                          padding: "12px",
                          borderRadius: "9px",
                          background: "#111e37",
                        }}
                      >
                        <span style={{ display: "block", color: "#aebed6", fontSize: "0.82rem" }}>
                          {item.label}
                        </span>
                        <strong
                          style={{
                            display: "block",
                            margin: "7px 0",
                            color: item.change > 0 ? "#86efac" : item.change < 0 ? "#fca5a5" : "#dce7f8",
                            fontSize: "1.15rem",
                          }}
                        >
                          {formatDelta(item.change)}{RESOURCE_META[item.key]?.unit ?? ""}
                        </strong>
                        <span style={{ color: "#94a8c7", fontSize: "0.78rem" }}>
                          {item.before}% → {item.after}%
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "12px", color: "#dce7f8" }}>
                    Mission score change:{" "}
                    <strong style={{ color: resolvedEvent.scoreChange >= 0 ? "#86efac" : "#fca5a5" }}>
                      {formatDelta(resolvedEvent.scoreChange)}
                    </strong>
                  </div>
                </section>

                {/* Learning insight */}
                <section
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    background: "#10253a",
                    border: "1px solid #28516b",
                  }}
                >
                  <span style={{ ...smallLabelStyle, color: "#7dd3fc" }}>
                    SPACE SCIENCE INSIGHT
                  </span>
                  <h3 style={{ margin: "8px 0" }}>
                    {resolvedEvent.learningInsight.title}
                  </h3>
                  <p style={{ ...mutedTextStyle, margin: "0 0 12px" }}>
                    {resolvedEvent.learningInsight.fact}
                  </p>
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "9px",
                      background: "#0a192b",
                    }}
                  >
                    <strong style={{ color: "#86efac" }}>Key takeaway</strong>
                    <p style={{ ...mutedTextStyle, margin: "6px 0 0" }}>
                      {resolvedEvent.learningInsight.takeaway}
                    </p>
                  </div>
                </section>

                <button
                  className="decision-btn"
                  onClick={nextEvent}
                  style={{
                    background: "#111d38",
                    borderColor: accent,
                    width: "100%",
                    minHeight: "48px",
                    height: "auto",
                    padding: "14px",
                    whiteSpace: "normal",
                  }}
                >
                  {isGameOver
                    ? "View Final Mission Report →"
                    : "Learned It — Proceed to Next Event →"}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {/* Score and Objectives */}
        <aside className="score-panel">
          <span>MISSION SCORE</span>
          <strong>{score}</strong>
          <p>Make smart decisions and protect your crew.</p>

          <hr />

          <p>
            Events Resolved: {mission.eventCount} / {mission.duration}
          </p>

          <div style={{ textAlign: "left", marginTop: "16px" }}>
            <h3>Mission Objectives</h3>
            {mission.objectives.map((objective) => (
              <p
                key={objective.id}
                style={{
                  fontSize: "0.9rem",
                  color: objective.completed ? "#86efac" : "#9eabc3",
                }}
              >
                {objective.completed ? "✓" : "○"} {objective.title}
              </p>
            ))}
          </div>

          <hr />

          <div style={{ textAlign: "left", marginTop: "16px" }}>
            <h3>Learning Progress</h3>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>
              <strong>{missionLog.length}</strong> decisions reviewed
            </p>
            <button
              type="button"
              onClick={openLearningLog}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #405070",
                background: "#101d36",
                color: "#eef4ff",
                cursor: "pointer",
              }}
            >
              {showMissionLog ? "Go to Learning Log ↓" : "Open Learning Log"}
            </button>
          </div>
        </aside>
      </div>

      {renderMissionLog()}

      <button
        className="back-btn"
        onClick={() => navigate("/missions")}
      >
        ← Abort Mission
      </button>
    </section>
  );
}

export default MissionDashboard;
