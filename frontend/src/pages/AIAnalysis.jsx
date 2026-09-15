import { useEffect, useState } from "react";
import { getTimeline } from "../api.js";
import RiskLevelBadge from "../components/RiskLevelBadge.jsx";
import FactorBreakdown from "../components/FactorBreakdown.jsx";

export default function AIAnalysis({ personnelId }) {
  const [latest, setLatest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await getTimeline(personnelId);
      if (error) setError(error);
      setLatest(data.length ? data[data.length - 1] : null);
    })();
  }, [personnelId]);

  if (error) return <div className="error-banner">{error}</div>;
  if (!latest) return <div className="empty">No analysis for this personnel yet.</div>;

  const explanation = latest.ai_explanation;

  return (
    <div className="page analysis">
      <h2>AI Analysis</h2>

      <div className="card">
        <div className="section-label">Risk Assessment <em>(calculated)</em></div>
        <div className="card-grid">
          <div>
            <RiskLevelBadge level={latest.risk_level} score={latest.risk_score} />
          </div>
          <div>
            <FactorBreakdown breakdown={latest.factor_breakdown} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-label">AI Explanation <em>(generated)</em></div>
        <p>{explanation?.summary || "No explanation available."}</p>
        <ul>
          {explanation?.explanations?.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}