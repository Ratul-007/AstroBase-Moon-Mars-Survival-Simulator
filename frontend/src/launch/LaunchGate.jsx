import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";

import MissionExperience from "../components/MissionExperience";
import LaunchSequence from "./LaunchSequence";

/**
 * Keep the launch and gameplay WebGL canvases from initializing together.
 * On slower first loads, two simultaneous renderers can compete for GPU and
 * shader initialization, leaving the launch scene black until a later visit.
 */
export default function LaunchGate() {
  const location = useLocation();
  const planet = location.state?.planet === "mars" ? "mars" : "moon";
  const [launchFinished, setLaunchFinished] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  const handleComplete = useCallback(() => {
    setLaunchFinished(true);
  }, []);

  const handleSceneReady = useCallback(() => {
    setSceneReady(true);
  }, []);

  if (!launchFinished) {
    return <LaunchSequence planet={planet} onComplete={handleComplete} />;
  }

  return (
    <>
      <MissionExperience
        active
        onSceneReady={handleSceneReady}
      />
      {!sceneReady && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            background: "#070d1a",
            color: "#eef4ff",
            fontFamily: "var(--font-body)",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "0.08em",
          }}
        >
          PREPARING MISSION...
        </div>
      )}
    </>
  );
}