/**
 * ui.js: draws the screens.
 *
 * Each render function takes the summary made by logic.summarize() and fills in
 * one part of index.html. These functions only draw: they never save anything.
 * Clicks and forms are handled in app.js.
 *
 * Safety: names, notes and any other text typed by people go through
 * escapeHtml() before they are put into the page. Typing "<script>" into a
 * note therefore shows those characters instead of running code.
 */
import { HEALTH_LABELS, SUCCESS_BENCHMARK, daysBetween, formatPercent, parseTreeCode } from "./logic.js";

/** Native species suited to Pune's soil and rainfall (from the project report). */
export const SPECIES = [
  { name: "Kadamba", botanical: "Neolamarckia cadamba", why: "Fast-growing shade tree; flowers attract pollinators" },
  { name: "Karanj", botanical: "Pongamia pinnata", why: "Hardy, drought-tolerant legume; dense roots bind soil" },
  { name: "Neem", botanical: "Azadirachta indica", why: "Very drought-hardy; grows in poor soil" },
  { name: "Jamun", botanical: "Syzygium cumini", why: "Fruit for birds and people; tolerates waterlogging" },
  { name: "Arjun", botanical: "Terminalia arjuna", why: "Strong roots stabilise the banks of streams and drains" },
  { name: "Bahava", botanical: "Cassia fistula", why: "Drought-tolerant; bright yellow flowers" },
  { name: "Karvand", botanical: "Carissa carandas", why: "Thorny native shrub; living fence that protects saplings" },
  { name: "Vetiver (Khus)", botanical: "Chrysopogon zizanioides", why: "Grass with roots 3–4 m deep for slopes and drain edges" },
];

/** The value of "Other…" in the species dropdowns. */
export const OTHER_SPECIES = "__other";

const HEALTH_ICONS = { healthy: "check", stressed: "alert", dead: "dead" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const THEME_NAMES = { auto: "Auto", light: "Light", dark: "Dark" };

const byId = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Makes text safe to put inside HTML. */
export function escapeHtml(value) {
  const replacements = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (character) => replacements[character]);
}

/** plural(1, "sapling") is "sapling"; plural(2, "sapling") is "saplings". */
export function plural(count, one, many = one + "s") {
  return count === 1 ? one : many;
}

/** An icon from the sprite at the top of index.html. */
export function icon(name) {
  return `<svg class="ic" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}

/** "2026-11-18" becomes "18 Nov", or "18 Nov 2025" for another year (or when withYear is true). */
export function formatDate(dateText, today, withYear = false) {
  if (!dateText) return "—";
  const [year, month, day] = dateText.split("-").map(Number);
  const showYear = withYear || dateText.slice(0, 4) !== today.slice(0, 4);
  return `${day} ${MONTHS[month - 1]}${showYear ? " " + year : ""}`;
}

/** "today", "yesterday" or "5 days ago". */
export function relativeDay(dateText, today) {
  const days = daysBetween(dateText, today);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function healthChip(health) {
  return `<span class="chip chip-${health}">${icon(HEALTH_ICONS[health])}${HEALTH_LABELS[health]}</span>`;
}

/** "Dry 5 days" or "Watered yesterday" (nothing for dead saplings). */
function waterChip(tree, today) {
  if (tree.health === "dead" || tree.daysDry === null) return "";
  if (tree.needsWater) return `<span class="chip chip-dry">${icon("drop")}Dry ${tree.daysDry} days</span>`;
  return `<span class="chip chip-wet">${icon("drop")}Watered ${relativeDay(tree.lastWatered, today)}</span>`;
}

function visitWaterChip(visit) {
  return visit.watered
    ? `<span class="chip chip-wet">${icon("drop")}Watered</span>`
    : `<span class="chip chip-plain">${icon("nowater")}Not watered</span>`;
}

function sampleBadge(row) {
  return row.sample ? `<span class="badge-sample">Sample</span>` : "";
}

function emptyItem(text) {
  return `<li class="empty">${escapeHtml(text)}</li>`;
}

/** "Volunteer · note" line under a visit, if there is anything to show. */
function visitMeta(visit) {
  const parts = [visit.volunteer, visit.note].filter(Boolean).map(escapeHtml);
  return parts.length ? `<p class="visit-note">${parts.join(" · ")}</p>` : "";
}

// ---------------------------------------------------------------------------
// Things drawn once at start-up
// ---------------------------------------------------------------------------

/** Fills the species dropdowns and the native species table. */
export function renderStatic() {
  const options =
    SPECIES.map((species) => `<option value="${escapeHtml(species.name)}">${escapeHtml(species.name)}</option>`).join("") +
    `<option value="${OTHER_SPECIES}">Other…</option>`;
  byId("add-species").innerHTML = `<option value="" disabled selected>Choose a species</option>` + options;
  byId("edit-species").innerHTML = options;
  byId("speciesTable").innerHTML = SPECIES.map(
    (species) =>
      `<tr><td>${escapeHtml(species.name)}</td><td><i>${escapeHtml(species.botanical)}</i></td><td>${escapeHtml(species.why)}</td></tr>`,
  ).join("");
}

// ---------------------------------------------------------------------------
// Header, tabs, banners, messages
// ---------------------------------------------------------------------------

export function renderHeader(settings) {
  byId("siteLine").textContent = [settings.projectName, settings.site].filter(Boolean).join(" · ");
}

export function renderThemeButton(theme) {
  byId("themeLabel").textContent = `Theme: ${THEME_NAMES[theme] || "Auto"}`;
  byId("themeButton").title =
    theme === "auto" ? "Colours follow this device's setting. Tap to change." : "Tap to change the colours.";
}

/** Shows one screen and marks its tab as the current one. */
export function showTab(tab, allTabs) {
  for (const name of allTabs) byId("view-" + name).hidden = name !== tab;
  for (const button of document.querySelectorAll(".tab")) {
    if (button.dataset.tab === tab) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  }
}

export function renderSampleBanner(summary) {
  const hasSamples = summary.sampleTrees + summary.sampleVisits > 0;
  byId("sampleBanner").hidden = !hasSamples;
  byId("sampleTools").hidden = !hasSamples;
  if (hasSamples) {
    byId("sampleText").innerHTML =
      `<b>Sample data.</b> The ${summary.sampleTrees} ${plural(summary.sampleTrees, "sapling")} and ` +
      `${summary.sampleVisits} ${plural(summary.sampleVisits, "visit")} marked Sample are examples so you can try the tracker. ` +
      `Remove them before you record your own plantation.`;
  }
}

/** A message that stays until it is closed (html must already be escaped). */
export function showNotice(html) {
  const notice = byId("notice");
  notice.innerHTML = html;
  notice.hidden = false;
}

export function hideNotice() {
  byId("notice").hidden = true;
}

let toastTimer = 0;

/** A short message at the bottom of the screen that disappears by itself. */
export function showToast(message) {
  const toast = byId("toast");
  const dialog = byId("treeDialog");
  // An open dialog sits above everything else, so the toast moves inside it to stay visible.
  const host = dialog.open ? dialog : document.body;
  if (toast.parentElement !== host) host.append(toast);
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3500);
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export function renderOverview(summary, settings) {
  renderHero(summary);
  renderKpis(summary, settings);
  renderWaterList(summary);
  renderHealth(summary);
  renderRecentVisits(summary);
  renderSpecies(summary);
}

/** The bar under the survival rate, with the 60% benchmark marked on it. */
function meterHtml(rate) {
  const width = rate === null ? 0 : Math.max(0, Math.min(100, rate));
  const label =
    rate === null ? "No survival data yet" : `Survival ${formatPercent(rate)} against a ${SUCCESS_BENCHMARK}% benchmark`;
  return `<div class="meter" role="img" aria-label="${escapeHtml(label)}">
      <div class="meter-track"><div class="meter-fill" style="width:${width}%"></div></div>
      <div class="meter-mark" style="left:${SUCCESS_BENCHMARK}%"><span>${SUCCESS_BENCHMARK}% benchmark</span></div>
      <div class="meter-scale"><span>0%</span><span>100%</span></div>
    </div>`;
}

function renderHero(summary) {
  const hero = byId("heroPanel");
  const formula = `<p class="formula">Survival rate = alive ÷ planted × 100</p>`;
  if (summary.planted === 0) {
    hero.innerHTML = `
      <p class="eyebrow">Survival rate</p>
      <p class="big is-empty">—</p>
      <p class="hero-caption">Add your first sapling to start tracking how many survive.</p>
      ${meterHtml(null)}
      <div class="btn-row">
        <button class="btn btn-primary" type="button" data-action="tab" data-tab="add">${icon("add")}Add a sapling</button>
        <button class="btn btn-ghost" type="button" data-action="load-samples">Load sample data</button>
      </div>
      ${formula}`;
    return;
  }
  const rate = summary.survivalRate;
  const verdict = summary.meetsBenchmark
    ? `Meets the Forest Department’s ${SUCCESS_BENCHMARK}% success benchmark`
    : `Below the Forest Department’s ${SUCCESS_BENCHMARK}% success benchmark. Water and protect the saplings at risk.`;
  hero.innerHTML = `
    <p class="eyebrow">Survival rate</p>
    <p class="big">${rate.toFixed(1)}<small>%</small></p>
    <p class="hero-caption"><b>${summary.alive} of ${summary.planted}</b> ${plural(summary.planted, "sapling")} alive</p>
    ${meterHtml(rate)}
    <p class="bench ${summary.meetsBenchmark ? "is-ok" : "is-low"}">${icon(summary.meetsBenchmark ? "check" : "alert")}<span>${verdict}</span></p>
    ${formula}`;
}

function renderKpis(summary, settings) {
  const tile = (number, label, note, iconName) =>
    `<div class="kpi"><span class="kpi-num">${number}</span>` +
    `<span class="kpi-label">${iconName ? icon(iconName) : ""}${label}</span>` +
    `<span class="kpi-note">${note}</span></div>`;
  const plantedNote = settings.target > 0 ? `of ${settings.target} target` : plural(summary.planted, "sapling");
  byId("kpis").innerHTML =
    tile(summary.planted, "Planted", plantedNote) +
    tile(summary.needWater.length, "Need water", "3+ days dry", "drop") +
    tile(summary.visitsLast7Days, "Visits", "last 7 days");
}

function renderWaterList(summary) {
  const list = byId("waterList");
  if (summary.planted === 0) {
    list.innerHTML = emptyItem("Saplings that go 3 days without water will show up here.");
    return;
  }
  if (summary.needWater.length === 0) {
    list.innerHTML = emptyItem("Every living sapling was watered in the last 3 days.");
    return;
  }
  list.innerHTML = summary.needWater
    .map(
      (tree) => `
      <li class="water-row">
        <button class="water-tag" type="button" data-action="open" data-id="${escapeHtml(tree.id)}"
          data-focus-key="water-${escapeHtml(tree.id)}" aria-label="Open ${escapeHtml(tree.code)}">${escapeHtml(tree.code)}</button>
        <div class="water-meta">
          <b>${escapeHtml(tree.species)}</b>
          <span class="spot">${escapeHtml(tree.spot)}</span>
          <span class="dry">${icon("drop")}Dry for ${tree.daysDry} days</span>
        </div>
        <button class="btn btn-water btn-sm" type="button" data-action="water" data-id="${escapeHtml(tree.id)}"
          aria-label="Mark ${escapeHtml(tree.code)} as watered today">${icon("drop")}Watered</button>
      </li>`,
    )
    .join("");
}

function renderHealth(summary) {
  const body = byId("healthBody");
  if (summary.planted === 0) {
    body.innerHTML = `<p class="empty">Health shows up once saplings are added.</p>`;
    return;
  }
  const parts = [
    ["healthy", summary.healthy],
    ["stressed", summary.stressed],
    ["dead", summary.dead],
  ];
  const percentOf = (count) => Math.round((count / summary.planted) * 100) + "%";
  const description = parts.map(([state, count]) => `${HEALTH_LABELS[state]} ${count}`).join(", ");

  const bar = parts
    .filter(([, count]) => count > 0)
    .map(([state, count]) => `<span class="seg seg-${state}" style="flex:${count} 1 0"></span>`)
    .join("");
  const legend = parts
    .map(
      ([state, count]) =>
        `<li><span class="swatch swatch-${state}"></span><span>${HEALTH_LABELS[state]}</span>` +
        `<b class="num">${count}</b><span class="num pct">${percentOf(count)}</span></li>`,
    )
    .join("");

  let attention = `<p class="note-ok">${icon("check")}No stressed or dead saplings.</p>`;
  if (summary.needAttention.length > 0) {
    const rows = summary.needAttention
      .map((tree) => {
        const latestNote = tree.visits[0] && tree.visits[0].note;
        return `<li><button class="attention-row" type="button" data-action="open" data-id="${escapeHtml(tree.id)}"
            data-focus-key="attention-${escapeHtml(tree.id)}">
            <span class="mini-id">${escapeHtml(tree.code)}</span>
            <span class="attention-main"><b>${escapeHtml(tree.species)}</b>${latestNote ? `<span>${escapeHtml(latestNote)}</span>` : ""}</span>
            ${healthChip(tree.health)}
          </button></li>`;
      })
      .join("");
    attention = `<div class="attention"><p class="eyebrow">Needs attention</p><ul>${rows}</ul></div>`;
  }

  body.innerHTML = `
    <div class="stack" role="img" aria-label="${escapeHtml(description)}">${bar}</div>
    <ul class="legend">${legend}</ul>
    ${attention}`;
}

function renderRecentVisits(summary) {
  const list = byId("recentList");
  if (summary.recentVisits.length === 0) {
    list.innerHTML = emptyItem(
      summary.planted ? "Visits you log will appear here." : "Visits appear here once saplings are added and checked.",
    );
    return;
  }
  list.innerHTML = summary.recentVisits
    .map(
      (visit) => `
      <li class="visit-row">
        <span class="date-col">${formatDate(visit.date, summary.today)}</span>
        <div class="visit-main">
          <button class="visit-link" type="button" data-action="open" data-id="${escapeHtml(visit.tree.id)}"
            data-focus-key="recent-${escapeHtml(visit.id)}">
            <span class="mini-id">${escapeHtml(visit.tree.code)}</span><span class="visit-name">${escapeHtml(visit.tree.species)}</span>
          </button>
          <div class="chips small">${visitWaterChip(visit)}${healthChip(visit.health)}</div>
          ${visitMeta(visit)}
        </div>
      </li>`,
    )
    .join("");
}

function renderSpecies(summary) {
  const body = byId("speciesBody");
  byId("speciesHint").textContent = summary.species.length
    ? `${summary.species.length} ${plural(summary.species.length, "species", "species")}`
    : "";
  if (summary.species.length === 0) {
    body.innerHTML = `<p class="empty">The species mix shows up once saplings are added.</p>`;
    return;
  }
  const most = Math.max(...summary.species.map((species) => species.planted));
  body.innerHTML = `<ul class="bars">${summary.species
    .map(
      (species) => `
      <li>
        <span class="bar-label">${escapeHtml(species.name)}</span>
        <span class="bar-track" role="img" aria-label="${escapeHtml(`${species.name}: ${species.planted} planted, ${species.alive} alive`)}">
          <span class="bar-fill" style="width:${(species.planted / most) * 100}%"></span>
        </span>
        <span class="bar-value num">${species.planted}</span>
      </li>`,
    )
    .join("")}</ul>`;
}

// ---------------------------------------------------------------------------
// Saplings list
// ---------------------------------------------------------------------------

function treeCard(tree, today) {
  return `<button class="tree-card${tree.health === "dead" ? " is-dead" : ""}" type="button" data-action="open"
      data-id="${escapeHtml(tree.id)}" data-focus-key="card-${escapeHtml(tree.id)}">
    <span class="tree-card-stub" aria-hidden="true"><span class="tag-id">${escapeHtml(tree.code)}</span></span>
    <span class="tree-card-body">
      <span class="sr-only">${escapeHtml(tree.code)}, </span>
      <span class="tree-card-top"><span class="tree-species">${escapeHtml(tree.species)}</span>${sampleBadge(tree)}</span>
      <span class="tree-spot">${escapeHtml(tree.spot)}</span>
      <span class="chips">${healthChip(tree.health)}${waterChip(tree, today)}</span>
    </span>
  </button>`;
}

/** True if the sapling matches what was typed in the search box. */
function matchesSearch(tree, query) {
  const words = query.trim().toLowerCase();
  if (!words) return true;
  // "T-4", "t4" or just "4" also find T-004.
  const number = parseTreeCode(words) ?? (/^\d{1,5}$/.test(words) ? Number(words) : null);
  if (number !== null && tree.num === number) return true;
  return [tree.code, tree.species, tree.spot, tree.plantedBy].some((text) => text.toLowerCase().includes(words));
}

export function renderTreeList(summary, filter, query) {
  const counts = {
    all: summary.planted,
    water: summary.needWater.length,
    stressed: summary.stressed,
    dead: summary.dead,
  };
  for (const button of document.querySelectorAll("[data-filter]")) {
    button.querySelector(".count").textContent = counts[button.dataset.filter];
    button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
  }

  let trees = summary.trees;
  if (filter === "water") trees = trees.filter((tree) => tree.needsWater);
  else if (filter === "stressed") trees = trees.filter((tree) => tree.health === "stressed");
  else if (filter === "dead") trees = trees.filter((tree) => tree.health === "dead");
  trees = trees.filter((tree) => matchesSearch(tree, query));

  const grid = byId("treeGrid");
  if (summary.planted === 0) {
    grid.innerHTML = `<div class="empty empty-big">${icon("sprout")}<b>No saplings yet</b>
      <span>Each sapling you add appears here as a numbered tag, with its health and last watering.</span>
      <span class="btn-row">
        <button class="btn btn-primary" type="button" data-action="tab" data-tab="add">${icon("add")}Add a sapling</button>
        <button class="btn btn-ghost" type="button" data-action="load-samples">Load sample data</button>
      </span></div>`;
  } else if (trees.length === 0) {
    grid.innerHTML = `<div class="empty">No saplings match.
      <button class="linklike" type="button" data-action="clear-filter">Show all saplings</button></div>`;
  } else {
    grid.innerHTML = trees.map((tree) => treeCard(tree, summary.today)).join("");
  }
}

// ---------------------------------------------------------------------------
// Add sapling and Guide
// ---------------------------------------------------------------------------

export function renderAddView(summary) {
  byId("nextId").textContent = summary.nextCode;
  byId("add-date").max = summary.today; // no planting dates in the future
}

export function renderGuide(summary, settings) {
  // Don't overwrite the project details while someone is typing in them.
  if (byId("settingsForm").dataset.dirty !== "true") {
    byId("settings-name").value = settings.projectName;
    byId("settings-site").value = settings.site;
    byId("settings-target").value = settings.target > 0 ? String(settings.target) : "";
  }
  byId("loadSamplesGuide").hidden = summary.planted > 0;
}

// ---------------------------------------------------------------------------
// One sapling (the dialog)
// ---------------------------------------------------------------------------

export function renderTreeDialog(tree, summary) {
  const today = summary.today;
  byId("detailId").textContent = tree.code;
  byId("detailTitle").textContent = tree.species;
  byId("detailSpot").textContent = tree.spot;
  byId("detailStatus").innerHTML = healthChip(tree.health) + waterChip(tree, today) + sampleBadge(tree);

  const facts = [
    ["Planted", tree.plantedOn ? formatDate(tree.plantedOn, today, true) : "—"],
    ["Age", tree.ageDays === null ? "—" : `${tree.ageDays} ${plural(tree.ageDays, "day")}`],
    ["Planted by", tree.plantedBy || "—"],
    ["Last watered", tree.lastWatered ? `${formatDate(tree.lastWatered, today)} (${relativeDay(tree.lastWatered, today)})` : "—"],
    ["Visits", String(tree.visits.length)],
    ["Health", HEALTH_LABELS[tree.health]],
  ];
  byId("detailFacts").innerHTML =
    facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("") +
    (tree.notes ? `<div class="wide"><dt>Notes</dt><dd class="plain">${escapeHtml(tree.notes)}</dd></div>` : "");

  const rows = tree.visits.map(
    (visit) => `<li>
      <span class="date-col">${formatDate(visit.date, today)}</span>
      <div><div class="chips small">${visitWaterChip(visit)}${healthChip(visit.health)}</div>${visitMeta(visit)}</div>
    </li>`,
  );
  if (tree.plantedOn) {
    rows.push(`<li>
      <span class="date-col">${formatDate(tree.plantedOn, today)}</span>
      <div><div class="chips small"><span class="chip chip-planted">${icon("sprout")}Planted</span></div>
      ${tree.plantedBy ? `<p class="visit-note">${escapeHtml(tree.plantedBy)}</p>` : ""}</div>
    </li>`);
  }
  byId("detailHistory").innerHTML = rows.length ? rows.join("") : emptyItem("No visits logged yet.");

  // A visit can't be before planting or in the future.
  const dateInput = byId("visit-date");
  dateInput.min = tree.plantedOn || "";
  dateInput.max = today;
}
