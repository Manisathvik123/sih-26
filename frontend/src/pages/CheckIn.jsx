import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { submitCheckin } from "../api.js";
import { Smile, Meh, Frown, BatteryLow, Wind, Sprout, TriangleAlert } from "lucide-react";

// Four numbered 1-10 fields. `direction` controls whether a higher number is
// "better" (sleep/energy) or "worse" (stress/fatigue) — this only affects the
// button/tier coloring, never the value sent to the API.
const FIELDS = [
  {
    key: "stress_level",
    title: "Stress Level",
    description: "How tense or overwhelmed you've felt recently.",
    direction: "worse",
    tiers: [
      { max: 3, label: "Low" },
      { max: 6, label: "Moderate" },
      { max: 8, label: "Elevated" },
      { max: 10, label: "Severe" },
    ],
    anchors: { low: { text: "Very calm", icon: Sprout }, high: { text: "Severe tension", icon: TriangleAlert } },
  },
  {
    key: "sleep_quality",
    title: "Sleep Quality",
    description: "How well rested you feel after sleeping.",
    direction: "better",
    tiers: [
      { max: 3, label: "Poor" },
      { max: 5, label: "Fair" },
      { max: 8, label: "Good" },
      { max: 10, label: "Excellent" },
    ],
    anchors: { low: { text: "Very poor", icon: TriangleAlert }, high: { text: "Excellent", icon: Sprout } },
  },
  {
    key: "energy",
    title: "Energy",
    description: "How much physical and mental energy you have.",
    direction: "better",
    tiers: [
      { max: 3, label: "Depleted" },
      { max: 5, label: "Low" },
      { max: 8, label: "Good" },
      { max: 10, label: "High" },
    ],
    anchors: { low: { text: "Drained", icon: TriangleAlert }, high: { text: "Energized", icon: Sprout } },
  },
  {
    key: "fatigue",
    title: "Fatigue",
    description: "How worn out or physically exhausted you feel.",
    direction: "worse",
    tiers: [
      { max: 3, label: "Minimal" },
      { max: 5, label: "Mild" },
      { max: 8, label: "Moderate" },
      { max: 10, label: "Severe" },
    ],
    anchors: { low: { text: "No fatigue", icon: Sprout }, high: { text: "Exhausted", icon: TriangleAlert } },
  },
];

const MOOD_CARDS = [
  { id: "steady", label: "Balanced & Steady", subtitle: "Calm and composed", icon: Smile, value: 8 },
  { id: "fatigued", label: "Fatigued / Low", subtitle: "Drained and low energy", icon: BatteryLow, value: 4 },
  { id: "tense", label: "Tense / Anxious", subtitle: "On edge or worried", icon: Wind, value: 2 },
  { id: "frustrated", label: "Frustrated", subtitle: "Irritated or impatient", icon: Frown, value: 3 },
  { id: "neutral", label: "Neutral / Normal", subtitle: "Neither high nor low", icon: Meh, value: 5 },
];

// Maps the current 1-10 value to a display tier label (cosmetic only).
function tierLabel(tiers, value) {
  const hit = tiers.find((t) => value <= t.max);
  return (hit || tiers[tiers.length - 1]).label;
}

// "Concern" normalization: 1..10 where higher means more concerning,
// honoring the field's direction. Used only for button highlight color.
function concern(value, direction) {
  return direction === "worse" ? value : 11 - value;
}

function toneFor(value, direction) {
  const c = concern(value, direction);
  if (c >= 7) return "concern";
  if (c <= 3) return "good";
  return "mid";
}

const initial = { stress_level: 5, sleep_quality: 5, mood: 5, energy: 5, fatigue: 5, note: "" };

export default function CheckIn({ personnelId }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { data, error } = await submitCheckin({
      personnel_id: personnelId,
      stress_level: form.stress_level,
      sleep_quality: form.sleep_quality,
      mood: form.mood,
      energy: form.energy,
      fatigue: form.fatigue,
      note: form.note || null,
    });

    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    navigate("/analysis");
  }

  return (
    <div className="page checkin">
      <h2>Wellness Check-In</h2>
      <p className="muted">Select a value from 1–10 for each area, then confirm your current mood.</p>

      <form onSubmit={onSubmit} className="checkin-form">
        {FIELDS.map((f) => {
          const tone = toneFor(form[f.key], f.direction);
          const label = tierLabel(f.tiers, form[f.key]);
          return (
            <div className="checkin-card" key={f.key}>
              <div className="checkin-card-head">
                <div>
                  <h3>{f.title}</h3>
                  <p className="muted">{f.description}</p>
                </div>
                <span className={`tier-badge tier-${tone}`}>
                  Level {form[f.key]} • {label}
                </span>
              </div>

              <div className="num-row">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`num ${form[f.key] === n ? `selected ${toneFor(n, f.direction)}` : ""}`}
                    onClick={() => update(f.key, n)}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <div className="anchors">
                <span className="anchor">
                  <f.anchors.low.icon size={14} /> 1 · {f.anchors.low.text}
                </span>
                <span className="anchor mid">5 · Moderate</span>
                <span className="anchor">
                  <f.anchors.high.icon size={14} /> 10 · {f.anchors.high.text}
                </span>
              </div>
            </div>
          );
        })}

        <div className="checkin-card">
          <div className="checkin-card-head">
            <div>
              <h3>Mood</h3>
              <p className="muted">Which best describes how you feel right now?</p>
            </div>
          </div>
          <div className="mood-grid">
            {MOOD_CARDS.map((m) => {
              const selected = form.mood === m.value;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`mood-card ${selected ? "selected" : ""}`}
                  onClick={() => update("mood", m.value)}
                >
                  <Icon size={22} />
                  <span className="mood-title">{m.label}</span>
                  <span className="mood-subtitle">{m.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="checkin-card">
          <label htmlFor="note" className="note-label">
            Note <span className="muted">(optional)</span>
          </label>
          <textarea
            id="note"
            rows="3"
            placeholder="Any additional context…"
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
          />
        </div>

        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit Check-In"}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}