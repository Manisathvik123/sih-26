const LEVEL_STYLES = {
  LOW: "level-low",
  MODERATE: "level-moderate",
  HIGH: "level-high",
};

export default function RiskLevelBadge({ level, score }) {
  const cls = LEVEL_STYLES[level] || "level-low";
  return (
    <div className={`risk-badge ${cls}`}>
      <div className="risk-score">{score}</div>
      <div className="risk-level">{level}</div>
    </div>
  );
}