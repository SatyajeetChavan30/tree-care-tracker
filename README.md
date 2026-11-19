# Tree Care Tracker

A small web app for recording, watering and monitoring the saplings planted in the
**Soil Protection and Plantation** project (CEP-241-COM, Charholi (Bk), Lohegaon, Pune).
It is the working model for the project report.

**Live site:** https://satyajeetchavan30.github.io/tree-care-tracker/

- Every sapling gets an ID (`T-001`, `T-002`, …) that goes on a label tied to its tree guard.
- Volunteers log visits: watered or not, and health (Healthy, Stressed or Dead).
- The Overview shows the **survival rate** against the Forest Department's **60% success benchmark**,
  the saplings that **need water** (3 or more days dry), recent visits and the species mix.
- **QR labels**: scanning a label with a phone camera opens that sapling, ready to log a visit.
- Works **offline**, can be **installed on a phone** ("Add to Home Screen"), light and dark themes.
- Data is saved in the browser. There is **Download backup (.json)**, **Restore backup** and
  **Download sapling list (.csv)** (opens in Excel or Google Sheets).

It is plain HTML, CSS and JavaScript. There is no framework, no `npm install` and no build step.

---

## What is in this folder

```
index.html              the page: five screens and the sapling pop-up
css/styles.css          the look: colours, phone and desktop layouts, the printed label sheet
js/app.js               starts the app, switches screens, handles every tap and form
js/storage.js           saves and loads the data (the only file that uses localStorage)
js/logic.js             the rules: health, needs water, survival rate, CSV (no page code)
js/ui.js                draws the screens
js/qr.js                QR codes and the A4 label sheet
js/samples.js           12 sample saplings and 25 visits for trying the app
vendor/                 the QR code library (MIT licence) and its licence file
manifest.webmanifest    app name, colours and icons, so phones can install it
sw.js                   the service worker that makes the app work offline
icons/                  app icons (sapling on green)
tests/logic.test.html   open in a browser to check the rules in logic.js
.nojekyll               tells GitHub Pages to publish the files exactly as they are
```

Not needed online: `tree-care-tracker.html` (the first single-file prototype),
`claude-code-prompt-tree-care-tracker.md` and the `.claude` folder. Leave them out when you upload.

---

## 1. Run it on your computer

Open it through a small local web server, not by double-clicking `index.html`.
Browsers block service workers (offline mode) and JavaScript modules on `file://` pages.

**Option A: VS Code "Live Server" (easiest)**

1. In VS Code, open the Extensions panel (Ctrl+Shift+X), search for **Live Server**
   (by Ritwick Dey) and install it.
2. Open this folder in VS Code (File → Open Folder).
3. Right-click `index.html` → **Open with Live Server**. The browser opens `http://127.0.0.1:5500/`.

**Option B: `npx serve` (needs Node.js)**

In a terminal inside this folder, run the command below, then open the address it prints
(usually `http://localhost:3000`):

```bash
npx serve .
```

**Option C: Python**

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

**Run the tests:** open `tests/logic.test.html` on the same server, for example
`http://127.0.0.1:5500/tests/logic.test.html`. It should say **All 33 tests passed.**

**After you edit a file:** the service worker serves the saved copy first, so the change appears
after a second reload. In Chrome you can instead open DevTools (F12) → Application →
Service workers and tick **Update on reload** while you work.

---

## 2. Put it online with GitHub Pages (main option)

1. Sign in at https://github.com (create a free account if you need one).
2. Click **+** (top right) → **New repository**. Name it `tree-care-tracker`, choose **Public**,
   leave "Add a README file" unticked, and click **Create repository**.
3. On the new repository page, click **uploading an existing file**. Drag in everything listed
   under "What is in this folder" above (the folders `css`, `js`, `vendor`, `icons` and `tests`,
   plus `index.html`, `manifest.webmanifest`, `sw.js`, `README.md` and `.nojekyll`).
   Then click **Commit changes**.
4. Check that `.nojekyll` is in the file list. If it is missing, click **Add file → Create new file**,
   type `.nojekyll` as the name, leave it empty and click **Commit changes**.
5. Go to **Settings → Pages**. Under "Build and deployment" set **Source** to
   **Deploy from a branch**, **Branch** to **main** and the folder to **/ (root)**. Click **Save**.
6. Wait a minute or two and refresh the page. The site address appears at the top:
   `https://<your-username>.github.io/tree-care-tracker/`.

**Why `.nojekyll`?** GitHub Pages normally runs a tool called Jekyll over your files. This app
doesn't need it, and the empty `.nojekyll` file tells GitHub to publish the files unchanged.

**Updating the site later:** upload the changed files again (same names replace the old ones).
Before uploading, open `sw.js` and add 1 to `CACHE_VERSION` (for example `1` → `2`), so phones
replace their saved copy of the app.

---

## 3. Put it online with Netlify Drop (fastest option)

1. Open https://app.netlify.com/drop.
2. Drag this whole folder onto the page.
3. After a few seconds Netlify shows an address like `https://something-random-123.netlify.app`.

Without an account the site is only temporary. Sign up (free) and claim the site to keep it, and
you can rename it in **Site configuration → Change site name**.

Choose your final address (GitHub Pages or Netlify) **before you print the QR labels**, because
the labels contain that address.

---

## 4. Install it on a phone

1. Open the live address on the phone, with internet the first time.
2. **Android (Chrome):** tap the menu ⋮ → **Install app** (or **Add to Home screen**).
   **iPhone (Safari):** tap the Share button → **Add to Home Screen**.
3. The Tree Care Tracker icon appears on the home screen and opens like an app.
   After the first visit it works without internet, which helps at planting sites with no signal.

---

## 5. QR labels

Each label's QR code holds the tracker's address with the sapling ID at the end, for example
`https://<your-username>.github.io/tree-care-tracker/#T-007`. When the app opens with
`#T-007` at the end, it goes straight to sapling T-007.

To print the labels:

1. Open the **live** site (not `localhost`). If the page shows "Phones in the field can't open this
   address", you are on a local address.
2. Go to **QR labels** → **Print labels**.
3. Choose A4 paper and keep the scale at **100%** (not "Fit to page"). Each page holds 12 labels
   (3 × 4), and each label is 63 × 68 mm.
4. Cut along the dashed lines, cover each label with clear tape or laminate it, and tie it to the
   tree guard.

Scanning: open the phone's camera, point it at the label and tap the link that appears.

**Important: each device keeps its own data.** The tracker saves records in the browser of the
device you use. A phone can only show T-007 if T-007 is saved on that phone. For a team:

- Keep one main device (for example the coordinator's phone) where saplings are added.
- To copy the record to another phone: **Guide → Download backup**, send the `.json` file
  (WhatsApp, email, Google Drive), then on the other phone open the tracker and use
  **Guide → Restore backup**. Restoring replaces what was on that phone.
- Phase 2 (below) would put the data online so everyone shares it automatically.

---

## 6. Before you record the real plantation

1. Tap **Remove sample data** (in the banner or in the Guide), then tap again to confirm.
2. In **Guide → Project details**, check the project name and site, set the **target number of
   saplings**, and save.
3. Enter **Your name on this device** so it is filled in when you log visits.
4. Add the saplings in planting order, so the IDs match the labels you write or print.
5. Download a backup every week and keep it somewhere safe (for example Google Drive).
   Clearing the browser's data, or losing the phone, deletes the records on that device.

---

## 7. How it works (for the viva)

### Architecture

```
index.html ─ loads ─► js/app.js        handles taps, forms, screens and #T-007 links
                         │
                         ├─► js/storage.js  saves and loads (localStorage); backup and restore
                         ├─► js/logic.js    pure rules: health, needs water, survival rate, CSV
                         ├─► js/ui.js       draws the screens from the summary
                         ├─► js/qr.js       QR codes and label sheet (uses vendor/qrcode-generator)
                         └─► js/samples.js  sample data

sw.js                     service worker: keeps a copy of the app for offline use
manifest.webmanifest      name, colours and icons: lets phones install the app
```

Every action follows the same cycle:

> the user taps or submits → `storage.js` saves → the data is loaded again →
> `logic.summarize()` works out the numbers → `ui.js` redraws the screens

The files are **ES modules**: each one `export`s its functions, and others `import` them.
`logic.js` has no page code at all, which is why it can be tested on its own.
`storage.js` is the only file that touches `localStorage`, so the storage could be changed
(for example to an online database) without touching the rest.

### Data model

| Record   | Fields |
| -------- | ------ |
| Sapling  | `id` (random), `num` (1, 2, 3 …), `code` ("T-001"), `species`, `spot` (planting spot), `plantedOn` (YYYY-MM-DD), `plantedBy`, `notes`, `sample` (true for sample rows) |
| Visit    | `id`, `treeId` (which sapling), `date` (YYYY-MM-DD), `at` (exact time saved), `watered` (true/false), `health` ("healthy", "stressed" or "dead"), `volunteer`, `note`, `sample` |
| Settings | `projectName` (default "Soil Protection and Plantation"), `site` (default "Charholi (Bk), Lohegaon, Pune"), `target` (number of saplings, optional) |

In the code a sapling record is called a `tree`, matching `treeId` and the table names planned for phase 2.

### The rules (in `js/logic.js`, checked by `tests/logic.test.html`)

- **Health** = the health recorded at the sapling's latest visit (sorted by date, then by time).
  A sapling with no visits counts as Healthy.
- **Last watered** = the date of the latest visit with "Watered". The planting date counts as the
  first watering.
- **Needs water** = not dead, and 3 or more days since it was last watered.
- **Survival rate (%)** = saplings alive ÷ saplings planted × 100, shown to one decimal place.
  "Alive" means Healthy or Stressed. It is compared with the Forest Department's 60% benchmark.
  Example with the sample data: 11 alive ÷ 12 planted × 100 = **91.7%**, above the benchmark.
- **IDs**: the next sapling gets the highest number in use + 1, written as `T-` and three digits.

### Offline and installable (PWA)

- A **Progressive Web App** is a website that can be installed and can work offline. It needs a
  manifest, icons, a service worker and https (GitHub Pages and Netlify give https for free).
- **`manifest.webmanifest`** gives the app's name, colours and icons, so phones offer
  "Install app" / "Add to Home Screen".
- **`sw.js`** is a service worker, a script the browser runs in the background between the page
  and the network:
  1. **install**: it saves every file of the app (the "app shell") in a cache;
  2. **activate**: it deletes caches from older versions;
  3. **fetch**: it answers each request from the cache straight away, and quietly downloads a
     fresh copy for next time (called *stale-while-revalidate*).
- The **records** live in `localStorage`, which works with or without internet. The app also asks
  the browser to keep this storage even when the phone is low on space (`navigator.storage.persist()`).

### Safety and quality

- Text typed by people is "escaped" before it is shown, so typing `<script>` into a note can't
  break or attack the page.
- Restored backups are checked and cleaned row by row (`cleanData` in `logic.js`) before use.
- Deleting asks for a second tap ("Tap again to remove") instead of a pop-up.
- The rules are tested in `tests/logic.test.html` (33 checks, including the sample data giving
  91.7%, 4 saplings needing water, 2 stressed and 1 dead).
- Built for phones first: it works from 360 px wide, uses large buttons and high-contrast colours
  for sunlight, shows a clear keyboard focus ring, and follows the phone's light or dark setting.
  The theme button can force light mode in bright sun.

### Limits

- Each device has its own copy of the data. Use backups to move it (see section 5).
- Browsers give a site about 5 MB of `localStorage`. One visit takes about 250 bytes, so there is
  room for well over 10,000 visits.
- Clearing the browser's data deletes the records, so keep backups.

---

## 8. Third-party code and licences

- **qrcode-generator 2.0.4** by Kazuhiko Arase, MIT licence. It is saved in
  `vendor/qrcode-generator/` together with its `LICENSE`, so nothing is loaded from the internet at
  run time. See `vendor/README.md` for where it came from.
- The word "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
- The icons were drawn for this project.

---

## 9. Optional phase 2: shared data (not built)

At the moment each phone keeps its own records. Phase 2 would add `js/storage-supabase.js`, using
Supabase's free tier, so all volunteers see the same data. It would switch on only when a
`config.js` file contains a Supabase URL and anon key, and otherwise keep using localStorage.
It needs a Supabase account, a database with `trees`, `visits` and `settings` tables and
row-level security rules, and internet for sharing. Because the rest of the app only talks to the
functions in `storage.js`, a second storage file with the same functions can replace it.
