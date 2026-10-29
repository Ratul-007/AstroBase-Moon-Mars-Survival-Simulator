
import { useLocation, useNavigate } from "react-router-dom";
import { INITIAL_RESOURCES, RESOURCE_META } from "../game/missionEngine";

function MissionSetup() {
  const location = useLocation();
  const navigate = useNavigate();

  const isMars = location.pathname.includes("mars");

  const mission = {
    name: isMars ? "Mars Outpost" : "Moon Outpost",
    type: isMars ? "MARS EXPEDITION" : "LUNAR OPERATIONS",
    icon: isMars ? "🔴" : "🌕",
    duration: isMars ? 30 : 20,
    planet: isMars ? "MARS" : "THE MOON",
    subtitle: isMars
      ? "ENDURE THE RED PLANET"
      : "SURVIVE THE LUNAR FRONTIER",
    objective: isMars
      ? "Maintain a sustainable Mars outpost while managing limited resources and responding to unexpected mission challenges."
      : "Establish a stable lunar outpost while balancing essential resources and responding to mission events.",
    environment: isMars
      ? "MARTIAN SURFACE"
      : "LUNAR SURFACE",
    route: isMars ? "mars" : "moon",
  };

  const resourceIcons = {
    power: "⚡",
    water: "💧",
    food: "🍎",
    oxygen: "🫁",
    shielding: "☢️",
    radiation: "☢️",
  };

  const resourceEntries = Object.entries(INITIAL_RESOURCES);

  const formatResourceLabel = (key) =>
    RESOURCE_META[key]?.label ??
    key.charAt(0).toUpperCase() + key.slice(1);

  const handleBeginMission = () => {
    navigate("/mission", {
      state: {
        planet: mission.route,
      },
    });
  };

  return (
    <main
      className={`prelaunch-page ${isMars ? "prelaunch-mars" : "prelaunch-moon"}`}
    >
      <header className="prelaunch-header">
        <button
          type="button"
          className="prelaunch-brand"
          onClick={() => navigate("/")}
          aria-label="Return to AstroBase home"
        >
          <span className="prelaunch-brand-mark">A</span>

          <span className="prelaunch-brand-copy">
            <strong>ASTROBASE</strong>
            <small>PLANETARY SURVIVAL PROGRAM</small>
          </span>
        </button>

        <div className="prelaunch-status">
          <span className="prelaunch-status-dot" />
          PRE-LAUNCH CHECK
        </div>
      </header>

      <section className="prelaunch-hero">
        <div className="prelaunch-hero-image" aria-hidden="true">
          <div className="prelaunch-orbit orbit-one" />
          <div className="prelaunch-orbit orbit-two" />
          <div className="prelaunch-planet">
            {mission.icon}
          </div>
          <div className="prelaunch-scanline" />
        </div>

        <div className="prelaunch-hero-content">
          <div className="prelaunch-breadcrumb">
            <span>MISSION CONTROL</span>
            <span>/</span>
            <span>PRE-LAUNCH</span>
          </div>

          <p className="prelaunch-classification">
            {mission.type}
          </p>

          <h1>{mission.name}</h1>

          <p className="prelaunch-subtitle">
            {mission.subtitle}
          </p>

          <p className="prelaunch-intro">
            Your mission begins here. Review the objective,
            inspect your starting resources, and prepare for
            deployment.
          </p>

          <div className="prelaunch-hero-meta">
            <div>
              <span>DESTINATION</span>
              <strong>{mission.planet}</strong>
            </div>

            <div>
              <span>DURATION</span>
              <strong>{mission.duration} DAYS</strong>
            </div>

            <div>
              <span>ENVIRONMENT</span>
              <strong>{mission.environment}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="prelaunch-main">
        <div className="prelaunch-section-heading">
          <div>
            <p className="prelaunch-eyebrow">
              01 / MISSION BRIEFING
            </p>
            <h2>Know your objective.</h2>
          </div>

          <span className="prelaunch-section-code">
            BRIEFING FILE // {isMars ? "M-030" : "L-020"}
          </span>
        </div>

        <article className="prelaunch-objective">
          <div className="prelaunch-objective-icon" aria-hidden="true">
            ◎
          </div>

          <div>
            <p className="prelaunch-panel-label">
              PRIMARY MISSION OBJECTIVE
            </p>
            <p className="prelaunch-objective-text">
              {mission.objective}
            </p>
          </div>
        </article>

        <div className="prelaunch-section-heading resource-heading">
          <div>
            <p className="prelaunch-eyebrow">
              02 / SYSTEMS TELEMETRY
            </p>
            <h2>Starting resources.</h2>
          </div>

          <span className="prelaunch-section-code">
            INITIAL READINGS
          </span>
        </div>

        <div className="prelaunch-resource-grid">
          {resourceEntries.map(([key, value]) => {
            const numericValue = Number(value);
            const percentage = Number.isFinite(numericValue)
              ? Math.max(0, Math.min(100, numericValue))
              : 0;

            return (
              <article className="prelaunch-resource" key={key}>
                <div className="prelaunch-resource-top">
                  <span
                    className="prelaunch-resource-icon"
                    aria-hidden="true"
                  >
                    {resourceIcons[key] ?? "◈"}
                  </span>

                  <span className="prelaunch-resource-status">
                    NOMINAL
                  </span>
                </div>

                <p className="prelaunch-resource-label">
                  {formatResourceLabel(key)}
                </p>

                <div className="prelaunch-resource-value">
                  <strong>
                    {value}
                    <span>%</span>
                  </strong>
                  <span className="prelaunch-resource-unit">
                    CAPACITY
                  </span>
                </div>

                <div
                  className="prelaunch-resource-track"
                  role="progressbar"
                  aria-label={`${formatResourceLabel(key)} starting level`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percentage}
                >
                  <span
                    className="prelaunch-resource-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </article>
            );
          })}
        </div>

        <div className="prelaunch-notice">
          <span className="prelaunch-notice-icon" aria-hidden="true">
            !
          </span>

          <p>
            <strong>MISSION REMINDER</strong>
            Resource levels can change as the mission progresses.
            Monitor your systems and respond carefully to each
            mission event.
          </p>
        </div>

        <section className="prelaunch-launch-panel">
          <div className="prelaunch-launch-copy">
            <p className="prelaunch-eyebrow">
              03 / FINAL AUTHORIZATION
            </p>

            <h2>Ready for deployment?</h2>

            <p>
              Confirm your destination and begin the survival
              campaign. Your decisions start counting on Day 1.
            </p>
          </div>

          <button
            type="button"
            className="prelaunch-launch-btn"
            onClick={handleBeginMission}
          >
            <span className="prelaunch-launch-icon" aria-hidden="true">
              🚀
            </span>

            <span className="prelaunch-launch-text">
              <strong>BEGIN MISSION</strong>
              <small>INITIATE {mission.planet} CAMPAIGN</small>
            </span>

            <span className="prelaunch-launch-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
        </section>

        <footer className="prelaunch-footer">
          <button
            type="button"
            className="prelaunch-back-btn"
            onClick={() => navigate("/missions")}
          >
            <span aria-hidden="true">←</span>
            BACK TO MISSION SELECTION
          </button>

          <span className="prelaunch-footer-status">
            ASTROBASE // SYSTEMS READY
          </span>
        </footer>
      </section>
    </main>
  );
}

export default MissionSetup;
