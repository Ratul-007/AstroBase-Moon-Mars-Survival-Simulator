
import { useNavigate } from "react-router-dom";

function MissionOverview() {
  const navigate = useNavigate();

  return (
    <section className="mission-showcase" id="missions">
      <div className="showcase-topline">
        <span className="status-dot" />
        <span>MISSION CONTROL // AVAILABLE CAMPAIGNS</span>
        <span className="topline-line" />
        <span className="topline-index">01 — 02</span>
      </div>

      <div className="showcase-heading">
        <div>
          <p className="section-eyebrow">CHOOSE YOUR DESTINATION</p>
          <h2>
            Two worlds.
            <span>One mission.</span>
          </h2>
        </div>

        <p className="showcase-description">
          Beyond Earth, every decision matters. Select your
          destination and prepare to keep your crew alive.
        </p>
      </div>

      <div className="planet-grid">
        <article className="planet-card moon-card">
          <div className="planet-card-art moon-art" aria-hidden="true">
            <div className="planet-orb moon-orb" />
            <div className="planet-horizon" />
            <span className="planet-coordinate">LAT 28.5° N / LUNAR</span>
            <span className="planet-number">01</span>
          </div>

          <div className="planet-card-body">
            <div className="planet-meta">
              <span className="planet-tag">LUNAR OPERATIONS</span>
              <span className="campaign-length">20 MISSION DAYS</span>
            </div>

            <h3>Moon Outpost</h3>
            <p>
              Establish a lunar foothold. Manage limited supplies,
              maintain life support and survive the harsh lunar
              environment.
            </p>

            <div className="mission-challenges">
              <span>01 / POWER</span>
              <span>02 / OXYGEN</span>
              <span>03 / SURVIVAL</span>
            </div>

            <button
              className="planet-launch"
              type="button"
              onClick={() => navigate("/missions")}
            >
              <span>Explore mission</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </article>

        <article className="planet-card mars-card">
          <div className="planet-card-art mars-art" aria-hidden="true">
            <div className="planet-orb mars-orb" />
            <div className="planet-horizon" />
            <span className="planet-coordinate">LAT 18.4° N / MARS</span>
            <span className="planet-number">02</span>
          </div>

          <div className="planet-card-body">
            <div className="planet-meta">
              <span className="planet-tag">DEEP SPACE OPERATIONS</span>
              <span className="campaign-length">30 MISSION DAYS</span>
            </div>

            <h3>Mars Expedition</h3>
            <p>
              Push farther into the unknown. Respond to unexpected
              events and keep your outpost functioning on the Red Planet.
            </p>

            <div className="mission-challenges">
              <span>01 / RESOURCES</span>
              <span>02 / SYSTEMS</span>
              <span>03 / RESILIENCE</span>
            </div>

            <button
              className="planet-launch"
              type="button"
              onClick={() => navigate("/missions")}
            >
              <span>Explore mission</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </article>
      </div>

      <div className="showcase-footer">
        <span>MISSION SUCCESS IS NEVER GUARANTEED.</span>
        <span>PLAN SMART. ADAPT FAST. SURVIVE.</span>
      </div>
    </section>
  );
}

export default MissionOverview;
