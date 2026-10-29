
import { useNavigate } from "react-router-dom";

const missions = [
  {
    id: "moon",
    number: "01",
    classification: "LUNAR OPERATIONS",
    title: "Moon Outpost",
    subtitle: "SURVIVE THE LUNAR FRONTIER",
    description:
      "Establish a lunar outpost, manage critical supplies, and respond to mission events. Every decision affects your ability to survive.",
    duration: "20 DAYS",
    environment: "LUNAR SURFACE",
    difficulty: "SURVIVAL",
    objective: "Keep your outpost operational",
    hazards: ["Resource depletion", "Power management", "Mission events"],
    button: "DEPLOY TO MOON",
    route: "/mission/moon",
    planet: "MOON",
    image:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1800&q=85",
  },
  {
    id: "mars",
    number: "02",
    classification: "MARS EXPEDITION",
    title: "Mars Outpost",
    subtitle: "ENDURE THE RED PLANET",
    description:
      "Operate a remote outpost on Mars. Balance essential resources, adapt to unexpected challenges, and make every mission day count.",
    duration: "30 DAYS",
    environment: "MARTIAN SURFACE",
    difficulty: "EXTENDED SURVIVAL",
    objective: "Complete the extended campaign",
    hazards: ["Limited resources", "Unexpected events", "Long campaign"],
    button: "DEPLOY TO MARS",
    route: "/mission/mars",
    planet: "MARS",
    image:
      "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&w=1800&q=85",
  },
];

function MissionSelect() {
  const navigate = useNavigate();

  return (
    <main className="mission-command-page">
      <header className="command-header">
        <button
          type="button"
          className="command-brand"
          onClick={() => navigate("/")}
          aria-label="Return to AstroBase home"
        >
          <span className="command-brand-mark">A</span>
          <span>
            <strong>ASTROBASE</strong>
            <small>PLANETARY SURVIVAL PROGRAM</small>
          </span>
        </button>

        <div className="command-status">
          <span className="command-status-dot" />
          SIMULATION SYSTEMS READY
        </div>
      </header>

      <section className="command-intro">
        <div className="command-eyebrow">
          <span>MISSION CONTROL</span>
          <span className="command-divider">/</span>
          <span>CAMPAIGN SELECT</span>
        </div>

        <h1>
          Choose your
          <span> frontier.</span>
        </h1>

        <p className="command-description">
          Two worlds. Different survival challenges. One mission:
          keep your outpost alive.
        </p>

        <div className="command-instruction">
          <span className="instruction-crosshair">+</span>
          SELECT AN OPERATION TO REVIEW YOUR MISSION PARAMETERS
        </div>
      </section>

      <section
        className="campaign-grid"
        aria-label="Available survival campaigns"
      >
        {missions.map((mission) => (
          <article
            className={`campaign-card campaign-${mission.id}`}
            key={mission.id}
          >
            <div
              className="campaign-landscape"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(4, 10, 20, 0.04) 0%, rgba(4, 10, 20, 0.12) 35%, rgba(4, 10, 20, 0.94) 100%), url("${mission.image}")`,
              }}
            >
              <div className="campaign-topline">
                <span className="campaign-number">
                  OPERATION {mission.number}
                </span>
                <span className="campaign-availability">
                  <span />
                  AVAILABLE
                </span>
              </div>

              <div className="campaign-planet-label">
                {mission.planet}
              </div>

              <div className="campaign-title-block">
                <p className="campaign-classification">
                  {mission.classification}
                </p>
                <h2>{mission.title}</h2>
                <p className="campaign-subtitle">
                  {mission.subtitle}
                </p>
              </div>
            </div>

            <div className="campaign-content">
              <p className="campaign-description">
                {mission.description}
              </p>

              <div className="campaign-specs">
                <div className="campaign-spec">
                  <span>CAMPAIGN</span>
                  <strong>{mission.duration}</strong>
                </div>

                <div className="campaign-spec">
                  <span>ENVIRONMENT</span>
                  <strong>{mission.environment}</strong>
                </div>

                <div className="campaign-spec">
                  <span>MODE</span>
                  <strong>{mission.difficulty}</strong>
                </div>
              </div>

              <div className="campaign-objective">
                <span className="objective-icon">◎</span>
                <div>
                  <span>PRIMARY OBJECTIVE</span>
                  <strong>{mission.objective}</strong>
                </div>
              </div>

              <div className="campaign-hazards">
                <span className="hazards-label">
                  OPERATIONAL CHALLENGES
                </span>

                <div className="hazard-list">
                  {mission.hazards.map((hazard) => (
                    <span className="hazard-tag" key={hazard}>
                      {hazard}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="campaign-deploy-btn"
                onClick={() => navigate(mission.route)}
              >
                <span>{mission.button}</span>
                <span className="deploy-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="survival-protocol">
        <div className="protocol-heading">
          <span className="protocol-icon">⌘</span>
          <div>
            <p>BEFORE YOU DEPLOY</p>
            <h2>Know your mission protocol.</h2>
          </div>
        </div>

        <div className="protocol-item">
          <span>01</span>
          <div>
            <strong>Monitor resources</strong>
            <p>Protect power, water, food and oxygen.</p>
          </div>
        </div>

        <div className="protocol-item">
          <span>02</span>
          <div>
            <strong>Make critical decisions</strong>
            <p>Respond to the events each mission presents.</p>
          </div>
        </div>

        <div className="protocol-item">
          <span>03</span>
          <div>
            <strong>Complete your campaign</strong>
            <p>Survive the full mission and work toward your objectives.</p>
          </div>
        </div>
      </section>

      <footer className="command-footer">
        <button
          type="button"
          className="command-back-btn"
          onClick={() => navigate("/")}
        >
          <span aria-hidden="true">←</span>
          BACK TO HOME
        </button>

        <p>ASTROBASE // HUMANITY'S NEXT FRONTIER</p>

        <span className="footer-system-status">
          SYSTEM STATUS: READY
        </span>
      </footer>
    </main>
  );
}

export default MissionSelect;
