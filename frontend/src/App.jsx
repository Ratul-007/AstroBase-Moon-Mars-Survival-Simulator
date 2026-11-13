import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { lazy, Suspense } from "react";
import "./App.css";

import SpaceBackground from "./components/SpaceBackground";

import Home from "./pages/Home";
import { AudioManager } from "./components/AudioManager";
import {
  loadLaunchGate,
  loadLiveProof,
  loadMissionBriefing,
  loadMissionCertificatePage,
  loadMissionSelect,
  loadMissionSetup,
} from "./routeLoaders";

const MissionSelect = lazy(loadMissionSelect);
const MissionBriefing = lazy(loadMissionBriefing);
const MissionSetup = lazy(loadMissionSetup);
const LaunchGate = lazy(loadLaunchGate);
const LiveProof = lazy(loadLiveProof);
const MissionCertificatePage = lazy(loadMissionCertificatePage);

// Routes where the space background is hidden (launch + 3D gameplay)
const NO_SPACE_BG = ["/mission"];

function AppRoutes() {
  const { pathname } = useLocation();
  const showSpaceBg = !NO_SPACE_BG.includes(pathname);

  return (
    <>
      {showSpaceBg && <SpaceBackground fixed />}

      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/missions" element={<MissionSelect />} />
          <Route path="/mission-briefing" element={<MissionBriefing />} />
          <Route path="/mission/moon" element={<MissionSetup />} />
          <Route path="/mission/mars" element={<MissionSetup />} />
          {/* LaunchGate plays the launch, then mounts MissionExperience */}
          <Route path="/mission" element={<LaunchGate />} />
          <Route path="/live-proof" element={<LiveProof />} />
          <Route
            path="/mission-certificate"
            element={<MissionCertificatePage />}
          />
        </Routes>
      </Suspense>
    </>
  );
}

function RouteLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#070d1a",
        color: "#cbd5e1",
        fontFamily: "var(--font-body)",
      }}
    >
      Loading mission interface…
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AudioManager>
        <AppRoutes />
      </AudioManager>
    </BrowserRouter>
  );
}

export default App;