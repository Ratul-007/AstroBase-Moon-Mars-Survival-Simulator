import { Component, useCallback, useEffect, useRef, useState } from "react";

import LaunchScene from "./LaunchScene";
import { PHASE_BY_KEY, PLANETS } from "./launchConfig";
import "./launch.css";
import { useAudioManager } from "../components/AudioManager";

// If anything in the 3D scene crashes, never trap the player: go to the game.
class LaunchErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.warn("Launch sequence failed, skipping to the mission.", error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function LaunchSequence({ planet = "moon", onComplete }) {
  const cfg = PLANETS[planet] ?? PLANETS.moon;
  const {
    playSfx,
    setLaunchActive,
    speakAnnouncement,
    stopSfx,
  } = useAudioManager();

  const [hud, setHud] = useState({ phase: "countdown", big: "T-4" });
  const doneRef = useRef(false);
  const readyRef = useRef(false);
  const fadeRef = useRef(null);
  const barRef = useRef(null);
  const lastPhaseRef = useRef(null);
  const landedRef = useRef(false);
  const landingSoundPlayedRef = useRef(false);

  useEffect(() => {
    setLaunchActive(true);
    speakAnnouncement("Rocket ready for takeoff.");

    return () => {
      setLaunchActive(false);
      stopSfx("flight");
      stopSfx("ignition");
    };
  }, [setLaunchActive, speakAnnouncement, stopSfx]);

  useEffect(() => {
    if (hud.phase === lastPhaseRef.current) return;
    lastPhaseRef.current = hud.phase;

    if (hud.phase === "ignition") {
      playSfx("ignition", { cooldown: 1000, volumeScale: 1.15, loop: true });
    } else if (hud.phase === "travel") {
      stopSfx("ignition");
      playSfx("flight", { cooldown: 1000, volumeScale: 0.9, loop: true });
    } else if (hud.phase === "landing") {
      landedRef.current = true;
      stopSfx("flight");
      if (!landingSoundPlayedRef.current) {
        landingSoundPlayedRef.current = true;
        playSfx("ignition", { cooldown: 1000, volumeScale: 1.15 });
      }
    }
  }, [hud.phase, playSfx, stopSfx]);

  // One exit for everything (end of show, skip button, key, crash, timeout).
  // The guard guarantees onComplete runs once, so the mission starts once.
  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    stopSfx("flight");
    stopSfx("ignition");
    if (landedRef.current) {
      speakAnnouncement("Landed successfully.");
    }
    onComplete?.();
  }, [onComplete, speakAnnouncement, stopSfx]);

  const markReady = useCallback(() => {
    readyRef.current = true;
  }, []);

  // Players who ask their device for less motion go straight to the mission.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      finish();
    }
  }, [finish]);

  // Failsafe: if the 3D scene never draws a frame, do not leave a black screen.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!readyRef.current) finish();
    }, 6000);
    return () => clearTimeout(timer);
  }, [finish]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  const phaseInfo = PHASE_BY_KEY[hud.phase] ?? PHASE_BY_KEY.countdown;

  return (
    <div className="launch-root" style={{ "--launch-accent": cfg.accent }}>
      <LaunchErrorBoundary onError={finish}>
        <LaunchScene
          cfg={cfg}
          onHud={setHud}
          onFinish={finish}
          onReady={markReady}
          fadeRef={fadeRef}
          barRef={barRef}
        />
      </LaunchErrorBoundary>

      <div className="launch-fade" ref={fadeRef} aria-hidden="true" />

      <header className="launch-top">
        <div>
          <p className="launch-eyebrow">ASTROBASE // MISSION LAUNCH</p>
          <p className="launch-destination">{cfg.outpost}</p>
        </div>

        <button type="button" className="launch-skip" onClick={finish}>
          Skip intro
          <span className="launch-key">Esc</span>
        </button>
      </header>

      <div className="launch-center" aria-live="polite">
        {hud.big && (
          <div key={hud.big} className="launch-big">
            {hud.big}
          </div>
        )}
      </div>

      <footer className="launch-bottom">
        <p className="launch-phase">{phaseInfo.label}</p>
        <p key={hud.phase} className="launch-caption">
          {cfg.captions[hud.phase]}
        </p>
        <div className="launch-bar" aria-hidden="true">
          <span ref={barRef} />
        </div>
      </footer>
    </div>
  );
}