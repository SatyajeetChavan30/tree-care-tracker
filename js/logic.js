/**
 * logic.js: the rules of the Tree Care Tracker.
 *
 * Every function in this file is "pure": it only looks at the values passed in
 * and returns a new value. Nothing here touches the page (DOM), the clock or
 * localStorage. That makes the rules easy to test (see tests/logic.test.html)
 * and easy to explain.
 *
 * Words used in the code:
 *   tree  = one sapling record  { id, num, code, species, spot, plantedOn, plantedBy, notes, sample }
 *   visit = one check-up record { id, treeId, date, at, watered, health, volunteer, note, sample }
 *   Dates are text in the form "YYYY-MM-DD" (for example "2026-11-18"), in local time.
 *   `at` is the exact moment a visit was saved, as an ISO timestamp.
 */

/** A sapling needs water after this many days without watering. */
export const DRY_DAYS = 3;

/** The Forest Department counts a plantation with 60% or more survival as a success. */
export const SUCCESS_BENCHMARK = 60;

/** How many visits the Overview shows under "Recent visits". */
export const RECENT_VISIT_COUNT = 6;

/** The three health states a volunteer can record. */
export const HEALTH_STATES = ["healthy", "stressed", "dead"];
export const HEALTH_LABELS = { healthy: "Healthy", stressed: "Stressed", dead: "Dead" };

/** Project settings used until the user saves their own. */
export const DEFAULT_SETTINGS = Object.freeze({
  projectName: "Soil Protection and Plantation",
  site: "Charholi (Bk), Lohegaon, Pune",
  target: 0, // 0 means "no target set"
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Turns a JavaScript Date into "YYYY-MM-DD" using the device's local date (not UTC). */
export function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Turns "YYYY-MM-DD" into a Date at local midnight. */
function parseDateString(text) {
  const [year, month, day] = text.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** True for a real date written as "YYYY-MM-DD". Rejects "2026-02-31" and "18-11-2026". */
export function isDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toDateString(parseDateString(value)) === value;
}

/** Whole days from one date to another: daysBetween("2026-11-15", "2026-11-18") is 3. */
export function daysBetween(fromDate, toDate) {
  // Math.round copes with 23- or 25-hour days in countries that change their clocks.
  return Math.round((parseDateString(toDate) - parseDateString(fromDate)) / MS_PER_DAY);
}

/** Moves a date forward (or back, with a negative number): addDays("2026-11-30", 1) is "2026-12-01". */
export function addDays(dateText, days) {
  const date = parseDateString(dateText);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

// ---------------------------------------------------------------------------
// Sapling IDs (T-001, T-002, ...)
// ---------------------------------------------------------------------------

/** 7 becomes "T-007". Numbers above 999 simply get longer: "T-1234". */
export function treeCode(num) {
  return "T-" + String(num).padStart(3, "0");
}

/** The next ID number is one more than the highest number in use (T-012 exists, so the next is 13). */
export function nextTreeNumber(trees) {
  return trees.reduce((highest, tree) => Math.max(highest, tree.num), 0) + 1;
}

/** Reads an ID typed or scanned by a person: "T-007", "t7" and "T007" all give 7. Anything else gives null. */
export function parseTreeCode(text) {
  const match = /^t-?0*(\d{1,5})$/i.exec(String(text).trim());
  return match ? Number(match[1]) : null;
}

// ---------------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------------

/** Sort order for visits: newest date first, and on the same date the one saved last first. */
export function compareVisitsNewestFirst(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.at !== b.at) return a.at < b.at ? 1 : -1;
  return 0;
}

/** Returns a sorted copy (newest first). The original list is not changed. */
export function sortVisitsNewestFirst(visits) {
  return [...visits].sort(compareVisitsNewestFirst);
}

/**
 * Health = the health recorded at the sapling's latest visit (sorted by date, then time).
 * A sapling that has never been visited counts as "healthy".
 */
export function healthOf(treeVisits) {
  if (treeVisits.length === 0) return "healthy";
  return sortVisitsNewestFirst(treeVisits)[0].health;
}

/**
 * Last watered = the date of the latest visit with watered: true.
 * The planting date counts as the first watering, because every sapling is watered when planted.
 * Returns null only for a damaged record with no planting date and no watering.
 */
export function lastWateredOn(tree, treeVisits) {
  let latest = isDateString(tree.plantedOn) ? tree.plantedOn : null;
  for (const visit of treeVisits) {
    if (visit.watered && (latest === null || visit.date > latest)) latest = visit.date;
  }
  return latest;
}

/** Days since the sapling was last watered (0 = watered today), or null if unknown. */
export function daysSinceWatered(tree, treeVisits, today) {
  const lastWatered = lastWateredOn(tree, treeVisits);
  return lastWatered === null ? null : Math.max(0, daysBetween(lastWatered, today));
}

/** Needs water = not dead, and DRY_DAYS (3) or more days since it was last watered. */
export function needsWater(tree, treeVisits, today) {
  if (healthOf(treeVisits) === "dead") return false;
  const days = daysSinceWatered(tree, treeVisits, today);
  return days !== null && days >= DRY_DAYS;
}

/** Rounds to one decimal place: 91.666 becomes 91.7. */
export function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

/**
 * Survival rate (%) = saplings alive ÷ saplings planted × 100, rounded to one decimal place.
 * "Alive" means healthy or stressed (everything except dead).
 * Returns null when nothing has been planted yet (we can't divide by zero).
 */
export function survivalRate(planted, alive) {
  if (planted <= 0) return null;
  return roundToOneDecimal((alive / planted) * 100);
}

/**
 * True when the survival rate reaches the Forest Department's 60% benchmark.
 * It uses the rounded rate, so a rate shown as "60.0%" always counts as meeting it.
 */
export function meetsBenchmark(rate) {
  return rate !== null && rate >= SUCCESS_BENCHMARK;
}

/** Shows a rate with one decimal place: 91.7 gives "91.7%", 100 gives "100.0%", null gives "—". */
export function formatPercent(rate) {
  return rate === null ? "—" : rate.toFixed(1) + "%";
}

// ---------------------------------------------------------------------------
// Cleaning data we can't fully trust (saved data, restored backups)
// ---------------------------------------------------------------------------

/** Trims text and cuts it to a maximum length. Anything that isn't text becomes "". */
function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/** Returns a tidy sapling record, or null if the row is too broken to use. */
export function cleanTree(raw) {
  if (!raw || typeof raw.id !== "string" || raw.id === "") return null;
  const number = Number(raw.num);
  const num = Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
  return {
    id: raw.id,
    num: num,
    code: cleanText(raw.code, 12) || treeCode(num),
    species: cleanText(raw.species, 60) || "Unknown species",
    spot: cleanText(raw.spot, 140),
    plantedOn: isDateString(raw.plantedOn) ? raw.plantedOn : "",
    plantedBy: cleanText(raw.plantedBy, 60),
    notes: cleanText(raw.notes, 400),
    sample: raw.sample === true,
  };
}

/** Returns a tidy visit record, or null if the row is too broken to use. */
export function cleanVisit(raw) {
  if (!raw || typeof raw.id !== "string" || typeof raw.treeId !== "string" || !isDateString(raw.date)) {
    return null;
  }
  return {
    id: raw.id,
    treeId: raw.treeId,
    date: raw.date,
    at: typeof raw.at === "string" ? raw.at.slice(0, 40) : "",
    watered: raw.watered === true, // only a real true counts as watered
    health: HEALTH_STATES.includes(raw.health) ? raw.health : "healthy",
    volunteer: cleanText(raw.volunteer, 60),
    note: cleanText(raw.note, 300),
    sample: raw.sample === true,
  };
}

/** Returns complete settings, filling gaps with DEFAULT_SETTINGS. */
export function cleanSettings(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  // Backups made with the old single-file prototype called the project name "name".
  const projectName = cleanText(source.projectName ?? source.name, 80);
  const site = cleanText(source.site, 120);
  const target = Number(source.target);
  return {
    projectName: projectName || DEFAULT_SETTINGS.projectName,
    site: site || DEFAULT_SETTINGS.site,
    target: Number.isFinite(target) ? Math.min(100000, Math.max(0, Math.round(target))) : 0,
  };
}

/**
 * Cleans a whole data object { trees, visits, settings }.
 * Drops broken rows, repeated IDs, and visits whose sapling no longer exists.
 */
export function cleanData(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const rawTrees = Array.isArray(source.trees) ? source.trees : [];
  const rawVisits = Array.isArray(source.visits) ? source.visits : [];

  const trees = [];
  const treeIds = new Set();
  for (const row of rawTrees) {
    const tree = cleanTree(row);
    if (tree && !treeIds.has(tree.id)) {
      trees.push(tree);
      treeIds.add(tree.id);
    }
  }

  const visits = [];
  const visitIds = new Set();
  for (const row of rawVisits) {
    const visit = cleanVisit(row);
    if (visit && treeIds.has(visit.treeId) && !visitIds.has(visit.id)) {
      visits.push(visit);
      visitIds.add(visit.id);
    }
  }

  return { trees, visits, settings: cleanSettings(source.settings) };
}

// ---------------------------------------------------------------------------
// Summary: every number the screens show, worked out in one place
// ---------------------------------------------------------------------------

/**
 * Works out everything the screens need from the saved data.
 * `today` ("YYYY-MM-DD") is passed in rather than read from the clock, so tests can choose any date.
 */
export function summarize(data, today) {
  // Group the visits by sapling, newest first.
  const visitsByTree = new Map();
  const treeIds = new Set(data.trees.map((tree) => tree.id));
  const allVisits = sortVisitsNewestFirst(data.visits).filter((visit) => treeIds.has(visit.treeId));
  for (const visit of allVisits) {
    if (!visitsByTree.has(visit.treeId)) visitsByTree.set(visit.treeId, []);
    visitsByTree.get(visit.treeId).push(visit);
  }

  // Add the worked-out status to each sapling, and sort them by ID number.
  const trees = data.trees
    .map((tree) => {
      const treeVisits = visitsByTree.get(tree.id) || [];
      return {
        ...tree,
        visits: treeVisits, // newest first
        health: healthOf(treeVisits),
        lastWatered: lastWateredOn(tree, treeVisits),
        daysDry: daysSinceWatered(tree, treeVisits, today),
        needsWater: needsWater(tree, treeVisits, today),
        ageDays: isDateString(tree.plantedOn) ? Math.max(0, daysBetween(tree.plantedOn, today)) : null,
      };
    })
    .sort((a, b) => a.num - b.num || a.code.localeCompare(b.code));

  const treeById = new Map(trees.map((tree) => [tree.id, tree]));
  const countHealth = (state) => trees.filter((tree) => tree.health === state).length;
  const planted = trees.length;
  const dead = countHealth("dead");
  const alive = planted - dead;
  const rate = survivalRate(planted, alive);

  // Driest first, so the most urgent sapling is at the top of the list.
  const needWater = trees
    .filter((tree) => tree.needsWater)
    .sort((a, b) => b.daysDry - a.daysDry || a.num - b.num);

  // Stressed saplings first: they can still be saved.
  const needAttention = trees
    .filter((tree) => tree.health !== "healthy")
    .sort((a, b) => (a.health === b.health ? a.num - b.num : a.health === "stressed" ? -1 : 1));

  // "Last 7 days" = today and the 6 days before it.
  const weekStart = addDays(today, -6);
  const visitsLast7Days = allVisits.filter((visit) => visit.date >= weekStart && visit.date <= today).length;

  const recentVisits = allVisits.slice(0, RECENT_VISIT_COUNT).map((visit) => ({
    ...visit,
    tree: treeById.get(visit.treeId),
  }));

  // How many of each species were planted, most common first.
  const speciesMap = new Map();
  for (const tree of trees) {
    const entry = speciesMap.get(tree.species) || { name: tree.species, planted: 0, alive: 0 };
    entry.planted += 1;
    if (tree.health !== "dead") entry.alive += 1;
    speciesMap.set(tree.species, entry);
  }
  const species = [...speciesMap.values()].sort((a, b) => b.planted - a.planted || a.name.localeCompare(b.name));

  const nextNumber = nextTreeNumber(trees);

  return {
    today,
    trees,
    treeById,
    planted,
    alive,
    dead,
    stressed: countHealth("stressed"),
    healthy: countHealth("healthy"),
    survivalRate: rate,
    meetsBenchmark: meetsBenchmark(rate),
    needWater,
    needAttention,
    visitCount: allVisits.length,
    visitsLast7Days,
    recentVisits,
    species,
    sampleTrees: trees.filter((tree) => tree.sample).length,
    sampleVisits: allVisits.filter((visit) => visit.sample).length,
    nextNumber,
    nextCode: treeCode(nextNumber),
  };
}

// ---------------------------------------------------------------------------
// CSV export (opens in Excel or Google Sheets)
// ---------------------------------------------------------------------------

/** Puts a cell in quotes when it contains a comma, quote or line break, as the CSV format requires. */
export function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

/** Builds the "sapling list" CSV text from a summary. */
export function buildCsv(summary) {
  const rows = [
    [
      "ID",
      "Species",
      "Planting spot",
      "Planted on",
      "Planted by",
      "Health",
      "Last watered",
      "Days since watering",
      "Needs water",
      "Visits",
      "Notes",
      "Sample",
    ],
  ];
  for (const tree of summary.trees) {
    rows.push([
      tree.code,
      tree.species,
      tree.spot,
      tree.plantedOn,
      tree.plantedBy,
      HEALTH_LABELS[tree.health],
      tree.lastWatered || "",
      tree.health === "dead" || tree.daysDry === null ? "" : tree.daysDry,
      tree.needsWater ? "Yes" : "No",
      tree.visits.length,
      tree.notes,
      tree.sample ? "Yes" : "No",
    ]);
  }
  rows.push([]);
  rows.push(["Saplings planted", summary.planted]);
  rows.push(["Saplings alive", summary.alive]);
  rows.push(["Survival rate (%)", summary.survivalRate === null ? "" : summary.survivalRate.toFixed(1)]);

  // "﻿" (a byte-order mark) tells Excel the file is UTF-8, so Marathi or Hindi names show correctly.
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
