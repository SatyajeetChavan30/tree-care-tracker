/**
 * storage.js: saves and loads the tracker's data.
 *
 * This is the ONLY file that touches localStorage. The rest of the app calls
 * the functions below and never needs to know where the data lives.
 *
 * The data functions return Promises (they are `async`). Saving to localStorage
 * is instant, so they don't need to be, but an online database is not instant.
 * A later storage-supabase.js can offer exactly the same functions, and
 * app.js will not need to change.
 *
 * What is saved:
 *   "treeCareTracker.data.v1"  -> { trees: [...], visits: [...], settings: {...} }
 *   "treeCareTracker.prefs.v1" -> { volunteerName: "...", theme: "auto" }  (this device only)
 */
import { cleanData, cleanSettings, nextTreeNumber, treeCode } from "./logic.js";

const DATA_KEY = "treeCareTracker.data.v1";
const PREFS_KEY = "treeCareTracker.prefs.v1";
const BACKUP_APP = "tree-care-tracker";
const BACKUP_VERSION = 2; // version 1 was the single-file prototype; both can be restored

/** An error whose message can be shown to the user as it is. */
export class StorageError extends Error {}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function readJson(key) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch (error) {
    return null; // storage is blocked, or the saved text is damaged
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    const storageFull = error && (error.name === "QuotaExceededError" || error.code === 22);
    throw new StorageError(
      storageFull
        ? "This browser’s storage is full. Download a backup, then remove saplings you no longer need."
        : "This browser is blocking saving (private window?). Your changes can’t be kept.",
    );
  }
}

/** Always returns clean data: { trees, visits, settings }. */
function readData() {
  return cleanData(readJson(DATA_KEY));
}

function writeData(data) {
  writeJson(DATA_KEY, data);
}

/** A random ID for a new record, for example "3f6c1e0a-...". */
function newId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  // Older browsers, or pages not served over https: time + random letters is unique enough here.
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

// ---------------------------------------------------------------------------
// Data (shared by everyone once phase 2 moves it online)
// ---------------------------------------------------------------------------

/** Loads everything. */
export async function loadAll() {
  return readData();
}

/**
 * Adds a sapling. Its number and ID (T-001, T-002, ...) are given here, from the
 * saved data, so two open tabs can never hand out the same ID.
 * Returns the new sapling.
 */
export async function addTree(fields) {
  const data = readData();
  const num = nextTreeNumber(data.trees);
  const tree = {
    id: newId(),
    num: num,
    code: treeCode(num),
    species: fields.species,
    spot: fields.spot,
    plantedOn: fields.plantedOn,
    plantedBy: fields.plantedBy,
    notes: fields.notes,
    sample: false,
  };
  data.trees.push(tree);
  writeData(data);
  return tree;
}

/** Changes some details of a sapling (species, spot, planting date, planted by, notes). */
export async function updateTree(id, changes) {
  const data = readData();
  const tree = data.trees.find((item) => item.id === id);
  if (!tree) throw new StorageError("That sapling was removed.");
  for (const field of ["species", "spot", "plantedOn", "plantedBy", "notes"]) {
    if (field in changes) tree[field] = changes[field];
  }
  writeData(data);
  return tree;
}

/** Removes a sapling and all of its visits. */
export async function deleteTree(id) {
  const data = readData();
  data.trees = data.trees.filter((tree) => tree.id !== id);
  data.visits = data.visits.filter((visit) => visit.treeId !== id);
  writeData(data);
}

/** Saves a visit (watering and health check). Returns the new visit. */
export async function addVisit(fields) {
  const data = readData();
  if (!data.trees.some((tree) => tree.id === fields.treeId)) {
    throw new StorageError("That sapling was removed.");
  }
  const visit = {
    id: newId(),
    treeId: fields.treeId,
    date: fields.date,
    at: fields.at,
    watered: fields.watered === true,
    health: fields.health,
    volunteer: fields.volunteer,
    note: fields.note,
    sample: false,
  };
  data.visits.push(visit);
  writeData(data);
  return visit;
}

/** Saves the project details (name, site, target). */
export async function saveSettings(settings) {
  const data = readData();
  data.settings = cleanSettings(settings);
  writeData(data);
  return data.settings;
}

/** Replaces everything (used to load the sample data). */
export async function replaceAll(newData) {
  const data = cleanData(newData);
  writeData(data);
  return data;
}

/** Removes every sample sapling and sample visit, and keeps the real records. */
export async function removeSampleData() {
  const data = readData();
  const sampleTreeIds = new Set(data.trees.filter((tree) => tree.sample).map((tree) => tree.id));
  data.trees = data.trees.filter((tree) => !tree.sample);
  data.visits = data.visits.filter((visit) => !visit.sample && !sampleTreeIds.has(visit.treeId));
  writeData(data);
  return data;
}

// ---------------------------------------------------------------------------
// Backups
// ---------------------------------------------------------------------------

/** Returns the text of a backup file (.json) with everything in it. */
export async function exportBackup() {
  const data = readData();
  const backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    trees: data.trees,
    visits: data.visits,
    settings: data.settings,
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Checks the text of a backup file and returns clean data.
 * Throws a StorageError if the file is not a Tree Care Tracker backup.
 */
export function parseBackup(text) {
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = null;
  }
  if (!parsed || !Array.isArray(parsed.trees) || !Array.isArray(parsed.visits)) {
    throw new StorageError("That file isn’t a Tree Care Tracker backup. Choose the .json file made by Download backup.");
  }
  return cleanData(parsed);
}

/** Replaces everything on this device with the contents of a backup file. Returns the new data. */
export async function restoreBackup(text) {
  const data = parseBackup(text);
  writeData(data);
  return data;
}

// ---------------------------------------------------------------------------
// Preferences for this device only (never shared, never in backups)
// ---------------------------------------------------------------------------

/** Reads a preference, for example getPref("volunteerName"). */
export function getPref(name, fallback = "") {
  const prefs = readJson(PREFS_KEY) || {};
  return typeof prefs[name] === "string" ? prefs[name] : fallback;
}

/** Saves a preference. Failing to save one is not worth bothering the user about. */
export function setPref(name, value) {
  const prefs = readJson(PREFS_KEY) || {};
  prefs[name] = String(value);
  try {
    writeJson(PREFS_KEY, prefs);
  } catch (error) {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Other helpers
// ---------------------------------------------------------------------------

/** True if this browser lets the page save at all (it may not in a private window). */
export function canSave() {
  try {
    const testKey = "treeCareTracker.test";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/** Runs `callback` when the tracker is changed in another tab or window on this device. */
export function onOtherTabChange(callback) {
  window.addEventListener("storage", (event) => {
    if (event.key === DATA_KEY || event.key === null) callback();
  });
}

/**
 * Asks the browser to keep our data even when the phone is low on space.
 * Browsers may say no; the app works either way.
 */
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist();
  } catch (error) {
    /* not supported */
  }
  return false;
}
