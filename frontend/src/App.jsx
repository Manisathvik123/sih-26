import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { getPersonnel } from "./api.js";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CheckIn from "./pages/CheckIn.jsx";
import AIAnalysis from "./pages/AIAnalysis.jsx";
import Recommendations from "./pages/Recommendations.jsx";
import Timeline from "./pages/Timeline.jsx";

// Route order is used only to determine slide direction (forward vs. back).
const ROUTE_ORDER = ["/", "/checkin", "/analysis", "/recommendations", "/timeline"];

function orderIndex(pathname) {
  const i = ROUTE_ORDER.findIndex((p) => p === pathname);
  return i === -1 ? 0 : i;
}

function AnimatedRoutes({ selectedId }) {
  const location = useLocation();
  const prev = useRef(orderIndex(location.pathname));
  const next = orderIndex(location.pathname);
  const direction = next >= prev.current ? "slide-forward" : "slide-back";

  useEffect(() => {
    prev.current = next;
  }, [next]);

  return (
    <div key={location.pathname} className={`route-stage ${direction}`}>
      <Routes location={location}>
        <Route path="/" element={<Dashboard personnelId={selectedId} />} />
        <Route path="/checkin" element={<CheckIn personnelId={selectedId} />} />
        <Route path="/analysis" element={<AIAnalysis personnelId={selectedId} />} />
        <Route path="/recommendations" element={<Recommendations personnelId={selectedId} />} />
        <Route path="/timeline" element={<Timeline personnelId={selectedId} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const [personnel, setPersonnel] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await getPersonnel();
      if (error) setLoadError(error);
      setPersonnel(data);
      if (data.length) setSelectedId(data[0].id);
    })();
  }, []);

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar personnel={personnel} selectedId={selectedId} onChange={setSelectedId} />
        <main className="main">
          <div className="main-scroll">
            {loadError && <div className="error-banner">{loadError}</div>}
            {!selectedId && !loadError && (
              <div className="empty">No personnel records loaded. Seed the personnel table to begin.</div>
            )}
            {selectedId && <AnimatedRoutes selectedId={selectedId} />}
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}