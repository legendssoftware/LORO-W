import type { MapMarkerBase } from '@/api/types/map';
import type { BrandCount, HardwareBrandKey } from '@/api/types/site-opportunity';

/** Estimated monthly turnover (ZAR) per hardware store by brand. */
export const HARDWARE_TURNOVER_ZAR: Record<HardwareBrandKey, number> = {
	BUCO: 2_000_000,
	CASHBUILD: 3_000_000,
	'BUILD IT': 2_500_000,
	POWERBUILD: 3_500_000,
	EST: 3_500_000,
	'P&L HARDWARE': 3_500_000,
	OTHER: 3_500_000,
};

/** Map marker background colors by hardware brand (Tailwind-aligned hex). */
export const HARDWARE_BRAND_MARKER_COLORS: Record<HardwareBrandKey, string> = {
	BUCO: '#f59e0b',
	CASHBUILD: '#dc2626',
	'BUILD IT': '#dc2626',
	POWERBUILD: '#dc2626',
	EST: '#dc2626',
	'P&L HARDWARE': '#dc2626',
	OTHER: '#dc2626',
};

export function brandMarkerColor(brand: HardwareBrandKey): string {
	return HARDWARE_BRAND_MARKER_COLORS[brand] ?? HARDWARE_BRAND_MARKER_COLORS.OTHER;
}

const BRAND_ALIASES: Record<string, HardwareBrandKey> = {
	BUCO: 'BUCO',
	CASHBUILD: 'CASHBUILD',
	'BUILD IT': 'BUILD IT',
	BUILDIT: 'BUILD IT',
	POWERBUILD: 'POWERBUILD',
	EST: 'EST',
	'EST STORES': 'EST',
	'P&L HARDWARE': 'P&L HARDWARE',
	'P&L': 'P&L HARDWARE',
};

function normalizeBrandToken(raw: string): HardwareBrandKey {
	const upper = raw.trim().toUpperCase();
	if (BRAND_ALIASES[upper]) return BRAND_ALIASES[upper];
	for (const [key, value] of Object.entries(BRAND_ALIASES)) {
		if (upper.startsWith(key)) return value;
	}
	return 'OTHER';
}

type HardwareBrandInput = Pick<MapMarkerBase, 'name'> &
	Partial<Pick<MapMarkerBase, 'accountName' | 'LegalEntity'>>;

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
