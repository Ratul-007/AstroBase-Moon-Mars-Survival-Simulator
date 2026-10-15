import { useNavigate } from "react-router-dom";

function MissionSelect() {
  const navigate = useNavigate();

  return (
    <section className="mission-select">
      <div className="mission-heading">
        <p className="section-eyebrow">MISSION CONTROL</p>

        <h1>Choose Your Mission</h1>

        <p>
          Select an environment and begin your journey beyond Earth.
        </p>
      </div>

      <div className="mission-options">

        <div className="mission-card">
          <div className="mission-icon">🌕</div>

          <div className="mission-info">
            <span className="mission-type">LUNAR MISSION</span>

            <h2>Moon Outpost</h2>

            <p>
              Establish and manage a lunar outpost while balancing
              essential resources and responding to mission events.
            </p>
          </div>

          <button
            className="mission-btn"
            onClick={() => navigate("/mission/moon")}
          >
            Select Moon
          </button>
        </div>


        <div className="mission-card">
          <div className="mission-icon">🔴</div>

          <div className="mission-info">
            <span className="mission-type">MARS MISSION</span>

            <h2>Mars Outpost</h2>

            <p>
              Manage a remote Mars outpost where limited resources
              and unexpected challenges test your decisions.
            </p>
          </div>

          <button
            className="mission-btn"
            onClick={() => navigate("/mission/mars")}
          >
            Select Mars
          </button>
        </div>

      </div>
    </section>
  );
}

export default MissionSelect;