import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

import Home from "./pages/Home";
import MissionSelect from "./components/MissionSelect";
import MissionSetup from "./components/MissionSetup";
import MissionDashboard from "./components/MissionDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/missions"
          element={<MissionSelect />}
        />

        <Route
          path="/mission/moon"
          element={<MissionSetup />}
        />

        <Route
          path="/mission/mars"
          element={<MissionSetup />}
        />

        <Route
          path="/mission"
          element={<MissionDashboard />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;