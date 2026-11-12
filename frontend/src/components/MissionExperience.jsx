
import { useLocation } from "react-router-dom";
import MissionScene from "./3d/MissionScene";
import MissionDashboard from "./MissionDashboard";

function MissionExperience() {
  const location = useLocation();

  const planet =
    location.state?.planet === "mars" ? "mars" : "moon";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070d1a",
        paddingBottom: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "16px",
          boxSizing: "border-box",
        }}
      >
        <MissionScene planet={planet} />
      </div>

      <MissionDashboard />
    </main>
  );
}

export default MissionExperience;
