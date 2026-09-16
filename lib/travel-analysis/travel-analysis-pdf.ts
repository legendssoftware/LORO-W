import type { jsPDF } from 'jspdf';
import { downloadBlob } from '@/lib/utils/report-export';
import {
  buildTravelAnalysisFilename,
  formatHoursMinutes,
} from '@/lib/travel-analysis/build-travel-analysis-document';
import type { TravelAnalysisDocument } from '@/lib/travel-analysis/travel-analysis-types';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 16;
const MARGIN_TOP = 22;
const MARGIN_BOTTOM = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const COLOR_BAR: [number, number, number] = [17, 24, 39];
const COLOR_ACCENT: [number, number, number] = [220, 38, 38];
const COLOR_TEXT: [number, number, number] = [17, 24, 39];
const COLOR_MUTED: [number, number, number] = [85, 85, 85];
const COLOR_LINE: [number, number, number] = [204, 204, 204];
const COLOR_HEAD: [number, number, number] = [242, 242, 242];
const COLOR_WARN_BG: [number, number, number] = [255, 251, 235];

const EM_DASH = '—';

type AutoTableFn = (doc: jsPDF, options: Record<string, unknown>) => void;

type PdfLibs = {
  jsPDF: new (options: {
    orientation: 'p';
    unit: 'mm';
    format: 'a4';
  }) => jsPDF;
  autoTable: AutoTableFn;
};

type PdfCursor = {
  doc: jsPDF;
  y: number;
  autoTable: AutoTableFn;
  continuationTitle: string | null;
};

function loadPdfLibs(): PdfLibs {
  // Runtime require keeps jsPDF off the SSR path (same pattern as report-export).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { jsPDF } = require('jspdf');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { autoTable } = require('jspdf-autotable');
  return { jsPDF, autoTable };
}

function lastTableY(doc: jsPDF, fallback: number): number {
  const last = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
    .lastAutoTable;
  return last?.finalY ?? fallback;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return EM_DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return date.toLocaleString('en-ZA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatKm(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return EM_DASH;
  return `${n.toFixed(1)} km`;
}

function formatPct(n: number): string {
  return `${Math.round(n)}%`;
}

function formatLitres(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return EM_DASH;
  return `${n.toFixed(1)} L`;
}

function formatZar(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return EM_DASH;
  return `R ${n.toFixed(2)}`;
}

function ensureSpace(ctx: PdfCursor, neededMm: number): void {
  if (ctx.y + neededMm <= PAGE_H - MARGIN_BOTTOM) return;
  ctx.doc.addPage();
  ctx.y = MARGIN_TOP;
  if (!ctx.continuationTitle) return;
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(10);
  ctx.doc.setTextColor(...COLOR_MUTED);
  ctx.doc.text(ctx.continuationTitle, MARGIN_X, ctx.y);
  ctx.y += 7;
}

function addSectionTitle(ctx: PdfCursor, title: string): void {
  ensureSpace(ctx, 12);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(12);
  ctx.doc.setTextColor(...COLOR_TEXT);
  ctx.doc.text(title, MARGIN_X, ctx.y);
  ctx.y += 2;
  ctx.doc.setDrawColor(...COLOR_ACCENT);
  ctx.doc.setLineWidth(0.4);
  ctx.doc.line(MARGIN_X, ctx.y, MARGIN_X + 28, ctx.y);
  ctx.y += 6;
}

function addParagraph(ctx: PdfCursor, text: string, muted = true): void {
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...(muted ? COLOR_MUTED : COLOR_TEXT));
  const lines = ctx.doc.splitTextToSize(text, CONTENT_W) as string[];
  const lineH = 4.4;
  ensureSpace(ctx, lines.length * lineH + 2);
  ctx.doc.text(lines, MARGIN_X, ctx.y);
  ctx.y += lines.length * lineH + 3;
}

function addTable(ctx: PdfCursor, options: Record<string, unknown>): void {
  ensureSpace(ctx, 18);
  ctx.autoTable(ctx.doc, {
    startY: ctx.y,
    margin: { left: MARGIN_X, right: MARGIN_X, top: MARGIN_TOP, bottom: MARGIN_BOTTOM },
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.4,
      textColor: COLOR_TEXT,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: COLOR_HEAD,
      textColor: COLOR_TEXT,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    ...options,
  });
  ctx.y = lastTableY(ctx.doc, ctx.y) + 6;
}

function drawChrome(doc: jsPDF, page: number, pageCount: number): void {
  doc.setFillColor(...COLOR_BAR);
  doc.rect(0, 0, PAGE_W, 10, 'F');
  doc.setFillColor(...COLOR_ACCENT);
  doc.rect(0, 10, PAGE_W, 0.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('LORO', MARGIN_X, 6.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Travel analysis', PAGE_W - MARGIN_X, 6.5, {
    align: 'right',
  });

  doc.setDrawColor(...COLOR_LINE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, PAGE_H - 12, PAGE_W - MARGIN_X, PAGE_H - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    'Confidential · travel estimates from GPS, visits, and Fuel SA',
    MARGIN_X,
    PAGE_H - 7,
  );
  doc.text(`Page ${page} of ${pageCount}`, PAGE_W - MARGIN_X, PAGE_H - 7, {
    align: 'right',
  });
}

function addNoteBox(ctx: PdfCursor, title: string, body: string): void {
  const wrapped = body
    .split('\n')
    .flatMap((line) => ctx.doc.splitTextToSize(line, CONTENT_W - 6) as string[]);
  const boxH = wrapped.length * 4.2 + 10;
  ensureSpace(ctx, boxH + 4);
  ctx.doc.setFillColor(...COLOR_WARN_BG);
  ctx.doc.rect(MARGIN_X, ctx.y - 3, CONTENT_W, boxH, 'F');
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...COLOR_TEXT);
  ctx.doc.text(title, MARGIN_X + 3, ctx.y + 2);
  ctx.y += 7;
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...COLOR_MUTED);
  ctx.doc.text(wrapped, MARGIN_X + 3, ctx.y);
  ctx.y += wrapped.length * 4.2 + 6;
}

function addCover(ctx: PdfCursor, document: TravelAnalysisDocument): void {
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(18);
  ctx.doc.setTextColor(...COLOR_TEXT);
  ctx.doc.text(document.meta.title, MARGIN_X, ctx.y);
  ctx.y += 7;
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(11);
  ctx.doc.text(document.meta.organisationName, MARGIN_X, ctx.y);
  ctx.y += 8;

  const { kpis } = document;
  addTable(ctx, {
    body: [
      ['Period', `${document.meta.fromYmd} – ${document.meta.toYmd} (${document.meta.timezone})`],
      ['Document generated', formatDateTime(document.meta.generatedAtIso)],
      ['Branch', kpis.branch],
      ['Vehicle', kpis.vehicle],
      ['Fuel type / km/L', `${kpis.fuelType} · ${kpis.ratedKmPerLitre}`],
      ['Country / region', `${kpis.country} · ${kpis.region}`],
      ['Billable km', formatKm(kpis.billableKm)],
      ['Recorded km', formatKm(kpis.recordedKm)],
      ['Commute deducted', formatKm(kpis.commuteDeductedKm)],
      ['Visits / stops', `${kpis.visits} visits · ${kpis.stops} stops`],
      ['Travel / stop time', `${formatHoursMinutes(kpis.travelMin)} / ${formatHoursMinutes(kpis.stopMin)}`],
      ['Estimated fuel', `${formatLitres(kpis.fuelLitres)} · ${formatZar(kpis.fuelZar)}`],
      ['Claims', kpis.claimsLabel],
    ],
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold', textColor: COLOR_MUTED },
      1: { cellWidth: CONTENT_W - 42 },
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    styles: { fontSize: 9, cellPadding: 1.6 },
  });

  addSectionTitle(ctx, 'What this document is');
  addParagraph(
    ctx,
    `A day-by-day briefing of trips, stops, and estimated fuel for ${document.meta.userName} in the selected range. Excel export remains the visits/travel workbook (one summary row per person). This PDF expands the Daily travel and Stops facts into patterns.`,
    false,
  );

  addSectionTitle(ctx, 'Vehicle and fuel basis');
  addTable(ctx, {
    head: [['Setting', 'Value']],
    body: [
      ['Vehicle', document.vehicleBasis.vehicle],
      ['Fuel type', document.vehicleBasis.fuelType],
      ['Fuel SA grade', document.vehicleBasis.fuelGrade],
      [
        'Rated consumption',
        document.vehicleBasis.isFleetDefault
          ? `${document.vehicleBasis.ratedKmPerLitre} — fleet default used when the assigned vehicle has no km/L`
          : document.vehicleBasis.ratedKmPerLitre,
      ],
      ['GPS country / region', `${document.vehicleBasis.country} · ${document.vehicleBasis.region}`],
      ['Commute rule', '20 km home-to-office deducted per calendar day with travel'],
      ['Fuel SA coverage', 'South Africa only. Last saved snapshot is used when a day has no posted price.'],
    ],
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold', textColor: COLOR_MUTED },
      1: { cellWidth: CONTENT_W - 48 },
    },
    styles: { fontSize: 8, cellPadding: 1.4 },
  });

  addNoteBox(ctx, 'Disclaimer', document.disclaimer);
}

function addDayByDay(ctx: PdfCursor, document: TravelAnalysisDocument): void {
  addSectionTitle(ctx, 'Day by day');
  if (document.days.length === 0) {
    addParagraph(ctx, 'No trips recorded in this range.');
    return;
  }
  ctx.continuationTitle = 'Day by day (continued)';
  addTable(ctx, {
    head: [[
      'Date',
      'Recorded',
      'Billable',
      'Travel',
      'Stop',
      'Start → end',
      'Region',
      'Fuel L',
      'Fuel R',
    ]],
    body: document.days.map((row) => [
      row.date,
      formatKm(row.recordedKm),
      formatKm(row.billableKm),
      row.travelLabel,
      row.stopLabel,
      `${row.start} → ${row.end}`,
      row.region,
      row.fuelLitres,
      row.fuelRand,
    ]),
    styles: { fontSize: 7, cellPadding: 1.1 },
    headStyles: { fontSize: 6.5, fillColor: COLOR_HEAD, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 22 },
      5: { cellWidth: 42 },
    },
  });
  ctx.continuationTitle = null;
}

function addCommonAreas(ctx: PdfCursor, document: TravelAnalysisDocument): void {
  addSectionTitle(ctx, 'Most common areas');
  if (document.areas.length === 0) {
    addParagraph(ctx, 'No stops in this range to cluster into areas.');
    return;
  }
  addParagraph(
    ctx,
    'Stops grouped by the first meaningful address parts (or rounded coordinates when the place is missing). Ranked by stop count.',
  );
  addTable(ctx, {
    head: [['Area', 'Stops', 'Dwell', 'Share of dwell']],
    body: document.areas.map((area) => [
      area.area,
      String(area.stops),
      formatHoursMinutes(area.dwellMin),
      formatPct(area.dwellSharePct),
    ]),
    columnStyles: {
      0: { cellWidth: CONTENT_W - 70 },
      1: { cellWidth: 18, halign: 'right' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 26, halign: 'right' },
    },
  });
}

function addDrivingPatterns(ctx: PdfCursor, document: TravelAnalysisDocument): void {
  addSectionTitle(ctx, 'Stops and driving patterns');
  const p = document.patterns;
  addTable(ctx, {
    head: [['Pattern', 'Value']],
    body: [
      ['Travel time', `${formatHoursMinutes(p.travelMin)} (${formatPct(p.travelSharePct)})`],
      ['Stop time', `${formatHoursMinutes(p.stopMin)} (${formatPct(p.stopSharePct)})`],
      ['Days with movement', String(p.daysWithMovement)],
      ['Avg billable km / travel day', p.avgKmPerTravelDay != null ? formatKm(p.avgKmPerTravelDay) : EM_DASH],
      ['Avg stops / travel day', p.avgStopsPerTravelDay != null ? String(p.avgStopsPerTravelDay) : EM_DASH],
      [
        'Avg travel time / travel day',
        p.avgTravelMinPerTravelDay != null ? formatHoursMinutes(p.avgTravelMinPerTravelDay) : EM_DASH,
      ],
      ['Typical start', p.typicalStart],
      ['Typical end', p.typicalEnd],
      ['GPS samples moving / stopped', `${p.movingSampleCount} / ${p.stoppedSampleCount}`],
    ],
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold', textColor: COLOR_MUTED },
      1: { cellWidth: CONTENT_W - 58 },
    },
  });

  addParagraph(ctx, 'Stop dwell buckets: brief under 15 minutes, working 15–60 minutes, long over 60 minutes.');
  addTable(ctx, {
    head: [['Dwell bucket', 'Stops']],
    body: [
      ['Brief (<15 min)', String(p.dwellBrief)],
      ['Working (15–60 min)', String(p.dwellWorking)],
      ['Long (>60 min)', String(p.dwellLong)],
    ],
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold', textColor: COLOR_MUTED },
      1: { cellWidth: CONTENT_W - 58 },
    },
  });
}

function addFuelUsage(ctx: PdfCursor, document: TravelAnalysisDocument): void {
  addSectionTitle(ctx, 'Fuel usage');
  addParagraph(
    ctx,
    `Estimated from billable km, vehicle km/L, and Fuel SA ${document.vehicleBasis.fuelGrade}. Totals: ${formatLitres(document.fuelTotals.litres)} · ${formatZar(document.fuelTotals.zar)} across ${document.fuelTotals.daysWithFuel} priced day${document.fuelTotals.daysWithFuel === 1 ? '' : 's'}.`,
  );
  if (document.fuelDays.length === 0) {
    addParagraph(ctx, 'No daily fuel rows in this range.');
    return;
  }
  ctx.continuationTitle = 'Fuel usage (continued)';
  addTable(ctx, {
    head: [['Date', 'Price', 'Litres', 'Estimated R']],
    body: document.fuelDays.map((row) => [row.date, row.price, row.litres, row.zar]),
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 40 },
      2: { cellWidth: 36, halign: 'right' },
      3: { cellWidth: CONTENT_W - 108, halign: 'right' },
    },
  });
  ctx.continuationTitle = null;
}

/**
 * Render a readable A4 travel-analysis briefing and trigger a browser download.
 */
export function downloadTravelAnalysisPdf(document: TravelAnalysisDocument): void {
  const { jsPDF: JsPDF, autoTable } = loadPdfLibs();
  const doc = new JsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const ctx: PdfCursor = { doc, y: MARGIN_TOP, autoTable, continuationTitle: null };

  addCover(ctx, document);
  addDayByDay(ctx, document);
  addCommonAreas(ctx, document);
  addDrivingPatterns(ctx, document);
  addFuelUsage(ctx, document);

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    drawChrome(doc, page, pageCount);
  }

  const filename = buildTravelAnalysisFilename(document.meta.fromYmd, document.meta.toYmd);
  const blob = doc.output('blob') as Blob;
  downloadBlob(blob, filename);
}
