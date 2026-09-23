import type { MapMarkerBase } from '@/api/types/map';
import type { BrandCount, HardwareBrandKey } from '@/api/types/site-opportunity';

/**
 * Monthly turnover (ZAR) per store.
 * Hardware and direct rates match the market-analysis sheet (turnover ÷ qty).
 */
export const HARDWARE_TURNOVER_ZAR: Record<HardwareBrandKey, number> = {
	BUCO: 2_000_000,
	CASHBUILD: 3_000_000,
	'BUILD IT': 2_500_000,
	BUILDERS: 2_800_000,
	POWERBUILD: 3_100_000,
	EST: 3_200_000,
	'BOXER BUILD': 2_400_000,
	'FB MART': 4_200_000,
	'SOLID CEILING': 3_166_667,
	OWA: 4_666_667,
	PELICAN: 3_250_000,
	CAPCO: 4_250_000,
	CDS: 1_500_000,
	SUPERTEC: 2_600_000,
	UBS: 1_300_000,
	'P&L HARDWARE': 3_500_000,
	OTHER: 3_500_000,
};

/** Map marker background colors by hardware brand (Tailwind-aligned hex). */
export const HARDWARE_BRAND_MARKER_COLORS: Record<HardwareBrandKey, string> = {
	BUCO: '#f59e0b',
	CASHBUILD: '#dc2626',
	'BUILD IT': '#dc2626',
	BUILDERS: '#2563eb',
	POWERBUILD: '#dc2626',
	EST: '#dc2626',
	'BOXER BUILD': '#b45309',
	'FB MART': '#0f766e',
	'SOLID CEILING': '#0369a1',
	OWA: '#1d4ed8',
	PELICAN: '#6d28d9',
	CAPCO: '#be123c',
	CDS: '#0e7490',
	SUPERTEC: '#4d7c0f',
	UBS: '#a16207',
	'P&L HARDWARE': '#dc2626',
	OTHER: '#dc2626',
};

/** Distinct palette for charts/legends (map pins stay on HARDWARE_BRAND_MARKER_COLORS). */
export const HARDWARE_BRAND_CHART_COLORS: Record<HardwareBrandKey, string> = {
	BUCO: '#f59e0b',
	CASHBUILD: '#dc2626',
	'BUILD IT': '#2563eb',
	BUILDERS: '#0891b2',
	POWERBUILD: '#0d9488',
	EST: '#7c3aed',
	'BOXER BUILD': '#b45309',
	'FB MART': '#0f766e',
	'SOLID CEILING': '#0369a1',
	OWA: '#1d4ed8',
	PELICAN: '#6d28d9',
	CAPCO: '#be123c',
	CDS: '#0e7490',
	SUPERTEC: '#4d7c0f',
	UBS: '#a16207',
	'P&L HARDWARE': '#ea580c',
	OTHER: '#64748b',
};

export function brandMarkerColor(brand: HardwareBrandKey): string {
	return HARDWARE_BRAND_MARKER_COLORS[brand] ?? HARDWARE_BRAND_MARKER_COLORS.OTHER;
}

export function brandChartColor(brand: HardwareBrandKey): string {
	return HARDWARE_BRAND_CHART_COLORS[brand] ?? HARDWARE_BRAND_CHART_COLORS.OTHER;
}

const BRAND_ALIASES: Record<string, HardwareBrandKey> = {
	BUCO: 'BUCO',
	CASHBUILD: 'CASHBUILD',
	'BUILD IT': 'BUILD IT',
	BUILDIT: 'BUILD IT',
	'BUILDERS WAREHOUSE': 'BUILDERS',
	'BUILDERS EXPRESS': 'BUILDERS',
	'BUILDERS SUPERSTORE': 'BUILDERS',
	'BUILDERS TRADE DEPOT': 'BUILDERS',
	BUILDERS: 'BUILDERS',
	BEX: 'BUILDERS',
	POWERBUILD: 'POWERBUILD',
	'POWER BUILD': 'POWERBUILD',
	EST: 'EST',
	'EST STORES': 'EST',
	'BOXER BUILD': 'BOXER BUILD',
	BOXERBUILD: 'BOXER BUILD',
	BOXER: 'BOXER BUILD',
	'FB MART': 'FB MART',
	FBMART: 'FB MART',
	'FB-MART': 'FB MART',
	'SOLID CEILING': 'SOLID CEILING',
	SOLID: 'SOLID CEILING',
	OWA: 'OWA',
	PELICAN: 'PELICAN',
	CAPCO: 'CAPCO',
	CDS: 'CDS',
	SUPERTEC: 'SUPERTEC',
	UBS: 'UBS',
	'P&L HARDWARE': 'P&L HARDWARE',
	'P&L': 'P&L HARDWARE',
};

function normalizeBrandToken(raw: string): HardwareBrandKey {
	const upper = raw.trim().toUpperCase();
	const exact = BRAND_ALIASES[upper];
	if (exact) return exact;
	let bestKey = '';
	let best: HardwareBrandKey | null = null;
	for (const [key, value] of Object.entries(BRAND_ALIASES)) {
		if (upper.startsWith(key) && key.length > bestKey.length) {
			bestKey = key;
			best = value;
		}
	}
	return best ?? 'OTHER';
}

type HardwareBrandInput = Pick<MapMarkerBase, 'name'> & {
	accountName?: string | null;
	LegalEntity?: string | null;
};

/** Resolve hardware brand from marker name prefix, accountName, or LegalEntity. */
export function resolveHardwareBrand(marker: HardwareBrandInput): HardwareBrandKey {
	const accountName = marker.accountName ?? marker.LegalEntity;
	if (typeof accountName === 'string' && accountName.trim()) {
		return normalizeBrandToken(accountName);
	}

	const name = String(marker.name ?? '').trim();
	const dashIdx = name.indexOf(' – ');
	const hyphenIdx = name.indexOf(' - ');
	const splitIdx =
		dashIdx >= 0 && hyphenIdx >= 0
			? Math.min(dashIdx, hyphenIdx)
			: Math.max(dashIdx, hyphenIdx);
	if (splitIdx > 0) {
		return normalizeBrandToken(name.slice(0, splitIdx));
	}

	return normalizeBrandToken(name);
}

export function brandTurnoverZAR(brand: HardwareBrandKey): number {
	return HARDWARE_TURNOVER_ZAR[brand];
}

export function countByBrand(markers: MapMarkerBase[]): BrandCount[] {
	const counts = new Map<HardwareBrandKey, number>();
	for (const m of markers) {
		const brand = resolveHardwareBrand(m);
		counts.set(brand, (counts.get(brand) ?? 0) + 1);
	}
	return Array.from(counts.entries())
		.map(([brand, count]) => ({
			brand,
			count,
			turnoverZAR: count * brandTurnoverZAR(brand),
		}))
		.sort((a, b) => b.turnoverZAR - a.turnoverZAR);
}

export function sumAddressablePool(markers: MapMarkerBase[]): number {
	return countByBrand(markers).reduce((s, b) => s + b.turnoverZAR, 0);
}
