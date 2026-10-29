
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import MissionCertificate from "../components/MissionCertificate";

function MissionCertificatePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const certificate = location.state?.certificate;

  if (!certificate?.playerName || !certificate?.missionName) {
    return <Navigate to="/missions" replace />;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        boxSizing: "border-box",
        padding: "32px 16px 48px",
        background: "#070d1a",
        color: "#eef4ff",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto" }}>
        <button
          type="button"
          onClick={() => navigate("/missions")}
          style={{
            marginBottom: 24,
            padding: "10px 16px",
            border: "1px solid #64748b",
            borderRadius: 8,
            background: "transparent",
            color: "#eef4ff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          ← Back to Missions
        </button>

        <div
          style={{
            width: "100%",
            overflowX: "auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <MissionCertificate
            playerName={certificate.playerName}
            missionName={certificate.missionName}
            days={certificate.days}
            stats={certificate.stats}
          />
        </div>
      </div>
    </main>
  );
}

export default MissionCertificatePage;
