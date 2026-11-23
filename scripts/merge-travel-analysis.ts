/**
 * Merge the October travel workbook and the November visits PDF into one
 * editable workbook. Area names come from the staff-card analysis helpers.
 *
 * Run from web/: npx tsx scripts/merge-travel-analysis.ts
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {
  clusterCommonAreas,
  formatHoursMinutes,
  normalizeStopArea,
} from '@/lib/travel-analysis/build-travel-analysis-document';
import type { TravelAnalysisStopRow } from '@/lib/travel-analysis/travel-analysis-types';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx') as typeof import('xlsx');

const ROOT = path.resolve(import.meta.dirname, '../..');
const TRAVEL_XLSX = path.join(ROOT, 'travel-report-2026-10-12-to-2026-10-17.xlsx');
const VISITS_PDF = path.join(ROOT, 'loro-visits.pdf');
const OUT_XLSX = path.join(ROOT, 'travel-analysis-merged.xlsx');
const PDFJS_DIR = '/tmp/pdfjs-tool/node_modules';

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const WORD = new Set(
  `a an the and or of to for from with on in at by as is are was were be been being it its this that they them their have has had will would can could should not but if then so than too very just about into over after before up down out our your you we he she his her client clients visit visited visiting order next steel board boards need needs price prices follow quote them make send still waiting enough import collect branch boss form credit delivery stock project call calls they have about used cement fiber fibre also only when what who how all any some more most other again here there where which while did done get got give let know come came going go see saw look take took want wanted yet already must may might no yes ok my me do does doing him his place an order on our main house home construction glass tile industry storage bazaar cash carry furniture electrical plumbing centre center projects resort sand mart bath mica materials building`
    .split(/\s+/)
    .filter((word) => word.length > 0),
);

type PdfItem = { x: number; y: number; width: number; text: string };

type Visit = {
  rep: string;
  ymd: string;
  hm: string;
  week: string;
  method: string;
  siteName: string;
  clientKey: string;
  area: string;
  minutes: number;
  place: string;
  lat: number | null;
  lng: number | null;
  notes: string;
  branch: string;
  source: string;
  physical: boolean;
  address: string;
};

type HomeRow = { rep: string; label: string; lat: number | null; lng: number | null };

const COL_X: Array<[string, number]> = [
  ['rep', 25],
  ['when', 57],
  ['place', 89],
  ['method', 121],
  ['building', 153],
  ['contactMade', 185],
  ['company', 217],
  ['business', 250],
  ['position', 282],
  ['contact', 314],
  ['image', 346],
  ['cell', 378],
  ['landline', 410],
  ['email', 442],
  ['address', 474],
  ['meeting', 506],
  ['notes', 538],
  ['resolution', 570],
  ['followUp', 602],
  ['quote', 634],
  ['quoteStatus', 667],
  ['value', 699],
  ['lead', 731],
  ['client', 763],
  ['branch', 795],
];

function repName(raw: string): string {
  const head = raw.split('|')[0] ?? raw;
  return head.replace(/\s+/g, ' ').trim();
}

function blank(value: string | number | null | undefined): boolean {
  const text = String(value ?? '').trim();
  return text === '' || text === '-' || text === '—';
}

function parseMinutes(value: string): number {
  const clock = /(?:^|[^\d])(\d{1,2})h\s*(\d{1,2})m/i.exec(value);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const hoursOnly = /(?:^|[^\d])(\d{1,2})h/i.exec(value);
  if (hoursOnly) return Number(hoursOnly[1]) * 60;
  const minsOnly = /(?:^|[^\d])(\d{1,3})m/i.exec(value);
  return minsOnly ? Number(minsOnly[1]) : 0;
}

function parseWhen(value: string): { ymd: string; hm: string; minutes: number } | null {
  const match = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),\s*(\d{4})/i.exec(value);
  if (!match) return null;
  const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  const ymd = `${match[3]}-${String(month).padStart(2, '0')}-${String(Number(match[2])).padStart(2, '0')}`;
  const hmMatch = /(\d{1,2}:\d{2})/.exec(value);
  const hm = hmMatch ? hmMatch[1].padStart(5, '0') : '';
  return { ymd, hm, minutes: parseMinutes(value) };
}

function weekMonday(ymd: string): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - sinceMonday);
  return date.toISOString().slice(0, 10);
}

function canonMethod(raw: string): string {
  const text = raw.trim().toLowerCase();
  if (text.startsWith('phys')) return 'Physical';
  if (text.startsWith('whats')) return 'WhatsApp';
  if (text.startsWith('tel') || text.startsWith('phone')) return 'Telephone';
  if (text.startsWith('land')) return 'Landline';
  return 'Other';
}

function compactName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function extractCode(value: string): string {
  const match = /\[([A-Za-z0-9][A-Za-z0-9 ]{1,12})\]/.exec(value);
  if (!match) return '';
  return match[1].replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

function tidy(value: string): string {
  return value
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.:;])/g, '$1')
    .replace(/\[([^\]]+)\]/g, (_, inner: string) => `[${inner.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}]`)
    .replace(/\](?=[A-Za-z])/g, '] ')
    .replace(/([23456789CFGHJMPQRVWX]{2,8})\s+\+/g, '$1+')
    .replace(/\+\s+([23456789CFGHJMPQRVWX]{2,3})/g, '+$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/([a-z]{3,})(cash|house|hardware|construction|furniture|electrical|plumbing|storage|industry|bazaar|carry|glass|projects|resort|depot|trading|builders)/gi, '$1 $2')
    .replace(/(hardware|furniture|glass|house|home)(and)/gi, '$1 $2')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function checkInPlace(location: string): string {
  const inPart = /In:\s*([\s\S]*?)(?:\s*\|\s*Out:|$)/i.exec(location);
  const text = (inPart?.[1] ?? location).replace(/\s+/g, ' ').trim();
  return text.replace(/\|\s*$/, '').trim();
}

function columnKey(x: number): string | null {
  let best = COL_X[0][0];
  let dist = Math.abs(x - COL_X[0][1]);
  for (const [key, anchor] of COL_X) {
    const next = Math.abs(x - anchor);
    if (next < dist) {
      best = key;
      dist = next;
    }
  }
  return dist <= 18 ? best : null;
}

function joinParts(parts: Array<{ text: string; width: number }>): string {
  let out = '';
  let prevWidth = 0;
  for (const part of parts) {
    const text = part.text.trim();
    if (!text) continue;
    if (!out) {
      out = text;
      prevWidth = part.width;
      continue;
    }
    const letters = text.replace(/[^a-z]/gi, '').toLowerCase();
    const isWord = WORD.has(letters);
    const prevToken = out.split(/\s/).pop() ?? '';
    const prevUpper = /^[A-Z0-9]{2,}$/.test(prevToken);
    const nextLower = /^[a-z]/.test(text);
    const nextUpperFrag = /^[A-Z0-9]{1,6}(\s|$)/.test(text) && text.replace(/\s/g, '').length <= 6;
    const prevIsWord = WORD.has(prevToken.replace(/[^a-z]/gi, '').toLowerCase());
    const fragmentTail = nextLower && text.replace(/[^a-z]/gi, '').length <= 4 && !prevIsWord && prevWidth >= 16;
    const newWord = /^(hardwar|hardware|builders|builder|trading|depot)/i.test(text) && /^[A-Z][a-z]{2,}$/.test(prevToken);
    const shortHead = /^([a-z]{1,4})\s+\S/.exec(text);
    const shortCont = Boolean(shortHead) && !WORD.has(shortHead?.[1] ?? '') && prevWidth >= 14 && /[A-Za-z]$/.test(prevToken);
    const plusCont =
      /^[0-9CFGHJMPQRVWX+]/i.test(text) &&
      !/^\d+h/i.test(text) &&
      !/\d:\d{2}$/.test(prevToken) &&
      /[0-9CFGHJMPQRVWX]$/.test(prevToken) &&
      prevWidth >= 12 &&
      !/[,.]$/.test(out);
    const emailCont = text.startsWith('@') || text.startsWith('.') || out.endsWith('@');
    const dateDash = /^-\d/.test(text) && /\d$/.test(out);
    const hardLower = nextLower && !isWord && !prevIsWord && /[A-Za-z0-9]$/.test(out) && (prevWidth >= 14 || text.length <= 3);
    const tinyPrev = prevToken.length <= 2 && nextLower && !isWord && text.replace(/[^a-z]/gi, '').length <= 6;
    const hardUpper = nextUpperFrag && prevUpper && prevWidth >= 14 && !/[,.]$/.test(out);
    if (!newWord && (emailCont || dateDash || plusCont || hardLower || hardUpper || fragmentTail || shortCont || tinyPrev)) out += text;
    else out += ` ${text}`;
    prevWidth = part.width;
  }
  return tidy(out);
}

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getTextContent: () => Promise<{ items: Array<{ str?: string; width?: number; transform: number[] }> }>;
  }>;
};

async function loadPdfItems(): Promise<PdfItem[][]> {
  const pdfjs = (await import(path.join(PDFJS_DIR, 'pdfjs-dist/legacy/build/pdf.mjs'))) as {
    getDocument: (src: { url: string; disableWorker: boolean }) => { promise: Promise<PdfDoc> };
  };
  const doc = await pdfjs.getDocument({ url: `file://${VISITS_PDF}`, disableWorker: true }).promise;
  const pages: PdfItem[][] = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const items: PdfItem[] = [];
    for (const item of content.items) {
      const text = item.str?.trim() ?? '';
      if (!text) continue;
      if (/^--\s*\d+\s+of\s+\d+\s*--$/.test(text)) continue;
      if (text === 'Visits · All activity') continue;
      items.push({
        x: item.transform[4] ?? 0,
        y: item.transform[5] ?? 0,
        width: item.width ?? text.length * 4,
        text,
      });
    }
    const branch = items.find((item) => item.text === 'Branch' && item.x > 770 && item.y > 480);
    const cutoff = branch ? branch.y - 22 : 520;
    pages.push(items.filter((item) => item.y < cutoff));
  }
  return pages;
}

function parsePdfVisits(pages: PdfItem[][]): Array<Record<string, string>> {
  const records: Array<Record<string, Array<{ text: string; width: number }>>> = [];
  let current: Record<string, Array<{ text: string; width: number }>> | null = null;

  function startRecord(): Record<string, Array<{ text: string; width: number }>> {
    const next: Record<string, Array<{ text: string; width: number }>> = {};
    records.push(next);
    return next;
  }

  for (const items of pages) {
    const byY = new Map<number, PdfItem[]>();
    for (const item of items) {
      const y = Math.round(item.y);
      const line = byY.get(y);
      if (line) line.push(item);
      else byY.set(y, [item]);
    }
    const ys = [...byY.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const line = (byY.get(y) ?? []).sort((a, b) => a.x - b.x);
      const cells = new Map<string, Array<{ text: string; width: number }>>();
      for (const item of line) {
        const key = columnKey(item.x);
        if (!key) continue;
        const list = cells.get(key);
        const piece = { text: item.text, width: item.width };
        if (list) list.push(piece);
        else cells.set(key, [piece]);
      }
      const whenText = (cells.get('when') ?? []).map((part) => part.text).join(' ');
      if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?$/i.test(whenText.trim())) {
        current = startRecord();
      }
      if (!current) current = startRecord();
      for (const [key, parts] of cells) {
        const bucket = current[key];
        if (bucket) bucket.push(...parts);
        else current[key] = [...parts];
      }
    }
  }

  return records.map((record) => {
    const row: Record<string, string> = {};
    for (const [key, parts] of Object.entries(record)) row[key] = joinParts(parts);
    return row;
  });
}

function readWorkbook(): {
  visitRows: Array<Record<string, string>>;
  stopRows: Array<Record<string, string>>;
  dailyRows: unknown[][];
} {
  const book = XLSX.read(fs.readFileSync(TRAVEL_XLSX), { type: 'buffer' });
  const asRows = (name: string) =>
    XLSX.utils.sheet_to_json<Record<string, string>>(book.Sheets[name], { defval: '', raw: false });
  const daily = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets['Daily travel'], {
    header: 1,
    defval: '',
    raw: false,
  });
  return { visitRows: asRows('Visits'), stopRows: asRows('Stops'), dailyRows: daily };
}

function finiteCoord(value: string): number | null {
  if (blank(value)) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

type OlcApi = {
  isFull: (code: string) => boolean;
  isShort: (code: string) => boolean;
  recoverNearest: (code: string, lat: number, lng: number) => string;
  decode: (code: string) => { latitudeCenter: number; longitudeCenter: number };
};

function loadOlc(): OlcApi {
  const lib = require(path.join(PDFJS_DIR, 'open-location-code')) as {
    OpenLocationCode: new () => OlcApi;
  };
  return new lib.OpenLocationCode();
}

function plusCode(value: string): string {
  const match = /[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,}/i.exec(value);
  return match ? match[0].toUpperCase() : '';
}

function decodePlus(olc: OlcApi, code: string, refLat: number, refLng: number): { lat: number; lng: number } | null {
  if (!code) return null;
  try {
    const full = olc.isFull(code) ? code : olc.recoverNearest(code, refLat, refLng);
    const decoded = olc.decode(full);
    if (!Number.isFinite(decoded.latitudeCenter) || !Number.isFinite(decoded.longitudeCenter)) return null;
    return { lat: decoded.latitudeCenter, lng: decoded.longitudeCenter };
  } catch {
    return null;
  }
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) {
    const text = value.trim();
    if (blank(text)) continue;
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [text, count] of counts) {
    if (count > bestCount) {
      best = text;
      bestCount = count;
    }
  }
  return best;
}

function stripPostal(place: string): string {
  return place
    .replace(/\b\d{4}\b/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function areaOf(place: string, lat: number | null, lng: number | null): string {
  const cleaned = stripPostal(place);
  return normalizeStopArea({
    place: blank(cleaned) ? '-' : cleaned,
    lat: lat == null ? '-' : String(lat),
    lng: lng == null ? '-' : String(lng),
  });
}

function clusterPlace(stop: TravelAnalysisStopRow): TravelAnalysisStopRow {
  return { ...stop, place: stripPostal(stop.place) };
}

function dedupeVisits(visits: Visit[]): Visit[] {
  const seen = new Set<string>();
  const out: Visit[] = [];
  for (const visit of visits) {
    const key = [
      visit.rep,
      visit.ymd,
      visit.hm,
      compactName(visit.siteName) || compactName(visit.clientKey) || compactName(visit.notes).slice(0, 40),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(visit);
  }
  return out;
}

function assignClientKeys(visits: Visit[]): void {
  const byRep = new Map<string, Visit[]>();
  for (const visit of visits) {
    const list = byRep.get(visit.rep);
    if (list) list.push(visit);
    else byRep.set(visit.rep, [visit]);
  }
  for (const group of byRep.values()) {
    const parent = group.map((_, index) => index);
    function find(index: number): number {
      let cursor = index;
      while (parent[cursor] !== cursor) cursor = parent[cursor] ?? cursor;
      return cursor;
    }
    function union(a: number, b: number): void {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    }
    const byCode = new Map<string, number>();
    const byCompact = new Map<string, number>();
    group.forEach((visit, index) => {
      const code = extractCode(`${visit.clientKey} ${visit.siteName}`);
      if (code) {
        const prev = byCode.get(code);
        if (prev == null) byCode.set(code, index);
        else union(index, prev);
      }
      const compact = compactName(visit.siteName) || compactName(visit.clientKey);
      if (compact.length >= 4) {
        const prev = byCompact.get(compact);
        if (prev == null) byCompact.set(compact, index);
        else union(index, prev);
      }
    });
    const members = new Map<number, Visit[]>();
    group.forEach((visit, index) => {
      const root = find(index);
      const list = members.get(root);
      if (list) list.push(visit);
      else members.set(root, [visit]);
    });
    for (const list of members.values()) {
      const code = list.map((visit) => extractCode(`${visit.clientKey} ${visit.siteName}`)).find((value) => value) ?? '';
      const site = mostCommon(list.map((visit) => visit.siteName));
      const key = code ? `[${code}]` : site || '(no client)';
      for (const visit of list) visit.clientKey = key;
    }
  }
}

type ClientRow = {
  rep: string;
  clientKey: string;
  siteName: string;
  area: string;
  lat: number | null;
  lng: number | null;
};

function kmBetween(lat: number, lng: number, home: HomeRow | undefined): number {
  if (!home || home.lat == null || home.lng == null) return Number.POSITIVE_INFINITY;
  const dLat = (lat - home.lat) * 111;
  const dLng = (lng - home.lng) * 111 * Math.cos((home.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

function clientRows(visits: Visit[], homes: HomeRow[]): ClientRow[] {
  const homeByRep = new Map(homes.map((home) => [home.rep, home]));
  const groups = new Map<string, Visit[]>();
  for (const visit of visits) {
    const id = `${visit.rep}|${visit.clientKey}`;
    const list = groups.get(id);
    if (list) list.push(visit);
    else groups.set(id, [visit]);
  }
  const rows: ClientRow[] = [];
  for (const list of groups.values()) {
    const physical = list.filter((visit) => visit.physical);
    const area = mostCommon(physical.map((visit) => visit.area).filter((value) => value && value !== 'Unknown'))
      || mostCommon(list.map((visit) => areaOf(visit.address, null, null)).filter((value) => value && value !== 'Unknown' && value !== '—'));
    const home = homeByRep.get(list[0]?.rep ?? '');
    const placed = physical.filter((visit) => visit.lat != null && visit.lng != null && kmBetween(visit.lat, visit.lng, home) > 1.5);
    const lats = placed.map((visit) => visit.lat as number);
    const lngs = placed.map((visit) => visit.lng as number);
    rows.push({
      rep: list[0]?.rep ?? '',
      clientKey: list[0]?.clientKey ?? '(no client)',
      siteName: mostCommon(list.map((visit) => visit.siteName)) || list[0]?.siteName || '',
      area,
      lat: median(lats),
      lng: median(lngs),
    });
  }
  return rows.sort((a, b) => a.rep.localeCompare(b.rep) || a.clientKey.localeCompare(b.clientKey));
}

function putFormula(sheet: import('xlsx').WorkSheet, addr: string, formula: string): void {
  sheet[addr] = { t: 'n', f: formula };
}

function haversineFormula(repCell: string, latCell: string, lngCell: string): string {
  const homeLat = `INDEX(Home!C:C,MATCH(${repCell},Home!A:A,0))`;
  const homeLng = `INDEX(Home!D:D,MATCH(${repCell},Home!A:A,0))`;
  return `IF(OR(${latCell}="",${lngCell}="",COUNTIF(Home!A:A,${repCell})=0),"",ROUND(6371*2*ASIN(MIN(1,SQRT(POWER(SIN(RADIANS(${latCell}-${homeLat})/2),2)+COS(RADIANS(${homeLat}))*COS(RADIANS(${latCell}))*POWER(SIN(RADIANS(${lngCell}-${homeLng})/2),2)))),1))`;
}

function sheetFromRows(rows: unknown[][]): import('xlsx').WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = rows[0]?.map(() => ({ wch: 22 }));
  return sheet;
}

async function main(): Promise<void> {
  const olc = loadOlc();
  const { visitRows, stopRows, dailyRows } = readWorkbook();
  const pdfPages = await loadPdfItems();
  const pdfRows = parsePdfVisits(pdfPages).filter((row) => parseWhen(row.when ?? ''));

  const stops: TravelAnalysisStopRow[] = stopRows.map((row) => ({
    user: repName(String(row.User ?? '')),
    date: String(row.Date ?? ''),
    place: String(row.Place ?? ''),
    arrived: String(row.Arrived ?? ''),
    left: String(row.Left ?? ''),
    dwellMin: parseMinutes(String(row['Dwell time'] ?? '')),
    batteryIn: String(row['Battery in'] ?? '-'),
    batteryOut: String(row['Battery out'] ?? '-'),
    lat: blank(row.Lat) ? '-' : String(row.Lat),
    lng: blank(row.Lng) ? '-' : String(row.Lng),
  }));

  const refByRep = new Map<string, { lat: number; lng: number }>();
  for (const stop of stops) {
    const lat = finiteCoord(stop.lat);
    const lng = finiteCoord(stop.lng);
    if (lat == null || lng == null) continue;
    const bucket = refByRep.get(stop.user) ?? { lat: 0, lng: 0, n: 0 } as { lat: number; lng: number; n?: number };
    const n = (bucket as { n?: number }).n ?? 0;
    bucket.lat = (bucket.lat * n + lat) / (n + 1);
    bucket.lng = (bucket.lng * n + lng) / (n + 1);
    (bucket as { n?: number }).n = n + 1;
    refByRep.set(stop.user, bucket);
  }

  function referenceFor(rep: string): { lat: number; lng: number } {
    return refByRep.get(rep) ?? { lat: -25.67, lng: 27.24 };
  }

  const octoberVisits: Visit[] = [];
  for (const row of visitRows) {
    const when = parseWhen(String(row['Date and time'] ?? ''));
    if (!when) continue;
    const rep = repName(String(row['Sales Person'] ?? ''));
    const method = canonMethod(String(row.Method ?? ''));
    const place = checkInPlace(String(row['Check-in / Check-out location'] ?? ''));
    const ref = referenceFor(rep);
    const decoded = method === 'Physical' ? decodePlus(olc, plusCode(place), ref.lat, ref.lng) : null;
    const matched = matchStop(stops, rep, when.ymd, when.hm, place);
    const lat = decoded?.lat ?? (method === 'Physical' ? matched?.lat ?? null : null);
    const lng = decoded?.lng ?? (method === 'Physical' ? matched?.lng ?? null : null);
    const duration = parseMinutes(String(row.Duration ?? ''));
    octoberVisits.push({
      rep,
      ymd: when.ymd,
      hm: when.hm,
      week: weekMonday(when.ymd),
      method,
      siteName: blank(row.Company) ? '' : tidy(String(row.Company)),
      clientKey: blank(row.Client) ? '' : tidy(String(row.Client)),
      area: areaOf(place, lat, lng),
      minutes: duration || when.minutes,
      place,
      lat,
      lng,
      notes: blank(row.Notes) ? '' : String(row.Notes),
      branch: blank(row.Branch) ? '' : String(row.Branch),
      source: 'Travel report',
      physical: method === 'Physical',
      address: blank(row['Contact address']) ? '' : String(row['Contact address']),
    });
  }

  const novemberVisits: Visit[] = pdfRows.map((row) => {
    const when = parseWhen(row.when ?? '')!;
    const rep = repName(row.rep ?? 'Patrick Oupa Moreosele');
    const method = canonMethod(row.method ?? '');
    const place = checkInPlace(row.place ?? '');
    const ref = referenceFor(rep);
    const decoded = method === 'Physical' ? decodePlus(olc, plusCode(place), ref.lat, ref.lng) : null;
    return {
      rep,
      ymd: when.ymd,
      hm: when.hm,
      week: weekMonday(when.ymd),
      method,
      siteName: blank(row.company) ? '' : row.company,
      clientKey: blank(row.client) ? '' : row.client,
      area: areaOf(place, decoded?.lat ?? null, decoded?.lng ?? null),
      minutes: when.minutes,
      place,
      lat: decoded?.lat ?? null,
      lng: decoded?.lng ?? null,
      notes: [row.notes, row.resolution].filter((part) => part && !blank(part)).join(' '),
      branch: row.branch ?? '',
      source: 'Visits PDF',
      physical: method === 'Physical',
      address: row.address ?? '',
    };
  });

  const visits = dedupeVisits([...octoberVisits, ...novemberVisits]).sort(
    (a, b) => a.rep.localeCompare(b.rep) || a.ymd.localeCompare(b.ymd) || a.hm.localeCompare(b.hm),
  );
  assignClientKeys(visits);

  const novemberStops: TravelAnalysisStopRow[] = novemberVisits.map((visit) => ({
    user: visit.rep,
    date: visit.ymd,
    place: visit.place || '-',
    arrived: visit.hm,
    left: '',
    dwellMin: visit.minutes,
    batteryIn: '-',
    batteryOut: '-',
    lat: visit.lat == null ? '-' : String(visit.lat),
    lng: visit.lng == null ? '-' : String(visit.lng),
  }));

  const stopsByRep = new Map<string, TravelAnalysisStopRow[]>();
  for (const stop of [...stops, ...novemberStops]) {
    if (!stop.user) continue;
    const list = stopsByRep.get(stop.user);
    if (list) list.push(stop);
    else stopsByRep.set(stop.user, [stop]);
  }

  type AreaOut = { rep: string; area: string; stops: number; dwellMin: number; share: number; lat: number | null; lng: number | null };
  const areas: AreaOut[] = [];
  for (const rep of [...stopsByRep.keys()].sort((a, b) => a.localeCompare(b))) {
    const repStops = (stopsByRep.get(rep) ?? []).map(clusterPlace);
    const clustered = clusterCommonAreas(repStops);
    for (const area of clustered) {
      const members = repStops.filter((stop) => normalizeStopArea(stop) === area.area);
      areas.push({
        rep,
        area: area.area,
        stops: area.stops,
        dwellMin: area.dwellMin,
        share: area.dwellSharePct,
        lat: median(members.map((stop) => finiteCoord(stop.lat)).filter((value): value is number => value != null)),
        lng: median(members.map((stop) => finiteCoord(stop.lng)).filter((value): value is number => value != null)),
      });
    }
  }

  const homes = buildHomes(visits, stops, dailyRows, olc);
  const clients = clientRows(visits, homes);
  const weeks = uniqueWeeks(visits);

  const visitHeader = [
    'Rep', 'Date', 'Week', 'Method', 'Site name', 'Client key', 'Area', 'Minutes',
    'Check-in place', 'Lat', 'Lng', 'Notes', 'Branch', 'Source',
  ];
  const visitAoa: unknown[][] = [
    visitHeader,
    ...visits.map((visit) => [
      visit.rep,
      visit.ymd,
      visit.week,
      visit.method,
      visit.siteName,
      visit.clientKey,
      visit.area,
      visit.minutes,
      visit.place,
      visit.lat,
      visit.lng,
      visit.notes,
      visit.branch,
      visit.source,
    ]),
  ];

  const areaHeader = ['Rep', 'Area', 'Stops', 'Dwell', 'Share of dwell', 'Lat', 'Lng', 'Km from home'];
  const areaAoa: unknown[][] = [
    areaHeader,
    ...areas.map((area) => [area.rep, area.area, area.stops, formatHoursMinutes(area.dwellMin), area.share, area.lat, area.lng, null]),
  ];

  const clientHeader = [
    'Rep', 'Client key', 'Site name', 'Area', 'Lat', 'Lng', 'Visit count', 'Time spent (min)',
    'Physical', 'Telephone', 'WhatsApp', 'Landline', 'Other', 'Km from home',
  ];
  const clientAoa: unknown[][] = [
    clientHeader,
    ...clients.map((row) => [row.rep, row.clientKey, row.siteName, row.area, row.lat, row.lng, null, null, null, null, null, null, null, null]),
  ];

  const weekHeader = ['Rep', 'Week', 'Total', 'Physical', 'Telephone', 'WhatsApp', 'Landline', 'Other'];
  const weekAoa: unknown[][] = [
    weekHeader,
    ...weeks.map((row) => [row.rep, row.week, null, null, null, null, null, null]),
  ];

  const homeAoa: unknown[][] = [
    ['Straight-line kilometres, not Google road distance. Edit lat/lng and recalculate.'],
    ['Rep', 'Home', 'Lat', 'Lng'],
    ...homes.map((row) => [row.rep, row.label, row.lat, row.lng]),
  ];

  const book = XLSX.utils.book_new();
  const visitSheet = sheetFromRows(visitAoa);
  const areaSheet = sheetFromRows(areaAoa);
  const clientSheet = sheetFromRows(clientAoa);
  const weekSheet = sheetFromRows(weekAoa);
  const homeSheet = sheetFromRows(homeAoa);
  const daySheet = sheetFromRows(dailyRows);

  for (let index = 0; index < areas.length; index += 1) {
    const row = index + 2;
    putFormula(areaSheet, `H${row}`, haversineFormula(`A${row}`, `F${row}`, `G${row}`));
  }
  for (let index = 0; index < clients.length; index += 1) {
    const row = index + 2;
    putFormula(clientSheet, `G${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!F:F,B${row})`);
    putFormula(clientSheet, `H${row}`, `SUMIFS(Visits!H:H,Visits!A:A,A${row},Visits!F:F,B${row})`);
    putFormula(clientSheet, `I${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!F:F,B${row},Visits!D:D,"Physical")`);
    putFormula(clientSheet, `J${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!F:F,B${row},Visits!D:D,"Telephone")`);
    putFormula(clientSheet, `K${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!F:F,B${row},Visits!D:D,"WhatsApp")`);
    putFormula(clientSheet, `L${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!F:F,B${row},Visits!D:D,"Landline")`);
    putFormula(clientSheet, `M${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!F:F,B${row},Visits!D:D,"Other")`);
    putFormula(clientSheet, `N${row}`, haversineFormula(`A${row}`, `E${row}`, `F${row}`));
  }
  for (let index = 0; index < weeks.length; index += 1) {
    const row = index + 2;
    putFormula(weekSheet, `C${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!C:C,B${row})`);
    putFormula(weekSheet, `D${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!C:C,B${row},Visits!D:D,"Physical")`);
    putFormula(weekSheet, `E${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!C:C,B${row},Visits!D:D,"Telephone")`);
    putFormula(weekSheet, `F${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!C:C,B${row},Visits!D:D,"WhatsApp")`);
    putFormula(weekSheet, `G${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!C:C,B${row},Visits!D:D,"Landline")`);
    putFormula(weekSheet, `H${row}`, `COUNTIFS(Visits!A:A,A${row},Visits!C:C,B${row},Visits!D:D,"Other")`);
  }

  XLSX.utils.book_append_sheet(book, visitSheet, 'Visits');
  XLSX.utils.book_append_sheet(book, areaSheet, 'Most common areas');
  XLSX.utils.book_append_sheet(book, clientSheet, 'Clients');
  XLSX.utils.book_append_sheet(book, weekSheet, 'Weekly categories');
  XLSX.utils.book_append_sheet(book, homeSheet, 'Home');
  XLSX.utils.book_append_sheet(book, daySheet, 'Day by day');

  const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  fs.writeFileSync(OUT_XLSX, buffer);

  const pdfCompanies = pdfRows.map((row) => row.company).filter(Boolean);
  console.log(JSON.stringify({
    octoberVisits: octoberVisits.length,
    pdfVisits: pdfRows.length,
    mergedVisits: visits.length,
    areas: areas.length,
    clients: clients.length,
    weeks: weeks.length,
    homes: homes.length,
    pdfSample: pdfCompanies.slice(0, 8),
    out: OUT_XLSX,
  }, null, 2));
}

function matchStop(
  stops: TravelAnalysisStopRow[],
  rep: string,
  ymd: string,
  hm: string,
  place: string,
): { lat: number; lng: number } | null {
  const [hour, minute] = hm.split(':').map(Number);
  const visitMin = (hour ?? 0) * 60 + (minute ?? 0);
  let best: { lat: number; lng: number; score: number } | null = null;
  for (const stop of stops) {
    if (stop.user !== rep || stop.date !== ymd) continue;
    const lat = finiteCoord(stop.lat);
    const lng = finiteCoord(stop.lng);
    if (lat == null || lng == null) continue;
    const [sh, sm] = stop.arrived.split(':').map(Number);
    const stopMin = (sh ?? 0) * 60 + (sm ?? 0);
    const delta = Math.abs(stopMin - visitMin);
    const placeHit = place && stop.place && (stop.place.includes(place.slice(0, 18)) || place.includes(stop.place.slice(0, 18)));
    if (delta > 45 && !placeHit) continue;
    const score = (placeHit ? 0 : 100) + delta;
    if (!best || score < best.score) best = { lat, lng, score };
  }
  return best ? { lat: best.lat, lng: best.lng } : null;
}

function uniqueWeeks(visits: Visit[]): Array<{ rep: string; week: string }> {
  const seen = new Set<string>();
  const rows: Array<{ rep: string; week: string }> = [];
  for (const visit of visits) {
    const id = `${visit.rep}|${visit.week}`;
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({ rep: visit.rep, week: visit.week });
  }
  return rows.sort((a, b) => a.rep.localeCompare(b.rep) || a.week.localeCompare(b.week));
}

function buildHomes(
  visits: Visit[],
  stops: TravelAnalysisStopRow[],
  dailyRows: unknown[][],
  olc: OlcApi,
): HomeRow[] {
  const header = (dailyRows[0] ?? []).map((cell) => String(cell));
  const userIdx = header.indexOf('User');
  const startIdx = header.indexOf('Start place');
  const starts = new Map<string, Map<string, number>>();
  for (const row of dailyRows.slice(1)) {
    const cells = row as unknown[];
    const rep = repName(String(cells[userIdx] ?? ''));
    const place = String(cells[startIdx] ?? '');
    if (!rep || blank(place)) continue;
    const counts = starts.get(rep) ?? new Map<string, number>();
    counts.set(place, (counts.get(place) ?? 0) + 1);
    starts.set(rep, counts);
  }
  const reps = new Set<string>([...visits.map((visit) => visit.rep), ...stops.map((stop) => stop.user)]);
  const homes: HomeRow[] = [];
  for (const rep of [...reps].filter(Boolean).sort((a, b) => a.localeCompare(b))) {
    if (/patrick/i.test(rep) && /moreosele/i.test(rep)) {
      const decoded = decodePlus(olc, '7M9F+R2', -25.67, 27.24);
      homes.push({
        rep,
        label: '7M9F+R2, Majakaneng',
        lat: decoded?.lat ?? null,
        lng: decoded?.lng ?? null,
      });
      continue;
    }
    const counts = starts.get(rep);
    let label = '';
    let best = 0;
    if (counts) {
      for (const [place, count] of counts) {
        if (count > best) {
          label = place;
          best = count;
        }
      }
    }
    const coords = stops.filter((stop) => stop.user === rep && label && (stop.place === label || normalizeStopArea(stop) === areaOf(label, null, null)));
    homes.push({
      rep,
      label: label || 'Unknown',
      lat: median(coords.map((stop) => finiteCoord(stop.lat)).filter((value): value is number => value != null)),
      lng: median(coords.map((stop) => finiteCoord(stop.lng)).filter((value): value is number => value != null)),
    });
  }
  return homes;
}

void main();
