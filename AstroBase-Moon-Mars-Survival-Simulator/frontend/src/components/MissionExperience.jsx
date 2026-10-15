import { useLocation } from "react-router-dom";
import MissionScene from "./3d/MissionScene";
import MissionDashboard from "./MissionDashboard";

function MissionExperience() {
  const location = useLocation();
  const planet = location.state?.planet === "mars" ? "mars" : "moon";

  console.log("MISSION EXPERIENCE RENDERED:", planet);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#070d1a",
        color: "#eef4ff",
        paddingBottom: "24px",
      }}
    >
      {/* DEBUG: This block must be visible above the dashboard */}
      <section
        style={{
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "16px",
        }}
      >
        <div
          style={{
            padding: "12px",
            marginBottom: "12px",
            background: "#163c30",
            border: "2px solid #86efac",
            borderRadius: "8px",
          }}
        >
          DEBUG CHECK: MissionExperience is rendering. Planet: {planet}
        </div>

        <div
          style={{
            width: "100%",
            height: "480px",
            position: "relative",
            overflow: "hidden",
            border: "2px solid #7dd3fc",
            borderRadius: "12px",
            background: "#101d36",
          }}
        >
          <MissionScene planet={planet} />
        </div>
      </section>

      {/* Preserve existing gameplay */}
      <MissionDashboard />
    </main>
  );
}

export default MissionExperience;