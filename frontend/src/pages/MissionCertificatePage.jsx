
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useMemo } from "react";
import MissionCertificate from "../components/MissionCertificate";

const CERTIFICATE_STORAGE_KEY = "astrobase:certificate:v1";
const CERTIFICATE_DAYS = {
  "Moon Outpost": 20,
  "Mars Outpost": 30,
};
const CERTIFICATE_RESOURCE_KEYS = [
  "power",
  "water",
  "food",
  "oxygen",
];

function isValidCertificate(value) {
  if (!value || typeof value !== "object") return false;
  if (
    typeof value.playerName !== "string" ||
    !value.playerName.trim() ||
    !(value.missionName in CERTIFICATE_DAYS) ||
    value.missionStatus !== "success"
  ) {
    return false;
  }

  const expectedDays = CERTIFICATE_DAYS[value.missionName];
  if (
    !Number.isInteger(value.days) ||
    value.days !== expectedDays ||
    !Number.isInteger(value.objectivesTotal) ||
    value.objectivesTotal < 1 ||
    !Number.isInteger(value.objectivesCompleted) ||
    value.objectivesCompleted !== value.objectivesTotal
  ) {
    return false;
  }

  if (!value.stats || typeof value.stats !== "object") {
    return false;
  }

  return (
    CERTIFICATE_RESOURCE_KEYS.every((key) => {
      const resource = Number(value.stats[key]);
      return Number.isFinite(resource) && resource >= 0;
    }) &&
    Number.isFinite(Number(value.stats.score)) &&
    Number(value.stats.score) > 0 &&
    Number(value.stats.daysSurvived) === expectedDays
  );
}

function readStoredCertificate() {
  try {
    const stored = window.sessionStorage.getItem(
      CERTIFICATE_STORAGE_KEY
    );
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return isValidCertificate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function MissionCertificatePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationCertificate = location.state?.certificate;
  const certificate = useMemo(
    () =>
      isValidCertificate(navigationCertificate)
        ? navigationCertificate
        : readStoredCertificate(),
    [navigationCertificate]
  );

  useEffect(() => {
    if (!isValidCertificate(navigationCertificate)) return;

    try {
      window.sessionStorage.setItem(
        CERTIFICATE_STORAGE_KEY,
        JSON.stringify(navigationCertificate)
      );
    } catch {
      // The certificate remains usable for the current route.
    }
  }, [navigationCertificate]);

  if (!certificate) {
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
        fontFamily: "var(--font-body)",
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
