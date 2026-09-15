export default function PersonnelSelector({ personnel, selectedId, onChange, collapsed = false }) {
  return (
    <label className="selector">
      {!collapsed && <span className="selector-label">Active personnel</span>}
      <select value={selectedId ?? ""} onChange={(e) => onChange(e.target.value)} title="Active personnel">
        {!personnel.length && <option value="">— none —</option>}
        {personnel.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.id})
          </option>
        ))}
      </select>
    </label>
  );
}