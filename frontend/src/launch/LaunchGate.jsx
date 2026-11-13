import { useCallback, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import MissionExperience from "../components/MissionExperience";
import LaunchSequence from "./LaunchSequence";

/**
 * Sits on the existing /mission route.
 *
 * The mission scene stays mounted and renders behind the launch overlay so
 * completion only needs to reveal an already-prepared Canvas.
 *
 * MissionExperience still reads location.state.planet itself, so nothing
 * about the route or the state structure changes.
 */
export default function LaunchGate() {
  const location = useLocation();
  const planet = location.state?.planet === "mars" ? "mars" : "moon";
  const [transitionRequested, setTransitionRequested] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const transitionRequestedRef = useRef(false);
  const handleComplete = useCallback(() => {
    if (transitionRequestedRef.current) return;
    transitionRequestedRef.current = true;
    setTransitionRequested(true);
  }, []);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);
  const gameplayActive = transitionRequested && sceneReady;

  return (
    <>
      <MissionExperience
        active={gameplayActive}
        onSceneReady={handleSceneReady}
      />
      {!gameplayActive && (
        <LaunchSequence planet={planet} onComplete={handleComplete} />
      )}
    </>
  );
}