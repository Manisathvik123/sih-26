import { useEffect, useState } from "react";
import { getTimeline } from "../api.js";
import RiskLevelBadge from "../components/RiskLevelBadge.jsx";
import RiskTrendChart from "../components/RiskTrendChart.jsx";
import FactorBreakdown from "../components/FactorBreakdown.jsx";

export default function Dashboard({ personnelId }) {
  const [timeline, setTimeline] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await getTimeline(personnelId);
      if (error) setError(error);
      setTimeline(data);
    })();
  }, [personnelId]);

  if (error) return <div className="error-banner">{error}</div>;

  const latest = timeline.length ? timeline[timeline.length - 1] : null;
  const explanation = latest?.ai_explanation;
  const recommendation = latest?.recommendations?.[0];

  return (
    <div className="page dashboard">
      <h2>Dashboard</h2>

      {!latest ? (
        <div className="empty">No check-ins for this personnel yet. Submit a wellness check-in to generate a risk assessment.</div>
      ) : (
        <>
          <div className="card-grid">
            <div className="card">
              <h3>Current Risk</h3>
              <RiskLevelBadge level={latest.risk_level} score={latest.risk_score} />
              <p className="muted">Latest assessment</p>
            </div>
            <div className="card">
              <h3>Risk Trend</h3>
              <RiskTrendChart analyses={timeline} />
            </div>
          </div>

          <div className="card-grid">
            <div className="card">
              <h3>Factor Breakdown</h3>
              <FactorBreakdown breakdown={latest.factor_breakdown} />
            </div>
            <div className="card">
              <h3>Explanation Summary</h3>
              <p>{explanation?.summary || "No explanation available."}</p>
              <h3>Recommendation Summary</h3>
              <p className="muted">
                {recommendation ? (
                  <>
                    <strong>{recommendation.priority}</strong> — {recommendation.summary}
                  </>
                ) : (
                  "No recommendation available."
                )}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}