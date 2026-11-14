import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import MissionExperience from "../components/MissionExperience";
import LaunchSequence from "./LaunchSequence";

const TRANSITION_MS = 700;

/**
 * Keep the launch and gameplay WebGL canvases from initializing together.
 * The mission scene is mounted after launch, then revealed with a short
 * branded transition as soon as its first frame is ready.
 */
export default function LaunchGate() {
  const location = useLocation();
  const planet = location.state?.planet === "mars" ? "mars" : "moon";
  const [launchFinished, setLaunchFinished] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [showPreparing, setShowPreparing] = useState(true);

  const handleComplete = useCallback(() => {
    setLaunchFinished(true);
  }, []);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  useEffect(() => {
    if (!sceneReady) return undefined;

    const timer = window.setTimeout(() => {
      setShowPreparing(false);
    }, TRANSITION_MS);

    return () => window.clearTimeout(timer);
  }, [sceneReady]);

  if (!launchFinished) {
    return <LaunchSequence planet={planet} onComplete={handleComplete} />;
  }

  return (
    <>
      <MissionExperience
        active
        onSceneReady={handleSceneReady}
      />

      {showPreparing && (
        <>
          <style>{`
            @keyframes mission-orbit-spin {
              to { transform: rotate(360deg); }
            }
            @keyframes mission-pulse {
              0%, 100% { opacity: .45; transform: scale(.96); }
              50% { opacity: 1; transform: scale(1.04); }
            }
            @keyframes mission-scan {
              from { transform: translateX(-110%); }
              to { transform: translateX(220%); }
            }
          `}</style>

          <div
            role="status"
            aria-live="polite"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
              background:
                "radial-gradient(ellipse at 50% 42%, rgba(25, 75, 112, .72) 0%, rgba(8, 24, 45, .96) 48%, #030914 100%)",
              color: "#eef6ff",
              fontFamily: "var(--font-body)",
              opacity: sceneReady ? 0 : 1,
              transition: `opacity ${TRANSITION_MS}ms ease-in-out`,
              pointerEvents: sceneReady ? "none" : "auto",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.42,
                backgroundImage:
                  "radial-gradient(#b8dcff 1px, transparent 1px), radial-gradient(#7dd3fc 1px, transparent 1px)",
                backgroundSize: "58px 58px, 91px 91px",
                backgroundPosition: "0 0, 27px 34px",
                maskImage: "linear-gradient(to bottom, black, transparent 88%)",
              }}
            />

            <div
              style={{
                position: "relative",
                width: "min(420px, calc(100vw - 40px))",
                padding: "34px 28px 30px",
                textAlign: "center",
                border: "1px solid rgba(125, 211, 252, .28)",
                borderRadius: 18,
                background: "rgba(5, 18, 35, .58)",
                boxShadow: "0 20px 80px rgba(0, 0, 0, .32), inset 0 0 36px rgba(56, 189, 248, .06)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "relative",
                  width: 76,
                  height: 76,
                  margin: "0 auto 22px",
                  border: "1px solid rgba(125, 211, 252, .22)",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  animation: "mission-pulse 2.2s ease-in-out infinite",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 5,
                    border: "2px solid transparent",
                    borderTopColor: "#7dd3fc",
                    borderRightColor: "rgba(125, 211, 252, .35)",
                    borderRadius: "50%",
                    animation: "mission-orbit-spin 1.4s linear infinite",
                  }}
                />
                <span style={{ fontSize: 27, filter: "drop-shadow(0 0 12px rgba(125,211,252,.55))" }}>
                  {planet === "mars" ? "♂" : "☾"}
                </span>
              </div>

              <p
                style={{
                  margin: "0 0 9px",
                  color: "#7dd3fc",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: ".22em",
                }}
              >
                ASTROBASE // {planet === "mars" ? "MARS" : "LUNAR"} OUTPOST
              </p>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(19px, 4vw, 25px)",
                  letterSpacing: ".04em",
                  fontWeight: 700,
                }}
              >
                Preparing Mission
              </h2>
              <p
                style={{
                  margin: "10px 0 23px",
                  color: "#b8c9dc",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Establishing your outpost and checking life-support systems...
              </p>

              <div
                aria-hidden="true"
                style={{
                  height: 3,
                  overflow: "hidden",
                  borderRadius: 10,
                  background: "rgba(186, 230, 253, .14)",
                }}
              >
                <div
                  style={{
                    width: "42%",
                    height: "100%",
                    borderRadius: 10,
                    background: "linear-gradient(90deg, #38bdf8, #c4f1ff)",
                    boxShadow: "0 0 14px rgba(56, 189, 248, .75)",
                    animation: "mission-scan 1.7s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
