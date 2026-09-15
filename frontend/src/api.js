import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Normalize backend errors into a clean, user-facing message.
function handleError(err, fallback) {
  const msg = err?.response?.data?.error;
  if (msg && typeof msg === "string") return msg;
  if (err?.response) return fallback;
  return "Cannot reach the server. Is the backend running?";
}

export async function getPersonnel() {
  try {
    const res = await api.get("/personnel");
    return { data: res.data, error: null };
  } catch (err) {
    return { data: [], error: handleError(err, "Unable to load personnel.") };
  }
}

export async function getPersonnelById(id) {
  try {
    const res = await api.get(`/personnel/${id}`);
    return { data: res.data, error: null };
  } catch (err) {
    return { data: null, error: handleError(err, "Unable to load personnel.") };
  }
}

export async function submitCheckin(payload) {
  try {
    const res = await api.post("/checkins", payload);
    return { data: res.data, error: null };
  } catch (err) {
    return { data: null, error: handleError(err, "Unable to submit check-in.") };
  }
}

export async function getAnalysis(checkinId) {
  try {
    const res = await api.get(`/analysis/${checkinId}`);
    return { data: res.data, error: null };
  } catch (err) {
    return { data: null, error: handleError(err, "Unable to load analysis.") };
  }
}

export async function getTimeline(personnelId) {
  try {
    const res = await api.get(`/personnel/${personnelId}/timeline`);
    return { data: res.data, error: null };
  } catch (err) {
    return { data: [], error: handleError(err, "Unable to load timeline.") };
  }
}