/**
 * qr.js: QR codes and the printable label sheet.
 *
 * Every label's QR code holds a link like  https://<your-site>/#T-007
 * Opening that link shows sapling T-007, because app.js reads the part after "#".
 * So a volunteer scans the label on the tree guard and can log a visit at once.
 *
 * The QR maths (error correction, masks and so on) comes from the
 * qrcode-generator library in vendor/ (MIT licence). We only ask it which
 * squares are dark and draw them ourselves as one SVG shape. SVG is a vector
 * format, so it prints sharp at any size.
 */
import qrcode from "../vendor/qrcode-generator/qrcode-esm.js";
import { escapeHtml, plural } from "./ui.js";

// Q = about 25% of the code can be dirty, wet or scratched and it still scans.
const ERROR_CORRECTION = "Q";

// The empty border around a QR code, in squares. Scanners need it; the QR standard asks for 4.
const QUIET_ZONE = 4;

// One A4 page holds 3 columns × 4 rows of labels (see @media print in styles.css).
const LABELS_PER_PAGE = 12;

// Drawing a QR code takes a moment, so each one is kept after it is drawn once.
const svgCache = new Map();

/** Returns an <svg> QR code for `text`. `title` is read out by screen readers. */
export function qrSvg(text, title) {
  const cacheKey = text + "\n" + title;
  if (svgCache.has(cacheKey)) return svgCache.get(cacheKey);

  const code = qrcode(0, ERROR_CORRECTION); // 0 = use the smallest QR size that fits the text
  code.addData(text);
  code.make();

  const count = code.getModuleCount(); // squares per side, e.g. 37
  const size = count + QUIET_ZONE * 2;
  let path = "";
  for (let row = 0; row < count; row += 1) {
    let col = 0;
    while (col < count) {
      if (!code.isDark(row, col)) {
        col += 1;
        continue;
      }
      // Join dark squares that sit next to each other in a row into one rectangle.
      let run = 1;
      while (col + run < count && code.isDark(row, col + run)) run += 1;
      path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h${run}v1h-${run}z`;
      col += run;
    }
  }

  const svg =
    `<svg class="label-qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeHtml(title)}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  svgCache.set(cacheKey, svg);
  return svg;
}

/** The address of this page without anything after "#" (and without "index.html"). */
export function pageBaseUrl() {
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/index\.html$/, "");
  return url.href;
}

/** The link stored in a label: base address + "#" + ID. */
export function labelLink(baseUrl, code) {
  return baseUrl + "#" + encodeURIComponent(code);
}

/**
 * True when the address only works on this computer or this Wi-Fi network
 * (a file, localhost or a home-network address), so phones in the field couldn't open it.
 */
export function isLocalAddress(href) {
  const { protocol, hostname } = new URL(href);
  if (protocol === "file:") return true;
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "[::1]") return true;
  if (hostname.endsWith(".local")) return true;
  return /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
}

function labelHtml(tree, baseUrl, settings) {
  const link = labelLink(baseUrl, tree.code);
  return `<figure class="label">
    ${qrSvg(link, `QR code for sapling ${tree.code}`)}
    <figcaption>
      <span class="label-id">${escapeHtml(tree.code)}</span>
      <span class="label-species">${escapeHtml(tree.species)}</span>
      <span class="label-spot">${escapeHtml(tree.spot)}</span>
      <span class="label-scan">Scan to log a visit · ${escapeHtml(settings.projectName)}</span>
    </figcaption>
  </figure>`;
}

/** Draws the QR labels screen: the address the labels use, a warning if needed, and the sheet. */
export function renderLabels(summary, settings) {
  const baseUrl = pageBaseUrl();
  const isLocal = isLocalAddress(baseUrl);
  document.getElementById("labelsBase").textContent = baseUrl;
  document.getElementById("labelsCount").textContent = summary.planted
    ? `${summary.planted} ${plural(summary.planted, "label")}`
    : "";
  document.getElementById("printLabels").disabled = summary.planted === 0;

  const warning = document.getElementById("labelsWarning");
  warning.hidden = !isLocal;
  if (isLocal) {
    warning.innerHTML =
      `<b>Phones in the field can’t open this address.</b> It only works on this computer or network. ` +
      `Open the tracker from its live address (for example <code>https://your-name.github.io/tree-care-tracker/</code>) ` +
      `and print the labels from there.`;
  }

  const sheet = document.getElementById("labelSheet");
  if (summary.planted === 0) {
    sheet.innerHTML = `<p class="empty">Add saplings first. Each one gets a label here.</p>`;
    return;
  }

  // Group the labels into pages of 12, so every printed page is full and nothing is cut in half.
  const pages = [];
  for (let start = 0; start < summary.trees.length; start += LABELS_PER_PAGE) {
    const trees = summary.trees.slice(start, start + LABELS_PER_PAGE);
    pages.push(`<div class="label-page">${trees.map((tree) => labelHtml(tree, baseUrl, settings)).join("")}</div>`);
  }
  sheet.innerHTML = pages.join("");
}
