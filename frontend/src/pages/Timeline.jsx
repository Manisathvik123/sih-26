import { useEffect, useState } from "react";
import { getTimeline } from "../api.js";

export default function Timeline({ personnelId }) {
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
  if (!timeline.length) return <div className="empty">No check-ins recorded for this personnel yet.</div>;

  const rows = [...timeline].reverse();

  return (
    <div className="page timeline">
      <h2>Timeline</h2>
      <div className="timeline-list">
        {rows.map((a) => (
          <div className="timeline-item card" key={a.id}>
            <div className="timeline-head">
              <span className={`level level-${a.risk_level.toLowerCase()}`}>{a.risk_level}</span>
              <span className="score">{a.risk_score}</span>
              <span className="date">{new Date(a.created_at).toLocaleString()}</span>
            </div>
            <p className="muted">
              {a.wellness_checkins?.note || "No note provided."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}