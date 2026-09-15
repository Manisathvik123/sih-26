import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PALETTE } from "../palette.js";

export default function RiskTrendChart({ analyses }) {
  if (!analyses || analyses.length === 0) {
    return <div className="muted">No trend data yet.</div>;
  }

  const data = analyses.slice(-10).map((a, i) => ({
    index: i + 1,
    score: a.risk_score,
    date: new Date(a.created_at).toLocaleDateString(),
  }));

  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.sand} />
          <XAxis dataKey="index" tickLine={false} axisLine={{ stroke: PALETTE.sand }} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => [`${v}`, "risk score"]} labelFormatter={(l) => `record ${l}`} />
          <Line type="monotone" dataKey="score" stroke={PALETTE.earth} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}