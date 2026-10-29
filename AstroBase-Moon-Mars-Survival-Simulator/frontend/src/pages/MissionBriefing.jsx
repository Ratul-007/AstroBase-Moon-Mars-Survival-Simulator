
import { useNavigate } from "react-router-dom";

const missionBriefings = [
  {
    id: "moon",
    number: "01",
    name: "Moon Outpost",
    subtitle: "LUNAR OPERATIONS",
    duration: "20 DAYS",
    environment: "AIRLESS · LOW GRAVITY · EXTREME TEMPERATURES",
    description:
      "Establish and maintain a functioning lunar outpost. Every decision affects your ability to keep the crew and critical systems operational.",
    priorities: [
      "Maintain sufficient power for essential systems.",
      "Conserve water and food supplies.",
      "Protect oxygen availability and life support.",
      "Respond to daily events without exhausting resources.",
    ],
    hazards: ["Power shortage", "Temperature extremes", "Resource depletion"],
    className: "moon",
  },
  {
    id: "mars",
    number: "02",
    name: "Mars Outpost",
    subtitle: "MARTIAN OPERATIONS",
    duration: "30 DAYS",
    environment: "THIN ATMOSPHERE · DUST STORMS · ISOLATION",
    description:
      "Operate a remote Martian outpost over a longer campaign. Plan resource consumption carefully and adapt when unexpected mission events threaten survival.",
    priorities: [
      "Balance power generation with daily demand.",
      "Manage water, food and oxygen reserves.",
      "Keep critical life-support systems operational.",
      "Adapt decisions to survive the extended campaign.",
    ],
    hazards: ["Dust storms", "Power disruption", "Long-term shortages"],
    className: "mars",
  },
];

const systems = [
  { number: "01", name: "POWER", description: "Energy for essential operations" },
  { number: "02", name: "WATER", description: "Daily supply and conservation" },
  { number: "03", name: "FOOD", description: "Crew provisions and reserves" },
  { number: "04", name: "OXYGEN", description: "Breathable air availability" },
  { number: "05", name: "LIFE SUPPORT", description: "Systems required for survival" },
];

function MissionBriefing() {
  const navigate = useNavigate();

  return (
    <main className="mission-briefing-page">
      <header className="briefing-header">
        <button
          type="button"
          className="briefing-brand"
          onClick={() => navigate("/")}
          aria-label="Return to AstroBase home"
        >
          <span className="briefing-brand-mark">A</span>
          <span>
            <strong>ASTROBASE</strong>
            <small>MISSION OPERATIONS</small>
          </span>
        </button>

        <div className="briefing-header-status">
          <span className="briefing-status-dot" />
          MISSION DATABASE / ONLINE
        </div>

        <button
          type="button"
          className="briefing-back-button"
          onClick={() => navigate("/missions")}
        >
          MISSION SELECTION <span aria-hidden="true">↗</span>
        </button>
      </header>

      <section className="briefing-hero">
        <div className="briefing-hero-grid" aria-hidden="true" />

        <div className="briefing-hero-content">
          <div className="briefing-eyebrow">
            <span className="briefing-status-dot" />
            FLIGHT OPERATIONS / PRE-MISSION INTELLIGENCE
          </div>

          <h1>
            KNOW YOUR
            <br />
            <span>MISSION.</span>
          </h1>

          <p className="briefing-hero-description">
            Every destination has its own survival challenges. Review your
            operating environment, understand your priorities and prepare
            before committing to the mission.
          </p>

          <div className="briefing-hero-meta">
            <div>
              <span className="briefing-meta-label">AVAILABLE CAMPAIGNS</span>
              <strong>02</strong>
            </div>
            <div>
              <span className="briefing-meta-label">TOTAL MISSION DAYS</span>
              <strong>20 / 30</strong>
            </div>
            <div>
              <span className="briefing-meta-label">CORE SYSTEMS</span>
              <strong>05</strong>
            </div>
          </div>
        </div>

        <div className="briefing-orbit-visual" aria-hidden="true">
          <div className="briefing-orbit briefing-orbit-one" />
          <div className="briefing-orbit briefing-orbit-two" />
          <div className="briefing-planet briefing-planet-moon" />
          <div className="briefing-orbit-label briefing-orbit-label-top">
            DESTINATION // 001
          </div>
          <div className="briefing-orbit-label briefing-orbit-label-bottom">
            SURVIVAL IS A SYSTEM
          </div>
        </div>

        <div className="briefing-scroll-cue">
          <span>01</span> REVIEW MISSION PROFILES <span>↓</span>
        </div>
      </section>

      <section className="briefing-campaigns">
        <div className="briefing-section-topline">
          <span>02 / CAMPAIGN INTELLIGENCE</span>
          <span>SELECT A DESTINATION TO REVIEW</span>
        </div>

        <div className="briefing-section-heading">
          <p className="briefing-section-eyebrow">MISSION PROFILES</p>
          <h2>
            TWO WORLDS.
            <br />
            <span>TWO SURVIVAL CHALLENGES.</span>
          </h2>
          <p>
            Understand the environment, prepare your priorities and know
            what it takes to complete each campaign.
          </p>
        </div>

        <div className="briefing-mission-grid">
          {missionBriefings.map((mission) => (
            <article
              className={`briefing-mission-card briefing-${mission.className}`}
              key={mission.id}
            >
              <div className="briefing-card-art">
                <div className="briefing-card-art-grid" aria-hidden="true" />
                <span className="briefing-card-index">
                  DESTINATION / {mission.number}
                </span>
                <div
                  className={`briefing-card-planet briefing-card-planet-${mission.className}`}
                  aria-hidden="true"
                />
                <span className="briefing-card-coordinate">
                  {mission.id === "moon"
                    ? "LUNAR SURFACE // 001"
                    : "MARTIAN SURFACE // 002"}
                </span>
                <span className="briefing-card-duration">
                  {mission.duration}
                </span>
              </div>

              <div className="briefing-card-body">
                <div className="briefing-card-meta">
                  <span>{mission.subtitle}</span>
                  <span className="briefing-card-status">
                    <span className="briefing-status-dot" />
                    CAMPAIGN AVAILABLE
                  </span>
                </div>

                <h3>{mission.name}</h3>

                <p className="briefing-environment">
                  {mission.environment}
                </p>

                <p className="briefing-card-description">
                  {mission.description}
                </p>

                <div className="briefing-detail-group">
                  <h4>PRIMARY OBJECTIVES</h4>
                  <ul className="briefing-priority-list">
                    {mission.priorities.map((priority, index) => (
                      <li key={priority}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        {priority}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="briefing-detail-group">
                  <h4>OPERATIONAL RISKS</h4>
                  <div className="briefing-hazard-list">
                    {mission.hazards.map((hazard) => (
                      <span key={hazard}>{hazard}</span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="briefing-select-button"
                  onClick={() => navigate("/missions")}
                >
                  <span>
                    <small>READY TO PREPARE?</small>
                    <strong>PROCEED TO MISSION SELECTION</strong>
                  </span>
                  <span className="briefing-button-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>
              </div>
            </article>
          ))}
        </div>

        <p className="briefing-note">
          NOTE: Final mission configuration and destination selection take
          place in the existing mission selection workflow.
        </p>
      </section>

      <section className="briefing-systems-section" id="briefing-systems">
        <div className="briefing-section-topline">
          <span>03 / LIFE SUPPORT ARCHITECTURE</span>
          <span>CONTINUOUS RESOURCE MONITORING</span>
        </div>

        <div className="briefing-systems-heading">
          <div>
            <p className="briefing-section-eyebrow">MISSION SYSTEMS</p>
            <h2>
              SURVIVAL DEPENDS
              <br />
              <span>ON THE SYSTEM.</span>
            </h2>
          </div>

          <p>
            Resources are interconnected. A decision that helps one system
            may place additional pressure on another. Monitor your supplies
            and plan for the days ahead.
          </p>
        </div>

        <div className="briefing-systems-grid">
          {systems.map((system) => (
            <article className="briefing-system-item" key={system.number}>
              <span className="briefing-system-number">{system.number}</span>
              <div className="briefing-system-symbol" aria-hidden="true">
                {system.number === "01" && "ϟ"}
                {system.number === "02" && "◌"}
                {system.number === "03" && "⌁"}
                {system.number === "04" && "◎"}
                {system.number === "05" && "◇"}
              </div>
              <h3>{system.name}</h3>
              <p>{system.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="briefing-decision-section">
        <div className="briefing-decision-panel">
          <div className="briefing-decision-copy">
            <p className="briefing-section-eyebrow">
              04 / COMMANDER READINESS
            </p>
            <h2>
              EVERY DECISION
              <br />
              <span>HAS A CONSEQUENCE.</span>
            </h2>
            <p>
              A resource shortage, an unexpected event or a difficult trade-off
              can change the outcome of your mission. Assess the situation,
              choose your response and manage the consequences.
            </p>
          </div>

          <div className="briefing-scenario">
            <div className="briefing-scenario-top">
              <span>SIMULATED TRAINING SCENARIO</span>
              <span>CASE / 001</span>
            </div>

            <h3>Power reserves are falling.</h3>

            <p>
              Your outpost needs power for essential systems, but available
              energy is running low. What should a mission commander consider?
            </p>

            <div className="briefing-scenario-option">
              <span>A</span>
              <div>
                <strong>Prioritize essential systems</strong>
                <p>Review critical needs before allocating remaining power.</p>
              </div>
            </div>

            <div className="briefing-scenario-option">
              <span>B</span>
              <div>
                <strong>Review resource consumption</strong>
                <p>Identify avoidable demand and prepare for future needs.</p>
              </div>
            </div>

            <div className="briefing-scenario-disclaimer">
              TRAINING EXAMPLE — NOT AN ACTIVE GAME DECISION
            </div>
          </div>
        </div>
      </section>

      <footer className="briefing-footer">
        <div>
          <span className="briefing-brand-mark">A</span>
          <div>
            <strong>ASTROBASE</strong>
            <p>MISSION BRIEFING / END OF REPORT</p>
          </div>
        </div>

        <button
          type="button"
          className="briefing-footer-button"
          onClick={() => navigate("/missions")}
        >
          CONTINUE TO MISSION SELECTION <span aria-hidden="true">↗</span>
        </button>

        <button
          type="button"
          className="briefing-home-link"
          onClick={() => navigate("/")}
        >
          RETURN HOME
        </button>
      </footer>
    </main>
  );
}

export default MissionBriefing;
