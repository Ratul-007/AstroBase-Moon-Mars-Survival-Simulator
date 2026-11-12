
import "./SurvivalHud.css";

const MESSAGES = {
  safe: null,
  danger:
    "WARNING: You left the safe zone. Return to the outpost before your oxygen runs out.",
  critical:
    "CRITICAL: Suit oxygen depleted. Health is dropping. Return to the safe zone immediately!",
  failed:
    "MISSION FAILED: The astronaut did not make it back.",
};

function Meter({ label, value, tone }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="sz-meter">
      <div className="sz-meter-head">
        <span>{label}</span>
        <span className="sz-num">{pct}%</span>
      </div>

      <div
        className="sz-track"
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`sz-fill sz-${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SurvivalHud({
  oxygen = 100,
  health = 100,
  status = "safe",
  distToEdge = 0,
}) {
  const message = MESSAGES[status];

  const o2Tone =
    oxygen < 25 ? "bad" : oxygen < 50 ? "warn" : "oxygen";

  const hpTone =
    health < 25 ? "bad" : health < 50 ? "warn" : "health";

  return (
    <div className={`sz-hud sz-status-${status}`}>
      {status !== "safe" && (
        <div className="sz-vignette" aria-hidden="true" />
      )}

      {/* Fixed top-right: suit oxygen and health */}
      <section
        className="sz-panel"
        aria-label="Astronaut suit status"
      >
        <div className="sz-panel-title">
          <span className="sz-live-dot" />
          SUIT STATUS
        </div>

        <Meter
          label="Suit oxygen"
          value={oxygen}
          tone={o2Tone}
        />

        <Meter
          label="Health"
          value={health}
          tone={hpTone}
        />
      </section>

      {/* Fixed top-center: safe-zone warning */}
      {message && (
        <div
          className={`sz-alert sz-alert-${status}`}
          role="alert"
          aria-live="assertive"
        >
          <span className="sz-alert-icon" aria-hidden="true">
            {status === "critical" || status === "failed" ? "⚠" : "!"}
          </span>

          <div className="sz-alert-content">
            <strong>
              {status === "danger"
                ? "SAFE ZONE WARNING"
                : status === "critical"
                  ? "OXYGEN CRITICAL"
                  : "MISSION FAILED"}
            </strong>

            <span>{message}</span>

            {status === "danger" && distToEdge > 0 && (
              <span className="sz-distance">
                {Math.ceil(distToEdge)} m outside safe zone
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
