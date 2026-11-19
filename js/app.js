/**
 * app.js: starts the tracker and handles everything the user does.
 *
 * How the files work together:
 *   storage.js  loads and saves the data (the only file that uses localStorage)
 *   logic.js    the rules: health, needs water, survival rate
 *   ui.js       draws the screens
 *   qr.js       draws the QR label sheet
 *   samples.js  example data for trying the app
 *
 * Every action follows the same cycle:
 *   the user taps or submits  ->  storage.js saves  ->  load the data again
 *   ->  logic.summarize() works out the numbers  ->  ui.js redraws the screens
 */
import * as storage from "./storage.js";
import { DEFAULT_SETTINGS, HEALTH_STATES, buildCsv, isDateString, parseTreeCode, summarize, toDateString, treeCode } from "./logic.js";
import { buildSampleData } from "./samples.js";
import * as ui from "./ui.js";
import { renderLabels } from "./qr.js";

const TABS = ["overview", "trees", "add", "labels", "guide"];
const THEMES = ["auto", "light", "dark"];

/** Everything the app needs to remember while it is open. */
const state = {
  data: { trees: [], visits: [], settings: { ...DEFAULT_SETTINGS } }, // what storage.js loaded
  summary: null, // the numbers worked out from `data` by logic.summarize()
  tab: "overview", // which screen is showing
  filter: "all", // Saplings screen filter: all, water, stressed or dead
  query: "", // Saplings screen search text
  openTreeId: null, // the sapling shown in the dialog, if any
};

const byId = (id) => document.getElementById(id);
const todayString = () => toDateString(new Date());

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

/** Works out the summary again and redraws every screen. */
function render() {
  // Redrawing replaces buttons, so remember which one had keyboard focus and give it back afterwards.
  const focusKey = document.activeElement?.dataset?.focusKey;

  state.summary = summarize(state.data, todayString());
  const { summary } = state;
  const settings = state.data.settings;
  ui.renderHeader(settings);
  ui.renderSampleBanner(summary);
  ui.renderOverview(summary, settings);
  ui.renderTreeList(summary, state.filter, state.query);
  ui.renderAddView(summary);
  ui.renderGuide(summary, settings);
  if (state.tab === "labels") renderLabels(summary, settings);

  if (state.openTreeId) {
    const tree = summary.treeById.get(state.openTreeId);
    if (tree) {
      ui.renderTreeDialog(tree, summary);
    } else {
      closeTree(); // removed in another tab
      ui.showToast("That sapling was removed.");
    }
  }

  if (focusKey && document.activeElement?.dataset?.focusKey !== focusKey) {
    document.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
  }
}

/** Loads the saved data again and redraws. */
async function reload() {
  state.data = await storage.loadAll();
  render();
}

/**
 * Runs a save, then reloads the screens. If it fails, shows the reason.
 * Returns true when the save worked.
 */
async function save(action) {
  try {
    await action();
  } catch (error) {
    console.error(error);
    ui.showToast(error instanceof storage.StorageError ? error.message : "Couldn’t save. Please try again.");
    return false;
  }
  await reload();
  return true;
}

// ---------------------------------------------------------------------------
// Screens (tabs) and links
// ---------------------------------------------------------------------------

function setTab(tab, { updateAddress = true } = {}) {
  if (!TABS.includes(tab)) tab = "overview";
  state.tab = tab;
  ui.showTab(tab, TABS);
  if (tab === "labels") renderLabels(state.summary, state.data.settings);
  if (updateAddress) setAddressHash(tab === "overview" ? "" : tab);
}

/** Changes the part after "#" in the address bar, without reloading or adding a Back step. */
function setAddressHash(value) {
  history.replaceState(null, "", location.pathname + location.search + (value ? "#" + value : ""));
}

/**
 * Reads the part after "#" in the address:
 *   #guide, #labels ...  opens that screen
 *   #T-007               opens sapling T-007 (this is what the QR labels use)
 */
function handleHash() {
  let hash = "";
  try {
    hash = decodeURIComponent(location.hash.slice(1));
  } catch (error) {
    hash = "";
  }
  if (!hash) return;
  if (TABS.includes(hash)) {
    setTab(hash, { updateAddress: false });
    return;
  }
  const num = parseTreeCode(hash);
  if (num === null) return;
  const tree = state.summary.trees.find((item) => item.num === num);
  if (tree) {
    ui.hideNotice();
    setTab("trees", { updateAddress: false });
    openTree(tree.id);
  } else {
    showMissingTreeNotice(treeCode(num));
  }
}

/** Shown when a QR label is scanned on a phone that doesn't have that sapling saved. */
function showMissingTreeNotice(code) {
  ui.showNotice(`
    <p><b>${ui.escapeHtml(code)} isn’t saved on this device.</b> Each phone keeps its own copy of the tracker.
      To see this sapling here, restore the latest backup from the phone or laptop that has it.</p>
    <div class="btn-row">
      <button class="btn btn-primary btn-sm" type="button" data-action="go-restore">Restore a backup</button>
      <button class="btn btn-ghost btn-sm" type="button" data-action="dismiss-notice">Close</button>
    </div>`);
}

function goToRestore() {
  ui.hideNotice();
  setTab("guide");
  byId("dataTools").scrollIntoView({ block: "center" });
  byId("restoreFile").focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// One sapling (the dialog)
// ---------------------------------------------------------------------------

function openTree(id) {
  const tree = state.summary.treeById.get(id);
  if (!tree) return;
  state.openTreeId = id;

  // Fresh "Log a visit" form: today's date, this device's volunteer name, and the current health.
  const form = byId("visitForm");
  form.reset();
  byId("visit-date").value = state.summary.today;
  byId("visit-by").value = storage.getPref("volunteerName");
  form.elements.health.value = tree.health;
  byId("editBox").hidden = true;
  disarm(byId("removeTreeButton"));

  ui.renderTreeDialog(tree, state.summary);
  const dialog = byId("treeDialog");
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  setAddressHash(tree.code); // the address now points at this sapling, like its QR label
}

function closeTree() {
  const dialog = byId("treeDialog");
  if (dialog.open) dialog.close();
  onDialogClosed();
}

/** Tidies up after the dialog closes (from the close button, the Esc key or the phone's Back gesture). */
function onDialogClosed() {
  if (byId("treeDialog").open) return; // a late "close" event after another sapling was opened
  state.openTreeId = null;
  byId("editBox").hidden = true;
  disarm(byId("removeTreeButton"));
  setAddressHash(state.tab === "overview" ? "" : state.tab);
}

function showEditForm() {
  const tree = state.summary.treeById.get(state.openTreeId);
  if (!tree) return;
  const isListed = ui.SPECIES.some((species) => species.name === tree.species);
  byId("edit-species").value = isListed ? tree.species : ui.OTHER_SPECIES;
  byId("edit-other").value = isListed ? "" : tree.species;
  toggleOtherSpecies("edit");
  byId("edit-spot").value = tree.spot;
  byId("edit-date").value = tree.plantedOn;
  byId("edit-date").max = todayString();
  byId("edit-by").value = tree.plantedBy;
  byId("edit-notes").value = tree.notes;
  byId("editBox").hidden = false;
  byId("editBox").scrollIntoView({ block: "nearest" });
  byId("edit-spot").focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------
// Checking form fields
// ---------------------------------------------------------------------------

/** Reads the species from a dropdown and its "Other" box ("add" or "edit" form) and checks it. */
function readSpecies(prefix) {
  const select = byId(`${prefix}-species`);
  const other = byId(`${prefix}-other`);
  const isOther = select.value === ui.OTHER_SPECIES;
  const species = isOther ? other.value.trim() : select.value;
  select.setCustomValidity(select.value ? "" : "Choose a species.");
  other.setCustomValidity(isOther && !species ? "Type the species name." : "");
  return species;
}

/** Shows the "Species name" box only when "Other…" is chosen. */
function toggleOtherSpecies(prefix) {
  const isOther = byId(`${prefix}-species`).value === ui.OTHER_SPECIES;
  byId(`${prefix}-other-wrap`).hidden = !isOther;
  byId(`${prefix}-other`).required = isOther;
}

function checkPlantingDate(input) {
  const value = input.value;
  let message = "";
  if (!isDateString(value)) message = "Choose the planting date.";
  else if (value > todayString()) message = "The planting date can’t be in the future.";
  input.setCustomValidity(message);
}

function checkRequiredText(input, message) {
  input.setCustomValidity(input.value.trim() ? "" : message);
}

/** Remembers the volunteer's name on this device, to fill in next time. */
function rememberName(name) {
  storage.setPref("volunteerName", name);
  byId("device-name").value = name;
}

// ---------------------------------------------------------------------------
// Saving: saplings, visits, settings
// ---------------------------------------------------------------------------

async function onAddTree(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const species = readSpecies("add");
  const spot = byId("add-spot");
  const date = byId("add-date");
  checkRequiredText(spot, "Say where the sapling is planted.");
  checkPlantingDate(date);
  if (!form.reportValidity()) return; // shows the browser's message next to the first problem

  const plantedBy = byId("add-by").value.trim();
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  let added = null;
  const ok = await save(async () => {
    added = await storage.addTree({
      species: species,
      spot: spot.value.trim(),
      plantedOn: date.value,
      plantedBy: plantedBy,
      notes: byId("add-notes").value.trim(),
    });
  });
  button.disabled = false;
  if (!ok) return;

  if (plantedBy) rememberName(plantedBy);
  // Keep the species and date (volunteers often plant several of the same), clear the rest.
  spot.value = "";
  byId("add-notes").value = "";
  ui.showToast(`${added.code} added. Write ${added.code} on its label.`);
  spot.focus();
}

async function onAddVisit(event) {
  event.preventDefault();
  const tree = state.summary.treeById.get(state.openTreeId);
  if (!tree) return;
  const form = event.currentTarget;
  const dateInput = byId("visit-date");
  const date = dateInput.value;
  let message = "";
  if (!isDateString(date)) message = "Choose the visit date.";
  else if (date > todayString()) message = "The visit date can’t be in the future.";
  else if (tree.plantedOn && date < tree.plantedOn) {
    message = `This sapling was planted on ${ui.formatDate(tree.plantedOn, todayString(), true)}.`;
  }
  dateInput.setCustomValidity(message);
  if (!form.reportValidity()) return;

  const health = form.elements.health.value;
  const volunteer = byId("visit-by").value.trim();
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  const ok = await save(() =>
    storage.addVisit({
      treeId: tree.id,
      date: date,
      at: new Date().toISOString(),
      watered: form.elements.watered.value === "yes",
      health: HEALTH_STATES.includes(health) ? health : "healthy",
      volunteer: volunteer,
      note: byId("visit-note").value.trim(),
    }),
  );
  button.disabled = false;
  if (!ok) return;

  if (volunteer) rememberName(volunteer);
  byId("visit-note").value = "";
  ui.showToast(`Visit saved for ${tree.code}.`);
}

/** The one-tap "Watered" button in the Needs water list. */
async function waterToday(treeId, button) {
  const tree = state.summary.treeById.get(treeId);
  if (!tree) return;
  button.disabled = true;
  const ok = await save(() =>
    storage.addVisit({
      treeId: tree.id,
      date: todayString(),
      at: new Date().toISOString(),
      watered: true,
      health: tree.health, // watering doesn't change its health
      volunteer: storage.getPref("volunteerName"),
      note: "",
    }),
  );
  if (ok) ui.showToast(`${tree.code} marked as watered today.`);
  else button.disabled = false;
}

async function onEditTree(event) {
  event.preventDefault();
  const tree = state.summary.treeById.get(state.openTreeId);
  if (!tree) return;
  const form = event.currentTarget;
  const species = readSpecies("edit");
  const spot = byId("edit-spot");
  const date = byId("edit-date");
  checkRequiredText(spot, "Say where the sapling is planted.");
  checkPlantingDate(date);
  if (!form.reportValidity()) return;

  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  const ok = await save(() =>
    storage.updateTree(tree.id, {
      species: species,
      spot: spot.value.trim(),
      plantedOn: date.value,
      plantedBy: byId("edit-by").value.trim(),
      notes: byId("edit-notes").value.trim(),
    }),
  );
  button.disabled = false;
  if (!ok) return;
  byId("editBox").hidden = true;
  ui.showToast(`${tree.code} updated.`);
}

async function removeOpenTree(button) {
  const tree = state.summary.treeById.get(state.openTreeId);
  if (!tree) return;
  button.disabled = true;
  const ok = await save(async () => {
    await storage.deleteTree(tree.id);
    closeTree();
  });
  button.disabled = false;
  if (ok) ui.showToast(`${tree.code} removed.`);
}

async function onSaveSettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const targetInput = byId("settings-target");
  const targetText = targetInput.value.trim();
  const target = Number(targetText);
  const targetOk = targetText === "" || (Number.isInteger(target) && target >= 0 && target <= 100000);
  targetInput.setCustomValidity(targetOk ? "" : "Enter a whole number from 0 to 100000.");
  if (!form.reportValidity()) return;

  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  delete form.dataset.dirty; // let the saved values show again
  const ok = await save(() =>
    storage.saveSettings({
      projectName: byId("settings-name").value,
      site: byId("settings-site").value,
      target: targetText === "" ? 0 : target,
    }),
  );
  button.disabled = false;
  if (ok) ui.showToast("Project details saved.");
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

async function loadSamples() {
  const current = await storage.loadAll();
  if (current.trees.length > 0) {
    ui.showToast("Sample data can only be loaded into an empty tracker.");
    return;
  }
  const sample = buildSampleData(todayString());
  const ok = await save(() =>
    storage.replaceAll({ trees: sample.trees, visits: sample.visits, settings: current.settings }),
  );
  if (!ok) return;
  setTab("overview");
  window.scrollTo({ top: 0 });
  ui.showToast("Sample data loaded. Remove it before you record your own plantation.");
}

async function removeSamples() {
  const ok = await save(() => storage.removeSampleData());
  if (ok) ui.showToast("Sample data removed. Add your first sapling from Add sapling.");
}

// ---------------------------------------------------------------------------
// Two-tap confirm for buttons that delete things (instead of a confirm() pop-up)
// ---------------------------------------------------------------------------

/** First tap: the button asks "Tap again to remove". Second tap within 4 seconds: it runs `action`. */
function confirmTap(button, armedLabel, action) {
  if (button.dataset.armed) {
    disarm(button);
    action(button);
    return;
  }
  button.dataset.armed = "true";
  button.dataset.label = button.textContent;
  button.textContent = armedLabel;
  button.dataset.timer = String(setTimeout(() => disarm(button), 4000));
}

function disarm(button) {
  if (!button || !button.dataset.armed) return;
  clearTimeout(Number(button.dataset.timer));
  button.textContent = button.dataset.label;
  delete button.dataset.armed;
  delete button.dataset.label;
  delete button.dataset.timer;
}

// ---------------------------------------------------------------------------
// Files: backup, restore, CSV, printing labels
// ---------------------------------------------------------------------------

/** Makes the browser download `text` as a file. */
function downloadFile(fileName, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type: type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function downloadBackup() {
  const text = await storage.exportBackup();
  downloadFile(`tree-care-backup-${todayString()}.json`, text, "application/json");
  ui.showToast("Backup downloaded. Keep it somewhere safe.");
}

function downloadCsv() {
  if (state.summary.planted === 0) {
    ui.showToast("Add saplings first, then download the list.");
    return;
  }
  downloadFile(`tree-care-saplings-${todayString()}.csv`, buildCsv(state.summary), "text/csv;charset=utf-8");
  ui.showToast("Sapling list downloaded.");
}

async function onRestoreFile(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  input.value = ""; // so picking the same file again still works
  if (!file) return;
  let text = "";
  try {
    text = await file.text();
  } catch (error) {
    ui.showToast("Couldn’t read that file. Try again.");
    return;
  }
  let restored = null;
  const ok = await save(async () => {
    restored = await storage.restoreBackup(text);
  });
  if (ok) {
    const trees = restored.trees.length;
    const visits = restored.visits.length;
    ui.showToast(`Backup restored: ${trees} ${ui.plural(trees, "sapling")}, ${visits} ${ui.plural(visits, "visit")}.`);
  }
}

function printLabels() {
  renderLabels(state.summary, state.data.settings);
  window.print();
}

// ---------------------------------------------------------------------------
// Theme (Auto follows the phone's setting; Light helps in bright sunlight)
// ---------------------------------------------------------------------------

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark") root.dataset.theme = theme;
  else delete root.dataset.theme;
  ui.renderThemeButton(theme);
}

function cycleTheme() {
  const current = storage.getPref("theme", "auto");
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  storage.setPref("theme", next);
  applyTheme(next);
  const messages = {
    auto: "Colours now follow this device’s setting.",
    light: "Light theme: easiest to read in sunlight.",
    dark: "Dark theme.",
  };
  ui.showToast(messages[next]);
}

// ---------------------------------------------------------------------------
// Offline support
// ---------------------------------------------------------------------------

/** Registers sw.js, which keeps a copy of the app on the device so it opens without internet. */
function registerServiceWorker() {
  // Service workers only run on http(s) pages, never on file:// pages.
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Offline mode is not available:", error);
    });
  });
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** One click handler for the whole page: buttons say what they do in data-action="...". */
function onClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  switch (target.dataset.action) {
    case "tab":
      setTab(target.dataset.tab);
      window.scrollTo({ top: 0 });
      break;
    case "open":
      openTree(target.dataset.id);
      break;
    case "close-dialog":
      closeTree();
      break;
    case "water":
      waterToday(target.dataset.id, target);
      break;
    case "filter":
      state.filter = target.dataset.filter;
      ui.renderTreeList(state.summary, state.filter, state.query);
      break;
    case "clear-filter":
      state.filter = "all";
      state.query = "";
      byId("treeSearch").value = "";
      ui.renderTreeList(state.summary, state.filter, state.query);
      break;
    case "edit":
      showEditForm();
      break;
    case "cancel-edit":
      byId("editBox").hidden = true;
      break;
    case "remove-tree":
      confirmTap(target, "Tap again to remove", removeOpenTree);
      break;
    case "remove-samples":
      confirmTap(target, "Tap again to remove", removeSamples);
      break;
    case "load-samples":
      loadSamples();
      break;
    case "backup":
      downloadBackup();
      break;
    case "csv":
      downloadCsv();
      break;
    case "print-labels":
      printLabels();
      break;
    case "theme":
      cycleTheme();
      break;
    case "go-restore":
      goToRestore();
      break;
    case "dismiss-notice":
      ui.hideNotice();
      break;
  }
}

function bindEvents() {
  document.addEventListener("click", onClick);

  // Clear a field's error message as soon as the user changes it.
  for (const form of document.querySelectorAll("form")) {
    const clearError = (event) => event.target.setCustomValidity?.("");
    form.addEventListener("input", clearError);
    form.addEventListener("change", clearError);
  }
  byId("addForm").addEventListener("submit", onAddTree);
  byId("visitForm").addEventListener("submit", onAddVisit);
  byId("editForm").addEventListener("submit", onEditTree);
  byId("settingsForm").addEventListener("submit", onSaveSettings);
  byId("settingsForm").addEventListener("input", (event) => {
    event.currentTarget.dataset.dirty = "true";
  });
  byId("add-species").addEventListener("change", () => toggleOtherSpecies("add"));
  byId("edit-species").addEventListener("change", () => toggleOtherSpecies("edit"));
  byId("treeSearch").addEventListener("input", (event) => {
    state.query = event.target.value;
    ui.renderTreeList(state.summary, state.filter, state.query);
  });
  byId("device-name").addEventListener("change", (event) => {
    storage.setPref("volunteerName", event.target.value.trim());
    ui.showToast("Name saved on this device.");
  });
  byId("restoreFile").addEventListener("change", onRestoreFile);

  const dialog = byId("treeDialog");
  dialog.addEventListener("close", onDialogClosed);
  // A click on the dark area around the dialog closes it (on phones the dialog fills the screen).
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) closeTree();
  });

  window.addEventListener("hashchange", handleHash);
  window.addEventListener("beforeprint", () => {
    if (state.tab === "labels") renderLabels(state.summary, state.data.settings);
  });
  // A new day may have started while the app was in the background, so the numbers are worked out again.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reload();
  });
  storage.onOtherTabChange(reload);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function start() {
  applyTheme(storage.getPref("theme", "auto"));
  ui.renderStatic();
  bindEvents();

  const name = storage.getPref("volunteerName");
  byId("add-by").value = name;
  byId("device-name").value = name;
  byId("add-date").value = todayString();

  if (!storage.canSave()) {
    ui.showNotice(`<p><b>This browser isn’t letting the tracker save.</b> This often happens in a private or
      incognito window. Open the tracker in a normal window so your records are kept.</p>`);
  }

  state.data = await storage.loadAll();
  render();
  setTab("overview", { updateAddress: false });
  handleHash(); // opens #T-007 (from a QR label) or #guide and so on

  storage.requestPersistence();
  registerServiceWorker();
}

start();
