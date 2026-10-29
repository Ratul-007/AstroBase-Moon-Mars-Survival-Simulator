
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { flushSync } from "react-dom";

import MissionScene from "./3d/MissionScene";
import MissionDashboard from "./MissionDashboard";
import NovaButton from "./nova/NovaButton";
import NovaPanel from "./nova/NovaPanel";

import {
  MissionSessionProvider,
  useMissionSession,
} from "./MissionSessionContext";

import { useSurvivalZone } from "../survival/useSurvivalZone";
import SurvivalHud from "../survival/SurvivalHud";

function MissionExperienceContent({ planet }) {
  const navigate = useNavigate();

  const {
    mission,
    taskStepIndex,
    failMission,
    restartMission,
    sessionVersion,
    handlePhysicalInteraction,
  } = useMissionSession();

  const [novaOpen, setNovaOpen] = useState(false);
  const [failReason, setFailReason] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileDashboardOpen, setMobileDashboardOpen] =
    useState(false);
  const [cameraMode, setCameraMode] = useState("follow");

  const playerPosRef = useRef({ x: 0, z: 3 });
  const abortingRef = useRef(false);

  const worldConfig = useMemo(
    () => ({
      worldRadius: 120,
      safeZoneRadius: 24,
      safeZoneCenter: { x: 0, z: 0 },
    }),
    []
  );

  const isMissionOver =
    mission.missionStatus === "success" ||
    mission.missionStatus === "failed";

  const showGameplay = !isMissionOver && !failReason;

  const handleMissionFail = useCallback(
    (reason) => {
      if (mission.missionStatus !== "active" || failReason) {
        return;
      }

      setFailReason(reason);
      setMobileDashboardOpen(false);
      setNovaOpen(false);
      setToast(null);
      failMission(reason);
    },
    [failMission, mission.missionStatus, failReason]
  );

  const survival = useSurvivalZone(
    () => playerPosRef.current,
    {
      center: worldConfig.safeZoneCenter,
      radius: worldConfig.safeZoneRadius,
      graceSeconds: 2,
      oxygenDrainOutside: 4,
      oxygenRefillInside: 8,
      healthDrainNoOxygen: 6,
      healthRegenInside: 1,
      onFail: handleMissionFail,
    }
  );

  const currentTask = mission.currentEvent?.task ?? null;

  const taskInfo = useMemo(() => {
    if (
      !currentTask ||
      failReason ||
      mission.missionStatus !== "active"
    ) {
      return null;
    }

    const step = currentTask.steps[taskStepIndex] ?? null;

    if (!step) return null;

    return {
      step,
      index: taskStepIndex,
      count: currentTask.steps.length,
      title: currentTask.title,
    };
  }, [
    currentTask,
    taskStepIndex,
    failReason,
    mission.missionStatus,
  ]);

  const handleWorldInteraction = useCallback(
    (interactionType, target) => {
      if (
        failReason ||
        mission.missionStatus !== "active"
      ) {
        return;
      }

      if (typeof handlePhysicalInteraction !== "function") {
        console.error(
          "Physical interaction handler is unavailable in MissionSessionContext."
        );
        return;
      }

      const result = handlePhysicalInteraction(
        interactionType,
        target
      );

      if (result?.message) {
        setToast({
          id: Date.now(),
          ok: Boolean(result.success),
          text: result.message,
        });
      }
    },
    [
      failReason,
      mission.missionStatus,
      handlePhysicalInteraction,
    ]
  );

  useEffect(() => {
    if (!toast) return undefined;

    const timer = setTimeout(() => setToast(null), 4200);

    return () => clearTimeout(timer);
  }, [toast]);

  const handleRetry = useCallback(() => {
    setFailReason(null);
    setNovaOpen(false);
    setMobileDashboardOpen(false);
    setToast(null);

    restartMission();
    survival.reset();

    playerPosRef.current = { x: 0, z: 3 };
  }, [restartMission, survival.reset]);

  const toggleMobileDashboard = useCallback(() => {
    setMobileDashboardOpen((previous) => !previous);
    setNovaOpen(false);
  }, []);

  const handleAbortMission = useCallback(() => {
    if (abortingRef.current) return;

    abortingRef.current = true;
    setNovaOpen(false);
    setMobileDashboardOpen(false);
    setToast(null);
    flushSync(() => {
      navigate("/missions", { replace: true });
    });
  }, [navigate]);

  const dashboardIsFullScreen = !showGameplay && !failReason;

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        minHeight: "100dvh",
        overflow: dashboardIsFullScreen ? "auto" : "hidden",
        background: "#070d1a",
        color: "#eef4ff",
        fontFamily: "Arial, sans-serif",
        isolation: "isolate",
      }}
    >
      {showGameplay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            background: "#070d1a",
            zIndex: 0,
          }}
        >
          <MissionScene
            key={`${planet}-${sessionVersion}`}
            planet={planet}
            playerPosRef={playerPosRef}
            survivalRef={survival.simRef}
            worldConfig={worldConfig}
            onPhysicalInteraction={handleWorldInteraction}
            taskInfo={taskInfo}
            cameraMode={cameraMode}
          />
        </div>
      )}

      {showGameplay && toast && (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            zIndex: 35,
            left: "50%",
            bottom: 245,
            transform: "translateX(-50%)",
            width: "max-content",
            maxWidth: "calc(100% - 24px)",
            boxSizing: "border-box",
            padding: "10px 16px",
            borderRadius: 11,
            border: `1px solid ${
              toast.ok
                ? "rgba(74, 222, 128, 0.7)"
                : "rgba(251, 191, 36, 0.7)"
            }`,
            background: "rgba(5, 12, 25, 0.95)",
            color: toast.ok ? "#bbf7d0" : "#fde68a",
            fontSize: 13,
            fontWeight: 700,
            textAlign: "center",
            pointerEvents: "none",
            boxShadow: "0 8px 28px rgba(0, 0, 0, 0.4)",
          }}
        >
          {toast.text}
        </div>
      )}

      {showGameplay && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <SurvivalHud
            oxygen={survival.oxygen}
            health={survival.health}
            status={survival.status}
            distToEdge={survival.distToEdge}
          />
        </div>
      )}

      {!failReason && (
        <aside
          id="mission-dashboard-panel"
          aria-label="Mission dashboard"
          className={
            showGameplay && mobileDashboardOpen
              ? "mission-dashboard-overlay mobile-dashboard-open"
              : "mission-dashboard-overlay"
          }
          style={
            dashboardIsFullScreen
              ? {
                  position: "fixed",
                  inset: 0,
                  display: "block",
                  visibility: "visible",
                  opacity: 1,
                  width: "100%",
                  height: "100%",
                  minHeight: "100dvh",
                  overflowY: "auto",
                  overflowX: "hidden",
                  boxSizing: "border-box",
                  zIndex: 100,
                  // The mobile dashboard is normally moved off-screen with
                  // translateX(105%). Once a mission ends it becomes the
                  // complete screen, so explicitly clear that mobile rule.
                  transform: "none",
                  background: "#070d1a",
                  color: "#eef4ff",
                  pointerEvents: "auto",
                  isolation: "isolate",
                }
              : undefined
          }
        >
          <MissionDashboard onAbortMission={handleAbortMission} />
        </aside>
      )}

      {showGameplay && (
        <button
          type="button"
          className="mobile-mission-toggle"
          onClick={toggleMobileDashboard}
          aria-expanded={mobileDashboardOpen}
          aria-controls="mission-dashboard-panel"
        >
          <span aria-hidden="true">
            {mobileDashboardOpen ? "✕" : "☰"}
          </span>
          <span>
            {mobileDashboardOpen ? "Close Mission" : "Mission"}
          </span>
        </button>
      )}

      {showGameplay && !mobileDashboardOpen && (
        <button
          type="button"
          onClick={() => {
            setCameraMode((current) =>
              current === "follow" ? "orbit" : "follow"
            );
            setNovaOpen(false);
          }}
          aria-pressed={cameraMode === "orbit"}
          title={
            cameraMode === "orbit"
              ? "Return to the follow camera"
              : "Drag inside the game view to rotate the camera"
          }
          style={{
            position: "absolute",
            zIndex: 30,
            left: 16,
            bottom: 16,
            padding: "10px 14px",
            border: "1px solid rgba(125, 211, 252, 0.7)",
            borderRadius: 9,
            background: "rgba(5, 12, 25, 0.92)",
            color: "#e0f2fe",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {cameraMode === "orbit"
            ? "Exit free camera"
            : "Free camera"}
        </button>
      )}

      {showGameplay && (
        <div
          style={{
            position: "absolute",
            zIndex: 30,
            right: 16,
            bottom: 14,
          }}
        >
          <NovaButton
            onClick={() => {
              setNovaOpen((previous) => !previous);
              setMobileDashboardOpen(false);
            }}
          />
        </div>
      )}

      {showGameplay && novaOpen && (
        <div
          style={{
            position: "absolute",
            zIndex: 29,
            right: 16,
            bottom: 78,
            width: "min(360px, calc(100vw - 32px))",
            maxHeight: "min(520px, calc(100dvh - 110px))",
            overflowY: "auto",
          }}
        >
          <NovaPanel
            planet={planet}
            survivalState={{
              oxygen: survival.oxygen,
              health: survival.health,
              radius: survival.radius,
              inZone: survival.inZone,
              failed: survival.failed,
              distToEdge: survival.distToEdge,
              status: survival.status,
            }}
            onClose={() => setNovaOpen(false)}
          />
        </div>
      )}

      {failReason && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Mission failed"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "grid",
            placeItems: "center",
            padding: 20,
            boxSizing: "border-box",
            background: "rgba(3, 7, 18, 0.96)",
            backdropFilter: "blur(8px)",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              boxSizing: "border-box",
              textAlign: "center",
              padding: 28,
              border: "1px solid #ef4444",
              borderRadius: 16,
              background: "#101d36",
              boxShadow: "0 20px 70px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div
              style={{
                color: "#f87171",
                fontSize: 12,
                letterSpacing: 3,
                marginBottom: 10,
              }}
            >
              ASTROBASE // EMERGENCY
            </div>

            <h2
              style={{
                margin: "0 0 12px",
                color: "#f87171",
                fontSize: 28,
              }}
            >
              Mission Failed
            </h2>

            <p
              style={{
                margin: "0 0 24px",
                color: "#cbd5e1",
                lineHeight: 1.6,
              }}
            >
              {failReason}
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={handleRetry}
                style={{
                  padding: "11px 18px",
                  border: "none",
                  borderRadius: 8,
                  background: "#38bdf8",
                  color: "#07111f",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Retry Mission
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  padding: "11px 18px",
                  border: "1px solid #64748b",
                  borderRadius: 8,
                  background: "transparent",
                  color: "#eef4ff",
                  cursor: "pointer",
                }}
              >
                Leave Mission
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MissionExperience() {
  const location = useLocation();

  const planet =
    location.state?.planet === "mars" ? "mars" : "moon";

  return (
    <MissionSessionProvider planet={planet}>
      <MissionExperienceContent planet={planet} />
    </MissionSessionProvider>
  );
}

export default MissionExperience;
