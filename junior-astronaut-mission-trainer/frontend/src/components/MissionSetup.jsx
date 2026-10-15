import { useLocation, useNavigate } from "react-router-dom";

function MissionSetup() {
  const location = useLocation();
  const navigate = useNavigate();

  const isMars = location.pathname.includes("mars");

  const mission = {
    name: isMars ? "Mars Outpost" : "Moon Outpost",
    type: isMars ? "MARS MISSION" : "LUNAR MISSION",
    icon: isMars ? "🔴" : "🌕",
    duration: isMars ? "30 Mission Days" : "20 Mission Days",
    objective: isMars
      ? "Maintain a sustainable Mars outpost while managing limited resources and unexpected mission challenges."
      : "Establish a stable lunar outpost while balancing essential resources and responding to mission events.",
  };

  return (
    <section className="mission-setup">
      <div className="setup-container">

        <div className="setup-header">
          <span className="mission-type">
            {mission.type}
          </span>

          <div className="setup-icon">
            {mission.icon}
          </div>

          <h1>{mission.name}</h1>

          <p>
            Prepare your mission before entering the outpost.
          </p>
        </div>


        <div className="setup-card">

          <div className="setup-item">
            <span>MISSION OBJECTIVE</span>

            <p>
              {mission.objective}
            </p>
          </div>


          <div className="setup-item">
            <span>MISSION DURATION</span>

            <strong>
              {mission.duration}
            </strong>
          </div>


          <div className="setup-item">
            <span>MISSION RESOURCES</span>

            <div className="starting-resources">

              <div>
                <strong>⚡ 100</strong>
                <span>Power</span>
              </div>

              <div>
                <strong>💧 100</strong>
                <span>Water</span>
              </div>

              <div>
                <strong>🍎 100</strong>
                <span>Food</span>
              </div>

              <div>
                <strong>🫁 100</strong>
                <span>Life Support</span>
              </div>

              <div>
                <strong>☢️ 100</strong>
                <span>Radiation Shield</span>
              </div>

            </div>
          </div>


          <button
            className="begin-mission-btn"
            onClick={() =>
              navigate("/mission", {
                state: {
                  planet: isMars ? "mars" : "moon",
                },
              })
            }
          >
            Begin Mission 🚀
          </button>

        </div>


        <button
          className="back-btn"
          onClick={() => navigate("/missions")}
        >
          ← Back to Mission Selection
        </button>

      </div>
    </section>
  );
}

export default MissionSetup;