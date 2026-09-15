import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PALETTE } from "../palette.js";

export default function FactorBreakdown({ breakdown }) {
  if (!breakdown || !breakdown.length) {
    return <div className="muted">No factor breakdown available.</div>;
  }

  // Sort order is already descending by contribution (from the backend), and
  // is preserved verbatim — only the orientation changes to vertical columns.
  const data = breakdown.map((f) => ({ name: f.factor, contribution: f.contributionPct }));

  return (
    <div className="factor-breakdown">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.sand} vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: PALETTE.sand }} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => [`${v}`, "contribution"]} />
          <Bar dataKey="contribution" fill={PALETTE.moss} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}