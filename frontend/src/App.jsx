import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import "./App.css";

import SpaceBackground from "./components/SpaceBackground";

import Home from "./pages/Home";
import MissionSelect from "./components/MissionSelect";
import MissionSetup from "./components/MissionSetup";
import MissionExperience from "./components/MissionExperience";
import MissionBriefing from "./pages/MissionBriefing";
import MissionCertificatePage from "./pages/MissionCertificatePage";
import LiveProof from "./pages/LiveProof";

// Routes where the space background is hidden (3D gameplay)
const NO_SPACE_BG = ["/mission"];

function AppRoutes() {
  const { pathname } = useLocation();
  const showSpaceBg = !NO_SPACE_BG.includes(pathname);

  return (
    <>
      {showSpaceBg && <SpaceBackground fixed />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/missions" element={<MissionSelect />} />
        <Route path="/mission-briefing" element={<MissionBriefing />} />
        <Route path="/mission/moon" element={<MissionSetup />} />
        <Route path="/mission/mars" element={<MissionSetup />} />
        <Route path="/mission" element={<MissionExperience />} />
        <Route path="/live-proof" element={<LiveProof />} />
        <Route
          path="/mission-certificate"
          element={<MissionCertificatePage />}
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;