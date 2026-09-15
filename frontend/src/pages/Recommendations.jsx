import { useEffect, useState } from "react";
import { getTimeline } from "../api.js";

export default function Recommendations({ personnelId }) {
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
  if (!latest) return <div className="empty">No recommendation for this personnel yet.</div>;

  const rec = latest.recommendations?.[0];

  if (!rec) return <div className="empty">No recommendation stored for the latest analysis.</div>;

  return (
    <div className="page recommendations">
      <h2>Recommendations</h2>
      <div className="card">
        <div className={`priority priority-${rec.priority.toLowerCase()}`}><strong>Priority:</strong> {rec.priority}</div>
        <p className="summary">{rec.summary}</p>
        <h4>Suggested actions</h4>
        <ul>
          {rec.actions?.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}