// Seed script for the synthetic HR dataset (section 5).
//
// Usage:
//   node seed/seedPersonnel.js                 -> seeds the bundled real dataset
//   node seed/seedPersonnel.js path/file.json  -> seeds a provided .json / .csv
//
// Expected row shape:
//   { id, name, department, overtime_hours, blood_pressure, pulse_rate }
//
// Field note on blood_pressure:
//   The source workbook (synthetic_military_hr_dataset.xlsx) carries a SINGLE
//   systolic integer (e.g. 128). The deterministic formula (section 7) requires
//   "SYS/DIA". To conform, the bundled dataset derives diastolic as
//   `systolic - 40` (pulse pressure 40, matching the formula's 120/80
//   reference frame). The original systolic value is preserved verbatim.
//   See backend/seed/data/personnel.json for the normalized records.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { configStatus, supabase } from "../config/supabase.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUNDLED_DATASET = join(__dirname, "data", "personnel.json");

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i];
    });
    row.overtime_hours = parseInt(row.overtime_hours, 10);
    row.pulse_rate = parseInt(row.pulse_rate, 10);
    return row;
  });
}

async function loadRows(filePath) {
  const raw = await readFile(filePath, "utf8");
  if (filePath.endsWith(".json")) {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : parsed.personnel;
  }
  if (filePath.endsWith(".csv")) {
    return parseCSV(raw);
  }
  throw new Error("Unsupported file type. Use .json or .csv.");
}

function validateRow(row) {
  if (!row || !row.id || !row.name) throw new Error(`Row is missing required id/name: ${JSON.stringify(row)}`);
  if (!/^\d{2,3}\/\d{2,3}$/.test(String(row.blood_pressure))) {
    throw new Error(`Invalid blood_pressure format "${row.blood_pressure}" for ${row.id}`);
  }
  return row;
}

async function main() {
  if (!configStatus()) {
    console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY in .env first.");
    process.exit(1);
  }

  const filePath = process.argv[2] || BUNDLED_DATASET;
  if (!process.argv[2]) {
    console.log("  Seeding bundled dataset:", BUNDLED_DATASET);
  }

  const rows = (await loadRows(filePath)).map(validateRow);

  const { error } = await supabase.from("personnel").upsert(rows);
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log(`Seeded ${rows.length} personnel rows.`);
}

main();