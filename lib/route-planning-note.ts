/** Shared copy for the Planning note, Routes panel, and driver.js tour. */
export const ROUTE_PLANNING_NOTE_TITLE = 'How route planning works';

export const ROUTE_PLANNING_NOTE =
  'Each night the ERP import matches customers to the rep with the same sales code, then books weekday visits for the next four weeks. Each day stays in one nearby area (about 40 km), up to 10 clients, in driving order. A fuller area continues the next day before a farther area starts. Clients who already have a visit from today through that window stay as they are. Clients without a map address are skipped. All tasks includes those upcoming days. Open Routes and pick the day the visits were planned.';

export const ROUTE_PLANNING_EMPTY =
  'No routes for this day. Pick the day the visits were planned. Each rep needs a branch with coordinates, and that day’s stops are saved as one route.';
