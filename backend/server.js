import "dotenv/config";
import express from "express";
import cors from "cors";
import personnelRoutes from "./routes/personnel.js";
import checkinsRoutes from "./routes/checkins.js";
import analysisRoutes from "./routes/analysis.js";
import { configStatus } from "./config/supabase.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/personnel", personnelRoutes);
app.use("/api/checkins", checkinsRoutes);
app.use("/api/analysis", analysisRoutes);

// Clean JSON error handler — never leaks stack traces or provider details.
app.use((err, req, res, next) => {
  console.error("[error]", err?.message);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: "Internal server error." });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`PRAHARI backend listening on http://localhost:${PORT}`);
  if (!configStatus()) {
    console.warn("  Warning: SUPABASE_URL / SUPABASE_ANON_KEY not set — set them in .env.");
  }
});