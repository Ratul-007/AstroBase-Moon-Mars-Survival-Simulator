
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { RESOURCE_META, resolveDecision } from "../game/missionEngine";
import { useMissionSession } from "./MissionSessionContext";
import MissionCertificate from "../components/MissionCertificate";

// --------------------------------------------------
// SPACE SCIENCE LEARNING INSIGHTS
// --------------------------------------------------

function getLearningInsight(event) {
  const title = (event?.title ?? "").toLowerCase();
  const description = (event?.description ?? "").toLowerCase();
  const text = `${title} ${description}`;

  const lessons = [
    {
      keywords: ["communication antenna fault", "antenna fault"],
      title: "Communication Systems and Antenna Maintenance",
      fact: "Communication antennas connect a planetary habitat with Earth and other mission systems. Faults can interrupt updates, scientific data transfer and remote support.",
      takeaway: "Inspect communication equipment regularly and maintain backup communication procedures.",
    },
    {
      keywords: ["crop growth setback", "crop", "harvest"],
      title: "Food Production and Long-Term Reserves",
      fact: "Growing food in a space habitat depends on healthy plants, adequate water, lighting, nutrients and suitable environmental conditions.",
      takeaway: "Plan food reserves across the entire mission and monitor crop health.",
    },
    {
      keywords: ["radiation", "solar storm", "cosmic ray"],
      title: "Radiation Protection",
      fact: "The Moon and Mars lack Earth's global magnetic-field and atmospheric protection. Space radiation is an important consideration for crew safety.",
      takeaway: "Use suitable shielding, monitor radiation and follow storm-response procedures.",
    },
    {
      keywords: ["maintenance", "equipment fault", "equipment failure", "malfunction", "pressure leak", "habitat seal", "air filter", "repair"],
      title: "Habitat Maintenance and Reliability",
      fact: "A remote habitat depends on reliable equipment, filters, seals and control systems. Small faults can become serious if ignored.",
      takeaway: "Investigate faults early, follow maintenance procedures and preserve backup equipment.",
    },
    {
      keywords: ["communication", "antenna", "signal", "contact"],
      title: "Communication Systems in Space",
      fact: "Communication between Earth and another world can be delayed or interrupted. Crews cannot always rely on immediate replies.",
      takeaway: "Maintain backup procedures and make safe decisions independently when necessary.",
    },
    {
      keywords: ["power", "energy", "solar", "sunlight"],
      title: "Solar Energy and Power Management",
      fact: "Dust, shadows, panel orientation and environmental conditions can reduce solar output. Habitat systems compete for limited power.",
      takeaway: "Preserve energy reserves and prioritize essential habitat systems.",
    },
    {
      keywords: ["water", "ice", "recycling", "leak"],
      title: "Water Is a Critical Resource",
      fact: "Water supports drinking, hygiene and other life-support needs. Recycling and leak prevention improve resource availability.",
      takeaway: "Monitor reserves, prevent leaks and reuse water where possible.",
    },
    {
      keywords: ["oxygen", "air supply", "breathing", "atmosphere", "carbon dioxide"],
      title: "Keeping the Crew Breathing",
      fact: "A crewed habitat must maintain a safe breathable atmosphere through oxygen supply, carbon-dioxide removal and pressure monitoring.",
      takeaway: "Monitor life-support systems and maintain backup plans.",
    },
    {
      keywords: ["food", "plant", "nutrition"],
      title: "Food for Long-Duration Missions",
      fact: "Space crews need reliable food supplies and balanced nutrition. Growing food requires water, energy, equipment and time.",
      takeaway: "Plan food reserves across the entire mission, not just the current day.",
    },
    {
      keywords: ["dust", "sandstorm", "dust storm"],
      title: "Dust Is an Engineering Challenge",
      fact: "Lunar dust can be abrasive, while Martian dust can affect equipment and reduce sunlight reaching solar panels.",
      takeaway: "Protect equipment, monitor dust and schedule maintenance.",
    },
    {
      keywords: ["temperature", "cold", "heat", "thermal", "freeze", "overheating"],
      title: "Surviving Extreme Temperatures",
      fact: "Lunar and Martian habitats need thermal control to protect crew members and equipment from harsh temperature conditions.",
      takeaway: "Include heating and cooling needs in power planning.",
    },
    {
      keywords: ["medical", "injury", "health", "illness", "emergency"],
      title: "Crew Health and Emergency Planning",
      fact: "Medical support is harder to provide far from Earth because evacuation and resupply can take a long time.",
      takeaway: "Preventive care, emergency supplies and clear procedures are essential.",
    },
    {
      keywords: ["crew", "team", "conflict", "fatigue", "morale"],
      title: "Crew Safety and Teamwork",
      fact: "Long-duration missions require teamwork, careful scheduling, rest and attention to crew wellbeing.",
      takeaway: "Balance immediate tasks with long-term crew safety.",
    },
    {
      keywords: ["experiment", "science", "research", "sample"],
      title: "Scientific Exploration",
      fact: "Space missions have limited time, power and storage, so research must be balanced against operational safety.",
      takeaway: "Prioritize useful experiments without endangering essential systems.",
    },
  ];

  const match = lessons.find((lesson) =>
    lesson.keywords.some((keyword) => text.includes(keyword))
  );

  return (
    match ?? {
      title: "Systems Thinking in Space",
      fact: "A planetary habitat is an interconnected system. Power, water, food, oxygen, equipment and crew safety affect one another.",
      takeaway: "Consider both the immediate benefit and long-term resource cost before choosing an action.",
    }
  );
}

function getInteractionInsight(action) {
  const normalized = (action ?? "").toLowerCase();

  if (normalized.includes("solar") || normalized.includes("power")) {
    return getLearningInsight({
      title: "Solar Array Power Restoration",
      description: "solar energy power panel",
    });
  }

  if (normalized.includes("supply") || normalized.includes("cache")) {
    return getLearningInsight({
      title: "Emergency Supply Cache",
      description: "water food oxygen life support",
    });
  }

  if (normalized.includes("rover")) {
    return {
      title: "Rovers and Surface Exploration",
      fact: "Rovers help crews inspect planetary terrain, transport equipment and support exploration beyond the habitat.",
      takeaway: "Use exploration equipment carefully and keep essential habitat resources available.",
    };
  }

  return getLearningInsight({
    title: action ?? "Physical Mission Interaction",
    description: "habitat resource maintenance",
  });
}

function formatDelta(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : `${number}`;
}

function getEntryTitle(entry) {
  return (
    entry?.choiceTitle ??
    entry?.actionTitle ??
    entry?.interactionTitle ??
    entry?.eventTitle ??
    entry?.title ??
    "Mission Activity"
  );
}

function getEntryDescription(entry) {
  return (
    entry?.feedback ??
    entry?.choiceDescription ??
    entry?.description ??
    entry?.text ??
    "Mission activity recorded."
  );
}

function getEntryInsight(entry) {
  if (entry?.learningInsight) return entry.learningInsight;
  return getInteractionInsight(getEntryTitle(entry));
}

function getEntryResourceChanges(entry) {
  if (Array.isArray(entry?.resourceChanges)) {
    return entry.resourceChanges;
  }

  if (entry?.resourcesBefore && entry?.resourcesAfter) {
    return Object.keys(entry.resourcesBefore).map((key) => ({
      key,
      label: RESOURCE_META[key]?.label ?? key,
      before: entry.resourcesBefore[key],
      after: entry.resourcesAfter[key],
      change: entry.resourcesAfter[key] - entry.resourcesBefore[key],
    }));
  }

  return [];
}

function getEntryScoreChange(entry) {
  if (Number.isFinite(entry?.scoreChange)) return entry.scoreChange;

  if (
    Number.isFinite(entry?.scoreBefore) &&
    Number.isFinite(entry?.scoreAfter)
  ) {
    return entry.scoreAfter - entry.scoreBefore;
  }

  return 0;
}

function isPhysicalInteraction(entry) {
  const text = [
    entry?.type,
    entry?.category,
    entry?.source,
    entry?.actionType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("physical") ||
    text.includes("interaction") ||
    text.includes("supplies") ||
    text.includes("solar") ||
    text.includes("rover")
  );
}

// --------------------------------------------------
// MISSION DASHBOARD
// --------------------------------------------------

function MissionDashboard({ onAbortMission }) {
  const navigate = useNavigate();
  const learningLogRef = useRef(null);

  const {
    planet: environment,
    mission,
    setMission,
    resolvedEvent,
    setResolvedEvent,
    missionLog,
    setMissionLog,
    nextEvent,
    restartMission,
    taskStepIndex,
  } = useMissionSession();

  const [showMissionLog, setShowMissionLog] = useState(false);
  const [scrollToLearningLog, setScrollToLearningLog] = useState(false);

  // Certificate flow state
  const [showCertificateForm, setShowCertificateForm] = useState(false);
  const [showCertificatePreview, setShowCertificatePreview] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [certificateError, setCertificateError] = useState("");

  const isMars = environment === "mars";
  const planetName = isMars ? "Mars Outpost" : "Moon Outpost";
  const planetIcon = isMars ? "🔴" : "🌕";
  const accent = isMars ? "#fb923c" : "#7dd3fc";

  const resources = mission.resources ?? {};
  const score = mission.score ?? 0;
  const day = mission.day ?? 0;
  const currentEvent = mission.currentEvent;

  const fieldTask = currentEvent?.task ?? null;

  const remoteChoices = currentEvent
    ? currentEvent.choices.filter(
        (_, index) => !fieldTask || index === fieldTask.abortChoiceIndex
      )
    : [];

  const isSuccess = mission.missionStatus === "success";
  const isGameOver =
    isSuccess || mission.missionStatus === "failed";

  const isCriticalFailure =
    mission.missionStatus === "failed" &&
    Object.values(resources).some((value) => value <= 0);

  const objectives = mission.objectives ?? [];

  const completedObjectives = objectives.filter(
    (objective) => objective.completed
  ).length;

  const certificateStats = {
    power: Math.round(Number(resources.power) || 0),
    water: Math.round(Number(resources.water) || 0),
    food: Math.round(Number(resources.food) || 0),
    oxygen: Math.round(Number(resources.oxygen) || 0),
    score: Number(score) || 0,
    daysSurvived: Number(day) || 0,
  };

  const certificateMissionName = planetName;
  const certificateDays =
    Number(mission.duration) || (isMars ? 30 : 20);

  const resourceStatus = (value) => {
    if (value <= 0) return "CRITICAL";
    if (value < 25) return "LOW";
    if (value < 50) return "CAUTION";
    return "STABLE";
  };

  const openLearningLog = () => {
    if (showMissionLog) {
      setShowMissionLog(false);
      setScrollToLearningLog(false);
      return;
    }

    setShowMissionLog(true);
    setScrollToLearningLog(true);
  };

  useEffect(() => {
    if (!showMissionLog || !scrollToLearningLog) return;

    learningLogRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setScrollToLearningLog(false);
  }, [showMissionLog, scrollToLearningLog]);

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

    if (!nextMission || nextMission === mission) return;

    const resourceChanges = Object.keys(mission.resources ?? {}).map(
      (key) => ({
        key,
        label: RESOURCE_META[key]?.label ?? key,
        before: mission.resources[key],
        after: nextMission.resources[key],
        change: nextMission.resources[key] - mission.resources[key],
      })
    );

    const scoreChange = nextMission.score - mission.score;
    const learningInsight = getLearningInsight(currentEvent);

    const logEntry = {
      id: `${mission.eventCount}-${Date.now()}`,
      type: "decision",
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
    setMissionLog((previous) => [...previous, logEntry]);

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

  const handleRestart = () => {
    restartMission();
    setShowMissionLog(false);
    setScrollToLearningLog(false);
    setShowCertificateForm(false);
    setShowCertificatePreview(false);
    setPlayerName("");
    setCertificateError("");
  };

  const handleClaimCertificate = (event) => {
    event.preventDefault();

    if (!isSuccess) {
      setCertificateError(
        "A certificate is available only after a successful mission."
      );
      return;
    }

    const cleanedName = playerName.trim();

    if (!cleanedName) {
      setCertificateError("Please enter your name to continue.");
      return;
    }

    setPlayerName(cleanedName);
    setCertificateError("");
    setShowCertificateForm(false);
    navigate("/mission-certificate", {
      state: {
        certificate: {
          playerName: cleanedName,
          missionName: certificateMissionName,
          days: certificateDays,
          stats: certificateStats,
        },
      },
    });
  };

  const evaluatePerformance = () => {
    if (isSuccess) {
      return score >= 50
        ? "Excellent decisions helped protect the crew and complete the mission."
        : "All mission objectives were completed successfully.";
    }

    if (mission.failureReason) return mission.failureReason;

    if (isCriticalFailure) {
      return "A critical habitat resource reached 0%. The colony could not continue.";
    }

    if (score <= 0) {
      return "The mission ended with a non-positive score. Review your decisions and try again.";
    }

    return "One or more mission objectives were not completed.";
  };

  const panelStyle = {
    background: "rgba(12, 23, 46, 0.88)",
    border: "1px solid #263755",
    borderRadius: "16px",
    padding: "22px",
    minWidth: 0,
  };

  const smallLabelStyle = {
    color: "#94a8c7",
    fontSize: "0.78rem",
    letterSpacing: "1px",
    textTransform: "uppercase",
  };

  const mutedTextStyle = {
    color: "#aebed6",
    fontSize: "0.92rem",
    lineHeight: 1.7,
  };

  const renderLearningLog = () => (
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
        <p style={mutedTextStyle}>
          No mission activity has been recorded yet. Complete a mission
          decision or interact with the supply cache, solar array, or rover.
        </p>
      ) : (
        [...missionLog].reverse().map((entry, index) => {
          const physical = isPhysicalInteraction(entry);
          const title = getEntryTitle(entry);
          const description = getEntryDescription(entry);
          const insight = getEntryInsight(entry);
          const changes = getEntryResourceChanges(entry);
          const scoreChange = getEntryScoreChange(entry);

          return (
            <article
              key={entry.id ?? `${entry.day ?? 0}-${title}-${index}`}
              style={{
                padding: "17px",
                borderRadius: "12px",
                background: "#0a1429",
                border: `1px solid ${physical ? "#28664d" : "#2a3b58"}`,
              }}
            >
              <span style={smallLabelStyle}>
                {physical ? "🧰 PHYSICAL INTERACTION" : "MISSION DECISION"}
                {entry.day ? ` · DAY ${entry.day}` : ""}
              </span>

              <h3 style={{ margin: "8px 0", color: "#eef4ff" }}>
                {title}
              </h3>

              <p style={{ ...mutedTextStyle, margin: "0 0 10px" }}>
                {description}
              </p>

              {changes.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    margin: "12px 0",
                  }}
                >
                  {changes.map((item) => (
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
                      {item.label ?? RESOURCE_META[item.key]?.label ?? item.key}{" "}
                      {formatDelta(item.change)}
                      {RESOURCE_META[item.key]?.unit ?? ""}
                    </span>
                  ))}

                  <span
                    style={{
                      padding: "6px 9px",
                      borderRadius: "7px",
                      background: "#111e37",
                      color: scoreChange >= 0 ? "#86efac" : "#fca5a5",
                      fontSize: "0.82rem",
                    }}
                  >
                    Score {formatDelta(scoreChange)}
                  </span>
                </div>
              )}

              {changes.length === 0 && (
                <p style={{ ...mutedTextStyle, margin: "8px 0" }}>
                  Resource-change details were not included in this log entry.
                </p>
              )}

              {insight && (
                <div
                  style={{
                    padding: "13px",
                    borderRadius: "9px",
                    background: "#10253a",
                    borderLeft: "3px solid #7dd3fc",
                  }}
                >
                  <strong style={{ color: "#7dd3fc" }}>
                    {insight.title}
                  </strong>

                  <p style={{ ...mutedTextStyle, margin: "6px 0" }}>
                    {insight.fact}
                  </p>

                  <p style={{ ...mutedTextStyle, margin: 0 }}>
                    <strong>Takeaway: </strong>
                    {insight.takeaway}
                  </p>
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );

  // --------------------------------------------------
  // GENERATED CERTIFICATE SCREEN
  // --------------------------------------------------

  if (isSuccess && showCertificatePreview && playerName.trim()) {
    return (
      <section
        className="mission-dashboard certificate-preview-screen"
        style={{
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
            marginBottom: "20px",
            background: "linear-gradient(145deg, #102b2b, #0b172b 70%)",
            borderColor: "#b99545",
          }}
        >
          <div style={{ fontSize: "2.5rem" }}>🏅</div>
          <h1 style={{ color: "#fcd34d", margin: "8px 0" }}>
            Mission Certificate
          </h1>
          <p style={mutedTextStyle}>
            Congratulations, {playerName}! Your {planetName} campaign has
            been completed successfully.
          </p>
        </header>

        <MissionCertificate
          playerName={playerName}
          missionName={certificateMissionName}
          days={certificateDays}
          stats={certificateStats}
        />

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: "24px",
          }}
        >
          <button
            type="button"
            onClick={() => setShowCertificatePreview(false)}
            style={{
              padding: "13px 20px",
              borderRadius: "9px",
              border: "1px solid #405070",
              background: "transparent",
              color: "#eef4ff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ← Back to Mission Report
          </button>

          <button
            type="button"
            onClick={handleRestart}
            style={{
              padding: "13px 20px",
              border: "none",
              borderRadius: "9px",
              background: accent,
              color: "#06101f",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ↻ Start New Mission
          </button>

          <button
            type="button"
            onClick={() => navigate("/missions")}
            style={{
              padding: "13px 20px",
              borderRadius: "9px",
              border: "1px solid #405070",
              background: "transparent",
              color: "#eef4ff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Back to Missions
          </button>
        </div>
      </section>
    );
  }

  // --------------------------------------------------
  // CERTIFICATE CLAIM SCREEN
  // Only reachable after successful mission completion.
  // --------------------------------------------------

  if (isSuccess && showCertificateForm) {
    return (
      <section
        className="mission-dashboard certificate-screen"
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "24px",
          color: "#eef4ff",
        }}
      >
        <div
          style={{
            ...panelStyle,
            textAlign: "center",
            maxWidth: "760px",
            margin: "0 auto 24px",
            background: "linear-gradient(145deg, #10213d, #060b19)",
            borderColor: "#b99545",
          }}
        >
          <div style={{ fontSize: "3rem" }}>🏅</div>

          <span
            style={{
              color: "#fcd34d",
              letterSpacing: "2px",
              fontWeight: "bold",
            }}
          >
            MISSION CERTIFICATE
          </span>

          <h1 style={{ color: "#fcd34d", marginBottom: "10px" }}>
            Claim Your Certificate
          </h1>

          <p style={mutedTextStyle}>
            Congratulations! Enter your name as you want it to appear on
            your AstroBase mission completion certificate.
          </p>

          <form
            onSubmit={handleClaimCertificate}
            style={{
              display: "grid",
              gap: "14px",
              textAlign: "left",
              marginTop: "24px",
            }}
          >
            <label
              htmlFor="certificate-player-name"
              style={{ color: "#dbeafe", fontWeight: "bold" }}
            >
              Astronaut Name
            </label>

            <input
              id="certificate-player-name"
              type="text"
              value={playerName}
              onChange={(event) => {
                setPlayerName(event.target.value);
                setCertificateError("");
              }}
              placeholder="Enter your full name"
              maxLength={70}
              required
              autoComplete="name"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "14px",
                borderRadius: "9px",
                border: "1px solid #405070",
                background: "#0a1429",
                color: "#ffffff",
                fontSize: "1rem",
              }}
            />

            <div
              style={{
                padding: "14px",
                borderRadius: "10px",
                background: "#0a1429",
                border: "1px solid #263755",
              }}
            >
              <p style={{ margin: "0 0 8px" }}>
                <span style={{ color: "#94a8c7" }}>Mission: </span>
                <strong>{certificateMissionName}</strong>
              </p>

              <p style={{ margin: "0 0 8px" }}>
                <span style={{ color: "#94a8c7" }}>Campaign duration: </span>
                <strong>{certificateDays} days</strong>
              </p>

              <p style={{ margin: 0 }}>
                <span style={{ color: "#94a8c7" }}>Final score: </span>
                <strong style={{ color: "#fcd34d" }}>{score}</strong>
              </p>
            </div>

            {certificateError && (
              <p role="alert" style={{ color: "#fca5a5", margin: 0 }}>
                {certificateError}
              </p>
            )}

            <button
              type="submit"
              style={{
                padding: "14px 18px",
                border: "none",
                borderRadius: "9px",
                background: "linear-gradient(90deg, #fcd34d, #f59e0b)",
                color: "#101827",
                fontWeight: "bold",
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              Generate My Certificate →
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCertificateForm(false);
                setCertificateError("");
              }}
              style={{
                padding: "12px",
                border: "1px solid #405070",
                borderRadius: "9px",
                background: "transparent",
                color: "#eef4ff",
                cursor: "pointer",
              }}
            >
              ← Back to Mission Report
            </button>
          </form>
        </div>
      </section>
    );
  }

  // --------------------------------------------------
  // FINAL MISSION REPORT
  // --------------------------------------------------

 if (isGameOver) {
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

          <p style={{ color: "#d8e5fb", marginTop: "20px" }}>
            {planetIcon} {planetName} · {certificateDays}-Day Campaign
          </p>

          {isSuccess && (
            <div style={{ marginTop: "24px" }}>
              <p style={{ ...mutedTextStyle, marginBottom: "14px" }}>
                Your campaign is complete. Claim your certificate to
                celebrate your survival achievement.
              </p>

              <button
                type="button"
                onClick={() => {
                  setPlayerName("");
                  setCertificateError("");
                  setShowCertificatePreview(false);
                  setShowCertificateForm(true);
                }}
                style={{
                  padding: "15px 24px",
                  borderRadius: "10px",
                  border: "1px solid #fcd34d",
                  background: "linear-gradient(90deg, #fcd34d, #f59e0b)",
                  color: "#101827",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                🏅 Claim Your Certificate
              </button>
            </div>
          )}
        </header>

        <section style={panelStyle}>
          <h2>Final Performance</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
              gap: "12px",
            }}
          >
            {[
              ["Final Score", score],
              [
                "Events Resolved",
                `${mission.eventCount ?? 0} / ${mission.duration ?? certificateDays}`,
              ],
              [
                "Mission Day",
                `${day} / ${mission.duration ?? certificateDays}`,
              ],
              ["Objectives", `${completedObjectives} / ${objectives.length}`],
              ["Learning Log", missionLog.length],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  background: "#0a1429",
                  border: "1px solid #263755",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <span style={smallLabelStyle}>{label}</span>
                <div
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: "bold",
                    marginTop: "8px",
                    color: accent,
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={panelStyle}>
          <h2>Final Resource Status</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            {Object.entries(resources).map(([key, value]) => {
              const meta = RESOURCE_META[key];
              if (!meta) return null;

              return (
                <div
                  key={key}
                  style={{
                    background: "#0a1429",
                    border: `1px solid ${value <= 0 ? "#9f3d4b" : "#263755"}`,
                    borderRadius: "12px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <span>{meta.label}</span>
                    <strong
                      style={{
                        color: value <= 0 ? "#f87171" : meta.color,
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
                        background: value <= 0 ? "#f87171" : meta.color,
                      }}
                    />
                  </div>

                  <span style={smallLabelStyle}>
                    {resourceStatus(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section style={panelStyle}>
          <h2>Objective Report</h2>

          <div style={{ display: "grid", gap: "12px" }}>
            {objectives.map((objective) => (
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
                <span>{objective.completed ? "✅" : "○"}</span>

                <div>
                  <strong>{objective.title}</strong>
                  <p style={{ ...mutedTextStyle, margin: "5px 0 0" }}>
                    {objective.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={panelStyle}>
          <span style={smallLabelStyle}>AFTER-ACTION REVIEW</span>
          <h2>What Did You Learn?</h2>
          <p style={mutedTextStyle}>
            You recorded {missionLog.length} mission activities during this
            campaign, including decisions and physical interactions.
          </p>

          <button
            type="button"
            onClick={openLearningLog}
            aria-expanded={showMissionLog}
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
            {showMissionLog ? "Hide Activity Log ▲" : "Review Mission Activity ▼"}
          </button>

          {showMissionLog && renderLearningLog()}
        </section>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={handleRestart}
            style={{
              background: accent,
              color: "#06101f",
              padding: "14px 25px",
              border: "none",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            ↻ Restart Mission
          </button>

          <button
            type="button"
            onClick={() => navigate("/missions")}
            style={{
              background: "transparent",
              color: "#eef4ff",
              padding: "14px 25px",
              border: "1px solid #405070",
              borderRadius: "10px",
              fontWeight: "bold",
              cursor: "pointer",
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
    <section
      className="mission-dashboard"
      style={{
        maxWidth: "1440px",
        margin: "0 auto",
        padding: "24px 16px",
        color: "#eef4ff",
      }}
    >
      <header
        className="dashboard-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "22px",
        }}
      >
        <div>
          <span style={smallLabelStyle}>ACTIVE MISSION</span>
          <h1>{planetIcon} {planetName}</h1>
        </div>

        <div
          style={{
            background: "#0a1429",
            border: "1px solid #263755",
            borderRadius: "12px",
            padding: "15px 20px",
          }}
        >
          <span style={smallLabelStyle}>MISSION DAY</span>
          <strong style={{ display: "block", marginTop: "6px" }}>
            Day {day} of {mission.duration}
          </strong>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "20px",
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: "20px" }}>
          <section style={panelStyle}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <h2>Mission Resources</h2>
              <span>STATUS: {mission.crewStatus ?? "STABLE"}</span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(125px, 1fr))",
                gap: "12px",
              }}
            >
              {Object.entries(resources).map(([key, value]) => {
                const meta = RESOURCE_META[key];
                if (!meta) return null;

                return (
                  <div
                    key={key}
                    style={{
                      background: "#0a1429",
                      border: "1px solid #263755",
                      borderRadius: "12px",
                      padding: "14px",
                    }}
                  >
                    <span style={{ color: "#aebed6" }}>{meta.label}</span>
                    <strong
                      style={{
                        display: "block",
                        fontSize: "1.3rem",
                        margin: "8px 0",
                        color: value <= 0 ? "#f87171" : meta.color,
                      }}
                    >
                      {value}{meta.unit}
                    </strong>

                    <div
                      style={{
                        height: "7px",
                        background: "#1d2b44",
                        borderRadius: "20px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.max(0, Math.min(100, value))}%`,
                          background: value <= 0 ? "#f87171" : meta.color,
                        }}
                      />
                    </div>

                    <small style={{ display: "block", marginTop: "8px" }}>
                      {resourceStatus(value)}
                    </small>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={panelStyle}>
            <span style={smallLabelStyle}>
              {resolvedEvent
                ? "DECISION REVIEW"
                : `MISSION EVENT ${(mission.eventCount ?? 0) + 1} OF ${mission.duration}`}
            </span>

            <h2 style={{ margin: "10px 0" }}>
              {resolvedEvent
                ? resolvedEvent.title
                : currentEvent?.title ?? "Mission Results"}
            </h2>

            <p style={mutedTextStyle}>
              {resolvedEvent
                ? resolvedEvent.text
                : currentEvent?.description ?? "Preparing mission results..."}
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
                <strong style={{ color: accent }}>
                  Think Like an Astronaut
                </strong>
                <p style={{ ...mutedTextStyle, marginBottom: 0 }}>
                  Consider crew safety, available resources and how today's
                  decision might affect the rest of the campaign.
                </p>
              </div>
            )}

            {!resolvedEvent && fieldTask && (
              <div
                style={{
                  margin: "18px 0 0",
                  padding: "16px",
                  borderRadius: "12px",
                  background: "#10253a",
                  border: `1px solid ${accent}`,
                }}
              >
                <span style={{ ...smallLabelStyle, color: accent }}>
                  {fieldTask.badge}
                </span>
                <h3 style={{ margin: "8px 0" }}>{fieldTask.title}</h3>

                <div style={{ display: "grid", gap: "8px", margin: "12px 0" }}>
                  {fieldTask.steps.map((step, index) => {
                    const done = index < taskStepIndex;
                    const active = index === taskStepIndex;

                    return (
                      <div
                        key={step.stationId}
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                          padding: "10px 12px",
                          borderRadius: "9px",
                          background: active ? "#0f2f47" : "#0a1429",
                          border: `1px solid ${
                            done ? "#245743" : active ? accent : "#2a3b58"
                          }`,
                          opacity: done ? 0.75 : 1,
                        }}
                      >
                        <span aria-hidden="true">
                          {done ? "✅" : active ? "▶" : "○"}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <strong>{step.label}</strong>
                          <span
                            style={{
                              marginLeft: "8px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: step.zone === "red" ? "#fca5a5" : "#7dd3fc",
                            }}
                          >
                            {step.zone === "red" ? "RED ZONE" : "SAFE ZONE"}
                          </span>
                          <div style={{ ...mutedTextStyle, lineHeight: 1.5 }}>
                            {step.action}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p style={{ ...mutedTextStyle, margin: 0 }}>
                  Reward: full outcome plus{" "}
                  <strong style={{ color: "#86efac" }}>
                    +{fieldTask.bonusScore} bonus score
                  </strong>
                  . Red-zone stations drain suit oxygen, so plan your route and
                  return to the blue zone to refill. Use the compass in the 3D
                  view to find the next station.
                </p>
              </div>
            )}

            {!resolvedEvent && fieldTask && remoteChoices.length > 0 && (
              <p
                style={{
                  ...mutedTextStyle,
                  margin: "16px 0 0",
                  fontSize: "0.82rem",
                }}
              >
                Last resort: abort the task. This costs score and resources.
              </p>
            )}

            {!resolvedEvent && currentEvent && (
              <div style={{ display: "grid", gap: "12px", marginTop: "18px" }}>
                {remoteChoices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => handleDecision(choice.id)}
                    style={{
                      textAlign: "left",
                      minHeight: "80px",
                      padding: "16px",
                      borderRadius: "10px",
                      border: "1px solid #405070",
                      background: "#101d36",
                      color: "#eef4ff",
                      cursor: "pointer",
                    }}
                  >
                    <strong>{choice.label}</strong>
                    <span
                      style={{
                        display: "block",
                        marginTop: "6px",
                        color: "#aebed6",
                        lineHeight: 1.5,
                      }}
                    >
                      {choice.description}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {resolvedEvent && (
              <div style={{ display: "grid", gap: "16px", marginTop: "18px" }}>
                <section
                  style={{
                    padding: "16px",
                    borderRadius: "12px",
                    background: "#0a1429",
                    border: "1px solid #2a3b58",
                  }}
                >
                  <h3>📊 Resource Impact</h3>
                  <p style={mutedTextStyle}>
                    Net change after your choice and daily resource consumption.
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(125px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {(resolvedEvent.resourceChanges ?? []).map((item) => (
                      <div
                        key={item.key}
                        style={{
                          padding: "12px",
                          borderRadius: "9px",
                          background: "#111e37",
                        }}
                      >
                        <span>{item.label}</span>
                        <strong
                          style={{
                            display: "block",
                            margin: "7px 0",
                            color:
                              item.change > 0
                                ? "#86efac"
                                : item.change < 0
                                  ? "#fca5a5"
                                  : "#dce7f8",
                          }}
                        >
                          {formatDelta(item.change)}{RESOURCE_META[item.key]?.unit ?? ""}
                        </strong>
                        <small>{item.before}% → {item.after}%</small>
                      </div>
                    ))}
                  </div>

                  <p>
                    Mission score change:{" "}
                    <strong
                      style={{
                        color: resolvedEvent.scoreChange >= 0 ? "#86efac" : "#fca5a5",
                      }}
                    >
                      {formatDelta(resolvedEvent.scoreChange)}
                    </strong>
                  </p>
                </section>

                {resolvedEvent.learningInsight && (
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
                    <h3>{resolvedEvent.learningInsight.title}</h3>
                    <p style={mutedTextStyle}>
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
                      <p style={mutedTextStyle}>
                        {resolvedEvent.learningInsight.takeaway}
                      </p>
                    </div>
                  </section>
                )}

                <button
                  type="button"
                  onClick={nextEvent}
                  style={{
                    width: "100%",
                    minHeight: "48px",
                    padding: "14px",
                    borderRadius: "10px",
                    border: `1px solid ${accent}`,
                    background: "#111d38",
                    color: "#eef4ff",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  {isGameOver
                    ? "View Final Mission Report →"
                    : "Learned It — Proceed to Next Event →"}
                </button>
              </div>
            )}
          </section>
        </div>

        <aside style={{ ...panelStyle, position: "sticky", top: "16px" }}>
          <span style={smallLabelStyle}>MISSION SCORE</span>
          <strong
            style={{
              display: "block",
              fontSize: "2.4rem",
              marginTop: "8px",
            }}
          >
            {score}
          </strong>
          <p style={mutedTextStyle}>
            Make smart decisions and protect your crew.
          </p>
          <hr style={{ borderColor: "#263755" }} />

          <h3>Mission Objectives</h3>
          {objectives.map((objective) => (
            <p
              key={objective.id}
              style={{
                fontSize: "0.9rem",
                color: objective.completed ? "#86efac" : "#9eabc3",
                lineHeight: 1.5,
              }}
            >
              {objective.completed ? "✓" : "○"} {objective.title}
            </p>
          ))}

          <hr style={{ borderColor: "#263755" }} />

          <h3>Learning Progress</h3>
          <p style={mutedTextStyle}>
            <strong>{missionLog.length}</strong> activities recorded
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
            {showMissionLog ? "Hide Learning Log ▲" : "Open Learning Log ▼"}
          </button>
        </aside>
      </div>

      {showMissionLog && (
        <section style={{ ...panelStyle, marginTop: "22px" }}>
          <span style={smallLabelStyle}>MISSION ACTIVITY HISTORY</span>
          <h2>Mission Learning Log</h2>
          <p style={mutedTextStyle}>
            Review your decisions and physical interactions and their effects
            on the habitat.
          </p>
          {renderLearningLog()}
        </section>
      )}

      <button
        type="button"
        onClick={onAbortMission}
        style={{
          marginTop: "22px",
          padding: "12px 18px",
          borderRadius: "9px",
          border: "1px solid #405070",
          background: "transparent",
          color: "#eef4ff",
          cursor: "pointer",
        }}
      >
        ← Abort Mission
      </button>
    </section>
  );
}

export default MissionDashboard;
