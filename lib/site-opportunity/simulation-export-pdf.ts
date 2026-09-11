import type { jsPDF } from 'jspdf';
import type { HardwareBrandKey } from '@/api/types/site-opportunity';
import { formatZarAmount } from '@/lib/utils/zar-fx';
import { formatZarShort } from '@/lib/site-opportunity/format-potential';
import { MARKET_CAPTURE_PHASES } from '@/lib/site-opportunity/compute/capture-phases';
import {
  brandChartColor,
  HARDWARE_BRAND_CHART_COLORS,
} from '@/lib/site-opportunity/compute/brands';
import {
  CATEGORY_LABELS,
  resolveCompetitorCategory,
} from '@/lib/site-opportunity/compute/competitor-category';
import { downloadBlob } from '@/lib/utils/report-export';
import { buildSimulationExportFilename } from '@/lib/site-opportunity/build-simulation-export-document';
import {
  SIMULATION_EXPORT_LEGAL_DISCLAIMER,
  SIMULATION_EXPORT_METHOD_NOTES,
  type SimulationExportBrandMix,
  type SimulationExportCompetitor,
  type SimulationExportDocument,
  type SimulationExportTimelinePoint,
  type SimulationExportZone,
} from '@/lib/site-opportunity/simulation-export-types';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 16;
const MARGIN_TOP = 22;
const MARGIN_BOTTOM = 18;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const MAX_COMPETITOR_NAMES = 4;
const ADDRESS_MAX_CHARS = 70;
const ADDRESS_NOISE =
  /^(south africa|general|kzn|gauteng|western cape|eastern cape|limpopo|mpumalanga|free state|north west|northern cape|0000|n\/a)$/i;

const COLOR_BAR: [number, number, number] = [17, 24, 39];
const COLOR_ACCENT: [number, number, number] = [220, 38, 38];
const COLOR_TEXT: [number, number, number] = [17, 24, 39];
const COLOR_MUTED: [number, number, number] = [85, 85, 85];
const COLOR_LINE: [number, number, number] = [204, 204, 204];
const COLOR_HEAD: [number, number, number] = [242, 242, 242];
const COLOR_WARN_BG: [number, number, number] = [255, 251, 235];
const COLOR_BOX: [number, number, number] = [248, 248, 248];
const COLOR_LOW: [number, number, number] = [123, 138, 154];
const COLOR_MID: [number, number, number] = [15, 118, 110];
const COLOR_HIGH: [number, number, number] = [217, 119, 6];

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

function formatZar(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return formatZarAmount(n);
}

function formatShort(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return formatZarShort(n);
}

function formatPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function formatPctPoints(fraction: number): string {
  return String(Math.round(fraction * 100));
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
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

function scopeLine(document: SimulationExportDocument): string {
  return [document.meta.countryLabel, document.meta.provinceLabel, document.meta.modeLabel]
    .filter(Boolean)
    .join(' · ');
}

function asBrandKey(brand: string): HardwareBrandKey {
  if (Object.prototype.hasOwnProperty.call(HARDWARE_BRAND_CHART_COLORS, brand)) {
    return brand as HardwareBrandKey;
  }
  return 'OTHER';
}

function parseHexColor(hex: string): [number, number, number] {
  const raw = hex.replace('#', '');
  if (raw.length !== 6) return [100, 116, 139];
  const n = Number.parseInt(raw, 16);
  if (!Number.isFinite(n)) return [100, 116, 139];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function zoneKindLabel(kind: SimulationExportZone['kind']): string {
  switch (kind) {
    case 'catchment':
      return 'Catchment';
    case 'greenfield':
      return 'Opportunity';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
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

/**
 * Collapse duplicated address halves and strip trailing province/country noise.
 */
export function shortenCompetitorAddress(
  address: string | null,
  maxChars = ADDRESS_MAX_CHARS,
): string {
  const raw = address?.trim();
  if (!raw) return 'No address on record';

  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  let collapsed = parts;
  for (let len = Math.floor(parts.length / 2); len >= 2; len--) {
    const first = parts.slice(0, len).join(', ');
    const second = parts.slice(len, len * 2).join(', ');
    if (first.toLowerCase() === second.toLowerCase()) {
      collapsed = [...parts.slice(0, len), ...parts.slice(len * 2)];
      break;
    }
  }

  while (
    collapsed.length > 1 &&
    ADDRESS_NOISE.test(collapsed[collapsed.length - 1] ?? '')
  ) {
    collapsed.pop();
  }

  const deduped: string[] = [];
  for (const part of collapsed) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.toLowerCase() === part.toLowerCase()) continue;
    deduped.push(part);
  }

  const shortened = deduped.join(', ');
  if (shortened.length <= maxChars) return shortened;
  return `${shortened.slice(0, maxChars - 1).trimEnd()}…`;
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
  doc.text('Store turnover simulation', PAGE_W - MARGIN_X, 6.5, {
    align: 'right',
  });

  doc.setDrawColor(...COLOR_LINE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, PAGE_H - 12, PAGE_W - MARGIN_X, PAGE_H - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR_MUTED);
  doc.text(
    'Confidential · modelled estimates only — not a forecast',
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

function addCover(ctx: PdfCursor, document: SimulationExportDocument): void {
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(18);
  ctx.doc.setTextColor(...COLOR_TEXT);
  ctx.doc.text(document.meta.title, MARGIN_X, ctx.y);
  ctx.y += 7;
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(11);
  ctx.doc.text(document.meta.organisationName, MARGIN_X, ctx.y);
  ctx.y += 8;

  addTable(ctx, {
    body: [
      ['Scope', scopeLine(document)],
      ['Simulation run', formatDateTime(document.meta.ranAtIso)],
      ['Document generated', formatDateTime(document.meta.generatedAtIso)],
      ['Catchments', String(document.catchments.length)],
      ['Opportunities', String(document.opportunities.length)],
      [
        'ERP matches',
        document.meta.erpMatchedStores > 0
          ? `${document.meta.erpMatchedStores} stores (${document.meta.erpMonthLabel ?? 'this month'})`
          : 'None this run',
      ],
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
    `A data-based BitDrywall store-turnover simulation for ranking and planning. This run scored ${document.catchments.length} branch catchment${document.catchments.length === 1 ? '' : 's'} and ${document.opportunities.length} opportunity site${document.opportunities.length === 1 ? '' : 's'} inside a ${document.settings.radiusKm.toFixed(0)} km radius. Potential is ${formatPct(document.settings.captureLowPct)}–${formatPct(document.settings.captureHighPct)} of the local hardware pool. Each site is laid out on its own page.`,
    false,
  );

  addSectionTitle(ctx, 'Garbage in, garbage out');
  addParagraph(
    ctx,
    'The model only ranks what was mapped. Incomplete geocodes, missing competitors, or wrong brand turnovers produce misleading pools (garbage in, garbage out). Clean mapped data produces a useful comparison (good in, good out). Treat every figure as a modelled estimate of the inputs you supplied for this run.',
    false,
  );

  const coverage = document.dataQuality.competitorCoveragePct;
  addParagraph(
    ctx,
    `Competitor map coverage is ${coverage}% (${document.dataQuality.competitorsWithCoords}/${document.dataQuality.totalCompetitors} with coordinates). Client coverage is ${document.dataQuality.clientCoveragePct}%.`,
  );

  addNoteBox(
    ctx,
    'Disclaimer',
    document.disclaimer[0] ?? SIMULATION_EXPORT_LEGAL_DISCLAIMER,
  );

  const callouts = [
    ...document.warnings,
    document.meta.erpError,
  ].filter((line): line is string => Boolean(line));
  if (callouts.length === 0) return;

  addNoteBox(ctx, 'Data quality', callouts.map((line) => `• ${line}`).join('\n'));
}

function addAssumptions(ctx: PdfCursor, document: SimulationExportDocument): void {
  ctx.doc.addPage();
  ctx.y = MARGIN_TOP;
  addSectionTitle(ctx, 'Assumptions');
  addParagraph(
    ctx,
    'Simulation counts mapped BitDrywall branches, competitor hardwares, and clients. For each site it draws a crow-flies radius, multiplies in-radius hardwares by brand monthly turnover to get an addressable pool, then applies the capture band as BitDrywall potential. ERP monthly store sales (when matched) show actual vs modelled turnover.',
  );

  addTable(ctx, {
    head: [['Setting', 'Value']],
    body: [
      ['Radius', `${document.settings.radiusKm.toFixed(0)} km`],
      [
        'Capture band',
        `${formatPct(document.settings.captureLowPct)} – ${formatPct(document.settings.captureHighPct)}`,
      ],
      ['Top N opportunities', String(document.settings.topN)],
      ['Min. distance to existing branch', `${document.settings.minBranchSeparationKm} km`],
      [
        'Rep monthly target',
        formatZar(document.settings.repTargetMonthlyZAR),
      ],
      [
        'Revenue per sqm / month',
        formatZar(document.settings.revenuePerSqmMonthlyZAR),
      ],
      [
        'Suggest store size from turnover',
        document.settings.suggestStoreSizeFromTurnover ? 'Yes' : 'No',
      ],
    ],
    columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: CONTENT_W - 70 } },
  });

  addSectionTitle(ctx, 'Brand turnover assumptions (monthly)');
  addTable(ctx, {
    head: [['Brand', 'Monthly turnover']],
    body: document.settings.brandTurnovers.map((row) => [
      row.brand,
      formatZar(row.monthlyZAR),
    ]),
    columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: CONTENT_W - 70 } },
  });

  addSectionTitle(ctx, 'Maturity curve (~24 months)');
  addParagraph(
    ctx,
    'Contractors rarely switch overnight. The ramp below is progress toward the mature potential band. Exceptional sites may mature by 18 months; tougher markets 30–36.',
  );
  addTable(ctx, {
    head: [['Phase', 'Months', 'Of mature potential']],
    body: MARKET_CAPTURE_PHASES.map((phase) => [
      phase.phase,
      `${phase.monthStart}–${phase.monthEnd - 1}`,
      `${Math.round(phase.captureLowPct * 100)}–${Math.round(phase.captureHighPct * 100)}%`,
    ]),
  });

  addSectionTitle(ctx, 'How to read the model');
  for (const note of SIMULATION_EXPORT_METHOD_NOTES) {
    addParagraph(ctx, `• ${note}`, false);
  }
}

function addKpiGrid(
  ctx: PdfCursor,
  cells: { label: string; value: string }[],
): void {
  if (cells.length === 0) return;
  const gap = 3;
  const boxW = (CONTENT_W - gap) / 2;
  const boxH = 14;
  const rows = Math.ceil(cells.length / 2);
  ensureSpace(ctx, rows * (boxH + gap) + 1);

  cells.forEach((cell, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN_X + col * (boxW + gap);
    const y = ctx.y + row * (boxH + gap);
    ctx.doc.setFillColor(...COLOR_BOX);
    ctx.doc.setDrawColor(...COLOR_LINE);
    ctx.doc.setLineWidth(0.2);
    ctx.doc.roundedRect(x, y, boxW, boxH, 1, 1, 'FD');
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(7);
    ctx.doc.setTextColor(...COLOR_MUTED);
    ctx.doc.text(cell.label, x + 2.4, y + 4.4);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(10);
    ctx.doc.setTextColor(...COLOR_TEXT);
    const valueLines = ctx.doc.splitTextToSize(cell.value, boxW - 4.8) as string[];
    ctx.doc.text(valueLines[0] ?? '—', x + 2.4, y + 11);
  });

  ctx.y += rows * (boxH + gap) + 2;
}

function addStoreFormat(ctx: PdfCursor, zone: SimulationExportZone): void {
  if (!zone.storeFormat) return;
  ensureSpace(ctx, 28);
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...COLOR_TEXT);
  ctx.doc.text('Recommended BitDrywall store', MARGIN_X, ctx.y);
  ctx.y += 3;
  addTable(ctx, {
    body: [
      ['Recommended format', zone.storeFormat.label],
      ['Best office size', `${zone.storeFormat.sizeSqm.toLocaleString()} m²`],
      ['Format size range', zone.storeFormat.sizeRange],
      ['Target monthly turnover', zone.storeFormat.turnoverRange],
    ],
    columnStyles: {
      0: { cellWidth: 70, textColor: COLOR_MUTED },
      1: { cellWidth: CONTENT_W - 70, fontStyle: 'bold', halign: 'right' },
    },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 1.3 },
  });
}

function addBrandBars(ctx: PdfCursor, brands: SimulationExportBrandMix[]): void {
  const rows = [...brands]
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand));
  if (rows.length === 0) return;

  const maxCount = Math.max(...rows.map((row) => row.count), 1);
  const labelW = 34;
  const barH = 5;
  const rowH = 7.2;
  ensureSpace(ctx, rows.length * rowH + 4);

  for (const row of rows) {
    const xBar = MARGIN_X + labelW;
    const maxBarW = CONTENT_W - labelW - 12;
    const barW = Math.max((row.count / maxCount) * maxBarW, 1.8);
    const fill = parseHexColor(brandChartColor(asBrandKey(row.brand)));
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(7);
    ctx.doc.setTextColor(...COLOR_MUTED);
    ctx.doc.text(row.brand, MARGIN_X, ctx.y + 3.6);
    ctx.doc.setFillColor(...fill);
    ctx.doc.roundedRect(xBar, ctx.y, barW, barH, 0.6, 0.6, 'F');
    ctx.doc.setTextColor(...COLOR_TEXT);
    ctx.doc.text(String(row.count), xBar + barW + 1.6, ctx.y + 3.6);
    ctx.y += rowH;
  }
  ctx.y += 1;
}

function categoryLegend(brands: SimulationExportBrandMix[]): string {
  const totals = new Map<'retailer' | 'sd', number>();
  let total = 0;
  for (const row of brands) {
    total += row.count;
    const category = resolveCompetitorCategory(asBrandKey(row.brand));
    totals.set(category, (totals.get(category) ?? 0) + row.count);
  }
  const parts = [`${total} total`];
  for (const key of ['retailer', 'sd'] as const) {
    const count = totals.get(key) ?? 0;
    if (count > 0) parts.push(`${CATEGORY_LABELS[key]} (${count})`);
  }
  return parts.join('  ·  ');
}

function groupCompetitorsByBrand(
  zone: SimulationExportZone,
): { brand: string; stores: SimulationExportCompetitor[] }[] {
  const grouped = new Map<string, SimulationExportCompetitor[]>();
  for (const competitor of zone.competitors) {
    const list = grouped.get(competitor.brand) ?? [];
    list.push(competitor);
    grouped.set(competitor.brand, list);
  }
  const ordered: { brand: string; stores: SimulationExportCompetitor[] }[] = [];
  for (const row of zone.brands) {
    const stores = grouped.get(row.brand);
    if (stores && stores.length > 0) {
      ordered.push({ brand: row.brand, stores });
      grouped.delete(row.brand);
    }
  }
  for (const [brand, stores] of grouped) {
    if (stores.length > 0) ordered.push({ brand, stores });
  }
  return ordered;
}

function addCompetitorList(ctx: PdfCursor, zone: SimulationExportZone): void {
  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...COLOR_TEXT);
  ensureSpace(ctx, 10);
  ctx.doc.text('Competitors in radius', MARGIN_X, ctx.y);
  ctx.y += 3;

  if (zone.competitors.length === 0) {
    addParagraph(ctx, 'No geocoded competitors in this bubble.');
    return;
  }

  addBrandBars(ctx, zone.brands);
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(7.5);
  ctx.doc.setTextColor(...COLOR_MUTED);
  const legend = categoryLegend(zone.brands);
  const legendLines = ctx.doc.splitTextToSize(legend, CONTENT_W) as string[];
  ensureSpace(ctx, legendLines.length * 3.6 + 2);
  ctx.doc.text(legendLines, MARGIN_X, ctx.y);
  ctx.y += legendLines.length * 3.6 + 3;

  let remaining = MAX_COMPETITOR_NAMES;
  let shownCount = 0;
  for (const group of groupCompetitorsByBrand(zone)) {
    if (remaining <= 0) break;
    const shown = group.stores.slice(0, remaining);
    remaining -= shown.length;
    shownCount += shown.length;
    ensureSpace(ctx, 6 + shown.length * 5.5);
    ctx.doc.setFont('helvetica', 'bold');
    ctx.doc.setFontSize(7.5);
    ctx.doc.setTextColor(...COLOR_MUTED);
    ctx.doc.text(`${group.brand} (${group.stores.length})`, MARGIN_X, ctx.y);
    ctx.y += 3.8;
    for (const store of shown) {
      const address = shortenCompetitorAddress(store.address);
      const line = `${store.name} — ${address}`;
      ctx.doc.setFont('helvetica', 'normal');
      ctx.doc.setFontSize(8);
      ctx.doc.setTextColor(...COLOR_TEXT);
      const wrapped = ctx.doc.splitTextToSize(line, CONTENT_W) as string[];
      ctx.doc.text(wrapped[0] ?? line, MARGIN_X, ctx.y);
      ctx.y += 5.5;
    }
  }
  const extra = zone.competitors.length - shownCount;
  if (extra > 0) {
    ctx.doc.setFont('helvetica', 'normal');
    ctx.doc.setFontSize(7);
    ctx.doc.setTextColor(...COLOR_MUTED);
    ctx.doc.text(`+${extra} more in this radius`, MARGIN_X, ctx.y);
    ctx.y += 4.5;
  }
  ctx.y += 1;
}

function addTrendChart(
  ctx: PdfCursor,
  timeline: SimulationExportTimelinePoint[],
): void {
  if (timeline.length === 0) return;
  const chartH = 36;
  const axisW = 16;
  const plotW = CONTENT_W - axisW;
  const legendH = 6;
  ensureSpace(ctx, chartH + legendH + 10);

  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...COLOR_TEXT);
  ctx.doc.text('Monthly turnover trend', MARGIN_X, ctx.y);
  ctx.y += 4;

  const plotLeft = MARGIN_X + axisW;
  const plotTop = ctx.y;
  const plotBottom = plotTop + chartH;
  const values = timeline.flatMap((point) => [
    point.lowZAR,
    point.midZAR,
    point.highZAR,
  ]);
  const maxV = Math.max(...values, 1);
  const minMonth = timeline[0]!.month;
  const maxMonth = timeline[timeline.length - 1]!.month;
  const monthSpan = Math.max(maxMonth - minMonth, 1);

  function xOf(month: number): number {
    return plotLeft + ((month - minMonth) / monthSpan) * plotW;
  }
  function yOf(value: number): number {
    return plotBottom - (value / maxV) * chartH;
  }

  ctx.doc.setDrawColor(...COLOR_LINE);
  ctx.doc.setLineWidth(0.2);
  const ticks = 4;
  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(6.5);
  ctx.doc.setTextColor(...COLOR_MUTED);
  for (let i = 0; i <= ticks; i++) {
    const value = (maxV / ticks) * i;
    const y = yOf(value);
    ctx.doc.setLineDashPattern([0.8, 0.8], 0);
    ctx.doc.line(plotLeft, y, plotLeft + plotW, y);
    ctx.doc.setLineDashPattern([], 0);
    ctx.doc.text(formatZarShort(value).replace('R ', ''), MARGIN_X, y + 1.1);
  }

  function drawSeries(
    key: 'lowZAR' | 'midZAR' | 'highZAR',
    color: [number, number, number],
    dashed: boolean,
    withDots: boolean,
  ): void {
    ctx.doc.setDrawColor(...color);
    ctx.doc.setLineWidth(key === 'midZAR' ? 0.7 : 0.45);
    if (dashed) ctx.doc.setLineDashPattern([1.4, 1.1], 0);
    else ctx.doc.setLineDashPattern([], 0);
    for (let i = 1; i < timeline.length; i++) {
      const prev = timeline[i - 1]!;
      const next = timeline[i]!;
      ctx.doc.line(xOf(prev.month), yOf(prev[key]), xOf(next.month), yOf(next[key]));
    }
    ctx.doc.setLineDashPattern([], 0);
    if (!withDots) return;
    ctx.doc.setFillColor(...color);
    for (const point of timeline) {
      ctx.doc.circle(xOf(point.month), yOf(point[key]), 0.7, 'F');
    }
  }

  drawSeries('highZAR', COLOR_HIGH, true, false);
  drawSeries('lowZAR', COLOR_LOW, true, false);
  drawSeries('midZAR', COLOR_MID, false, true);

  const labelMonths = [0, 6, 12, 18, 24, 30, 36];
  ctx.doc.setFontSize(6.5);
  ctx.doc.setTextColor(...COLOR_MUTED);
  for (const month of labelMonths) {
    if (month < minMonth || month > maxMonth) continue;
    ctx.doc.text(`M${month}`, xOf(month), plotBottom + 3.6, { align: 'center' });
  }

  ctx.y = plotBottom + 8;
  const legend = [
    { label: 'Low', color: COLOR_LOW },
    { label: 'Expected', color: COLOR_MID },
    { label: 'High', color: COLOR_HIGH },
  ];
  let legendX = MARGIN_X + 8;
  ctx.doc.setFontSize(7.5);
  for (const item of legend) {
    ctx.doc.setFillColor(...item.color);
    ctx.doc.circle(legendX, ctx.y - 1, 1.2, 'F');
    ctx.doc.setTextColor(...COLOR_MUTED);
    ctx.doc.text(item.label, legendX + 3.2, ctx.y);
    legendX += 28;
  }
  ctx.y += 5;
}

function addSiteHeader(
  ctx: PdfCursor,
  zone: SimulationExportZone,
  document: SimulationExportDocument,
): void {
  const title = `#${zone.rank} ${zone.title}`;
  const erpLabel = document.meta.erpMonthLabel ?? 'this month';

  ctx.doc.setFont('helvetica', 'bold');
  ctx.doc.setFontSize(13);
  ctx.doc.setTextColor(...COLOR_TEXT);
  ctx.doc.text(title, MARGIN_X, ctx.y);
  ctx.doc.text(formatShort(zone.simulatedMonthlyZAR), PAGE_W - MARGIN_X, ctx.y, {
    align: 'right',
  });
  ctx.y += 5;

  ctx.doc.setFont('helvetica', 'normal');
  ctx.doc.setFontSize(8);
  ctx.doc.setTextColor(...COLOR_MUTED);
  const formatBit = zone.storeFormat
    ? `${zone.storeFormat.label} · ${zone.storeFormat.sizeSqm.toLocaleString()} m²`
    : null;
  const subtitle = [
    `${zone.competitorCount} hardwares`,
    `pool ${formatShort(zone.addressablePoolZAR)}/mo`,
    zone.competitionLabel,
    formatBit,
  ]
    .filter(Boolean)
    .join(' · ');
  const subLines = ctx.doc.splitTextToSize(subtitle, CONTENT_W - 28) as string[];
  ctx.doc.text(subLines, MARGIN_X, ctx.y);
  ctx.doc.text(
    zone.actualMonthlyZAR != null ? `ERP ${formatShort(zone.actualMonthlyZAR)}` : 'Simulated',
    PAGE_W - MARGIN_X,
    ctx.y,
    { align: 'right' },
  );
  ctx.y += subLines.length * 3.6 + 2;

  const radiusBits = [
    `Radius ${zone.radiusKm.toFixed(0)} km`,
    `${zone.competitorCount} competitors`,
    `${zone.clientCount} clients`,
    zone.monthsToMature != null ? `~${zone.monthsToMature} mo to mature` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  ctx.doc.setFontSize(8);
  ctx.doc.text(radiusBits, MARGIN_X, ctx.y);
  ctx.y += 5;

  const captureLow = formatPctPoints(document.settings.captureLowPct);
  const captureHigh = formatPctPoints(document.settings.captureHighPct);
  const kpis: { label: string; value: string }[] = [
    { label: 'Addressable pool', value: formatShort(zone.addressablePoolZAR) },
    {
      label: `Potential (${captureLow}–${captureHigh}%)`,
      value: `${formatShort(zone.potentialLowZAR)} – ${formatShort(zone.potentialHighZAR)}`,
    },
    { label: 'Mature mid (model)', value: formatShort(zone.simulatedMonthlyZAR) },
    {
      label: `ERP actual (${erpLabel})`,
      value: formatShort(zone.actualMonthlyZAR),
    },
  ];

  switch (zone.kind) {
    case 'catchment':
      kpis.push(
        {
          label: 'Floor size',
          value:
            zone.floorSizeSqm != null
              ? `${zone.floorSizeSqm.toLocaleString()} m²`
              : 'Not set',
        },
        {
          label: 'Capacity ceiling',
          value: zone.capacityCeilingZAR != null
            ? `${formatShort(zone.capacityCeilingZAR)}/mo`
            : '—',
        },
        {
          label: 'Variance vs model',
          value:
            zone.varianceZAR != null
              ? `${formatShort(zone.varianceZAR)}${
                  zone.variancePct != null
                    ? ` (${zone.variancePct > 0 ? '+' : ''}${zone.variancePct.toFixed(0)}%)`
                    : ''
                }`
              : '—',
        },
        {
          label: 'Reps needed',
          value: zone.repsRequired != null ? String(zone.repsRequired) : '—',
        },
      );
      break;
    case 'greenfield':
      break;
    default: {
      const _exhaustive: never = zone.kind;
      return _exhaustive;
    }
  }

  addKpiGrid(ctx, kpis);
}

function addSitePage(
  ctx: PdfCursor,
  zone: SimulationExportZone,
  document: SimulationExportDocument,
): void {
  ctx.continuationTitle = `${zoneKindLabel(zone.kind)} #${zone.rank} ${zone.title} (continued)`;
  addSiteHeader(ctx, zone, document);
  addStoreFormat(ctx, zone);
  addCompetitorList(ctx, zone);
  addTrendChart(ctx, zone.captureTimeline);

  if (zone.milestones.length > 0) {
    addTable(ctx, {
      body: zone.milestones.map((m) => [
        m.label,
        `${formatShort(m.lowZAR)} – ${formatShort(m.highZAR)}`,
      ]),
      columnStyles: {
        0: { cellWidth: 50, textColor: COLOR_MUTED },
        1: { cellWidth: CONTENT_W - 50, halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [255, 255, 255] },
      styles: { fontSize: 8, cellPadding: 1.1 },
    });
  }
  ctx.continuationTitle = null;
}

function addSitePages(ctx: PdfCursor, document: SimulationExportDocument): void {
  const zones = [...document.catchments, ...document.opportunities];
  for (const zone of zones) {
    ctx.doc.addPage();
    ctx.y = MARGIN_TOP;
    addSitePage(ctx, zone, document);
  }
}

function addClosingSummary(
  ctx: PdfCursor,
  document: SimulationExportDocument,
): void {
  ctx.doc.addPage();
  ctx.y = MARGIN_TOP;
  addSectionTitle(ctx, 'Summary');
  addParagraph(
    ctx,
    'Ranked modelled monthly turnover for this run. Compare sites side by side. Overlapping catchments can double-count the same hardware — do not sum pools into a national total.',
    false,
  );

  if (document.catchments.length > 0) {
    addSectionTitle(ctx, `Catchment ranking (${document.catchments.length})`);
    addTable(ctx, {
      head: [[
        '#',
        'Branch',
        'Comp.',
        'Pool',
        'Potential',
        'Model',
        'ERP',
        'Gap',
        'Mo.',
        'Format',
      ]],
      body: document.catchments.map((z) => [
        String(z.rank),
        z.title,
        String(z.competitorCount),
        formatShort(z.addressablePoolZAR),
        `${formatShort(z.potentialLowZAR)} – ${formatShort(z.potentialHighZAR)}`,
        formatShort(z.simulatedMonthlyZAR),
        formatShort(z.actualMonthlyZAR),
        formatShort(z.varianceZAR),
        z.monthsToMature != null ? String(z.monthsToMature) : '—',
        z.storeFormat?.label ?? '—',
      ]),
      styles: { fontSize: 7, cellPadding: 1.1 },
      headStyles: { fontSize: 6.5, fillColor: COLOR_HEAD, fontStyle: 'bold' },
    });
  }

  if (document.opportunities.length > 0) {
    addSectionTitle(ctx, `Opportunity ranking (${document.opportunities.length})`);
    addTable(ctx, {
      head: [[
        '#',
        'Site',
        'Comp.',
        'Pool',
        'Nearest',
        'Model',
        'Format',
      ]],
      body: document.opportunities.map((z) => [
        String(z.rank),
        z.title,
        String(z.competitorCount),
        formatShort(z.addressablePoolZAR),
        z.nearestBranchKm != null ? `${z.nearestBranchKm.toFixed(1)} km` : '—',
        formatShort(z.simulatedMonthlyZAR),
        z.storeFormat?.label ?? '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 1.2 },
      headStyles: { fontSize: 7, fillColor: COLOR_HEAD, fontStyle: 'bold' },
    });
  }

  addSectionTitle(ctx, 'Methodology');
  addParagraph(
    ctx,
    'Feasibility model for BitDrywall branch catchments and opportunity sites — ranking upside and ramp time, not a guaranteed forecast. Circles use crow-flies distance, not drive time. New sites are placed at competitor-cluster centroids, separated from existing branches by the configured minimum distance.',
  );
  addParagraph(
    ctx,
    'Year targets (of local market): Year 1 ~ 8%, Year 2 ~ 13%, Year 3 ~ 15% (up to 20% in exceptional locations).',
  );
}

/**
 * Render a readable A4 PDF briefing and trigger a browser download.
 */
export function downloadSimulationExportPdf(
  document: SimulationExportDocument,
): void {
  const { jsPDF: JsPDF, autoTable } = loadPdfLibs();
  const doc = new JsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const ctx: PdfCursor = { doc, y: MARGIN_TOP, autoTable, continuationTitle: null };

  addCover(ctx, document);
  addAssumptions(ctx, document);
  addSitePages(ctx, document);
  addClosingSummary(ctx, document);

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);
    drawChrome(doc, page, pageCount);
  }

  const filename = buildSimulationExportFilename(document);
  const blob = doc.output('blob') as Blob;
  downloadBlob(blob, filename);
}
