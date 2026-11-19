/**
 * samples.js: example data so the tracker can be tried before the real plantation is recorded.
 *
 * 12 saplings and 25 visits, the same as in the single-file prototype.
 * Every row is marked sample: true, shows a "Sample" badge, and can be removed in one go.
 *
 * The dates below were written as if today were SAMPLE_TODAY. buildSampleData()
 * moves every date by the same number of days, so the latest visit is always
 * yesterday and the demo always looks current. The result is:
 *   12 planted, 11 alive (91.7%), 4 need water, 2 stressed, 1 dead.
 */
import { addDays, daysBetween } from "./logic.js";

const SAMPLE_TODAY = "2026-10-22";

const SAMPLE_TREES = [
  { id: "sample-T001", num: 1, code: "T-001", species: "Kadamba", spot: "North boundary wall, pit 1", plantedOn: "2026-07-05", plantedBy: "Group A", notes: "" },
  { id: "sample-T002", num: 2, code: "T-002", species: "Karanj", spot: "North boundary wall, pit 2", plantedOn: "2026-07-05", plantedBy: "Group A", notes: "" },
  { id: "sample-T003", num: 3, code: "T-003", species: "Neem", spot: "School gate, left side", plantedOn: "2026-07-05", plantedBy: "Group B", notes: "" },
  { id: "sample-T004", num: 4, code: "T-004", species: "Jamun", spot: "Beside the water tank", plantedOn: "2026-07-12", plantedBy: "Group B", notes: "" },
  { id: "sample-T005", num: 5, code: "T-005", species: "Arjun", spot: "Nala bank, upstream end", plantedOn: "2026-07-12", plantedBy: "Group C", notes: "Planted to hold the nala bank." },
  { id: "sample-T006", num: 6, code: "T-006", species: "Bahava", spot: "Society garden, east corner", plantedOn: "2026-07-12", plantedBy: "Group C", notes: "" },
  { id: "sample-T007", num: 7, code: "T-007", species: "Karvand", spot: "Footpath edge, living fence", plantedOn: "2026-07-19", plantedBy: "Group A", notes: "Thorny hedge protects the path-side saplings." },
  { id: "sample-T008", num: 8, code: "T-008", species: "Neem", spot: "Playground boundary, pit 3", plantedOn: "2026-07-19", plantedBy: "Group B", notes: "" },
  { id: "sample-T009", num: 9, code: "T-009", species: "Kadamba", spot: "Temple road, avenue row", plantedOn: "2026-07-19", plantedBy: "Group C", notes: "" },
  { id: "sample-T010", num: 10, code: "T-010", species: "Vetiver (Khus)", spot: "Slope above the nala, contour line", plantedOn: "2026-07-26", plantedBy: "Group A", notes: "Vetiver slips in a line across the slope against rill erosion." },
  { id: "sample-T011", num: 11, code: "T-011", species: "Karanj", spot: "Parking lot edge", plantedOn: "2026-07-26", plantedBy: "Group B", notes: "No guard yet; vehicles park close." },
  { id: "sample-T012", num: 12, code: "T-012", species: "Jamun", spot: "Garden entrance", plantedOn: "2026-07-26", plantedBy: "Group C", notes: "" },
];

// `time` is when the visit was saved, so two visits on the same day still have an order.
const SAMPLE_VISITS = [
  { id: "sample-V001", treeId: "sample-T001", date: "2026-10-14", time: "07:02", watered: true, health: "healthy", volunteer: "Group A", note: "" },
  { id: "sample-V002", treeId: "sample-T001", date: "2026-10-21", time: "07:04", watered: true, health: "healthy", volunteer: "Group A", note: "Mulch topped up" },
  { id: "sample-V003", treeId: "sample-T002", date: "2026-10-14", time: "07:06", watered: true, health: "healthy", volunteer: "Group A", note: "" },
  { id: "sample-V004", treeId: "sample-T002", date: "2026-10-21", time: "07:08", watered: true, health: "healthy", volunteer: "Group A", note: "" },
  { id: "sample-V005", treeId: "sample-T003", date: "2026-10-14", time: "07:10", watered: true, health: "healthy", volunteer: "Group B", note: "" },
  { id: "sample-V006", treeId: "sample-T003", date: "2026-10-21", time: "07:12", watered: true, health: "healthy", volunteer: "Group B", note: "New leaves" },
  { id: "sample-V007", treeId: "sample-T004", date: "2026-10-10", time: "07:14", watered: true, health: "healthy", volunteer: "Group B", note: "" },
  { id: "sample-V008", treeId: "sample-T004", date: "2026-10-17", time: "07:16", watered: true, health: "healthy", volunteer: "Group B", note: "" },
  { id: "sample-V009", treeId: "sample-T005", date: "2026-10-13", time: "07:18", watered: true, health: "healthy", volunteer: "Group C", note: "" },
  { id: "sample-V010", treeId: "sample-T005", date: "2026-10-20", time: "07:20", watered: true, health: "healthy", volunteer: "Group C", note: "" },
  { id: "sample-V011", treeId: "sample-T006", date: "2026-10-14", time: "07:22", watered: true, health: "stressed", volunteer: "Group C", note: "Yellowing leaves" },
  { id: "sample-V012", treeId: "sample-T006", date: "2026-10-21", time: "07:24", watered: true, health: "stressed", volunteer: "Group C", note: "Termite marks at the collar; added neem cake" },
  { id: "sample-V013", treeId: "sample-T007", date: "2026-10-13", time: "07:26", watered: true, health: "healthy", volunteer: "Group A", note: "" },
  { id: "sample-V014", treeId: "sample-T007", date: "2026-10-20", time: "07:28", watered: true, health: "healthy", volunteer: "Group A", note: "" },
  { id: "sample-V015", treeId: "sample-T008", date: "2026-10-11", time: "07:30", watered: true, health: "healthy", volunteer: "Group B", note: "" },
  { id: "sample-V016", treeId: "sample-T008", date: "2026-10-18", time: "07:32", watered: true, health: "healthy", volunteer: "Group B", note: "" },
  { id: "sample-V017", treeId: "sample-T009", date: "2026-10-09", time: "07:34", watered: true, health: "healthy", volunteer: "Group C", note: "" },
  { id: "sample-V018", treeId: "sample-T009", date: "2026-10-16", time: "07:36", watered: true, health: "stressed", volunteer: "Group C", note: "Basin broken; leaves drooping" },
  { id: "sample-V019", treeId: "sample-T009", date: "2026-10-20", time: "07:38", watered: false, health: "stressed", volunteer: "Group C", note: "Basin rebuilt; no water at the site" },
  { id: "sample-V020", treeId: "sample-T010", date: "2026-10-14", time: "07:40", watered: true, health: "healthy", volunteer: "Group A", note: "" },
  { id: "sample-V021", treeId: "sample-T010", date: "2026-10-21", time: "07:42", watered: true, health: "healthy", volunteer: "Group A", note: "Slips rooted well along the contour" },
  { id: "sample-V022", treeId: "sample-T011", date: "2026-10-08", time: "07:44", watered: true, health: "stressed", volunteer: "Group B", note: "Guard missing" },
  { id: "sample-V023", treeId: "sample-T011", date: "2026-10-15", time: "07:46", watered: false, health: "dead", volunteer: "Group B", note: "Run over by a vehicle" },
  { id: "sample-V024", treeId: "sample-T012", date: "2026-10-12", time: "07:48", watered: true, health: "healthy", volunteer: "Group C", note: "" },
  { id: "sample-V025", treeId: "sample-T012", date: "2026-10-19", time: "07:50", watered: true, health: "healthy", volunteer: "Group C", note: "" },
];

/**
 * Returns { trees, visits } with every date moved so the latest visit is the day before `today`.
 * Example: if today is 2026-11-18, the shift is 27 days, so 2026-10-21 becomes 2026-11-17.
 */
export function buildSampleData(today) {
  const shift = daysBetween(SAMPLE_TODAY, today);

  const trees = SAMPLE_TREES.map((tree) => ({
    ...tree,
    plantedOn: addDays(tree.plantedOn, shift),
    sample: true,
  }));

  const visits = SAMPLE_VISITS.map(({ time, ...visit }) => {
    const date = addDays(visit.date, shift);
    return {
      ...visit,
      date: date,
      at: new Date(`${date}T${time}:00`).toISOString(), // local time on that day
      sample: true,
    };
  });

  return { trees, visits };
}
