import type {
	DataQualitySummary,
	MapGeocodingSummary,
} from '@/api/types/site-opportunity';

export function buildSiteOpportunityWarnings(
	dataQuality: DataQualitySummary,
	geocodingSummary?: MapGeocodingSummary | null,
): string[] {
	const warnings: string[] = [];

	if (dataQuality.competitorCoveragePct < 95) {
		warnings.push(
			`Only ${dataQuality.competitorCoveragePct}% of hardware competitors have map coordinates (${dataQuality.competitorsWithCoords}/${dataQuality.totalCompetitors}). Import and geocode competitors (BUCO, CASHBUILD, BUILD IT, POWERBUILD, EST) before trusting pool totals.`,
		);
	} else if (dataQuality.competitorCoveragePct < 100) {
		warnings.push(
			`${dataQuality.totalCompetitors - dataQuality.competitorsWithCoords} competitor(s) lack coordinates and are excluded from 5 km radius counts.`,
		);
	}

	if (dataQuality.clientCoveragePct < 70) {
		warnings.push(
			`Client map coverage is ${dataQuality.clientCoveragePct}% — greenfield filters may exclude areas with real demand.`,
		);
	}

	const compGeo = geocodingSummary?.competitors;
	const failed = compGeo?.failed;
	if (typeof failed === 'number' && failed > 0) {
		warnings.push(
			`${failed} competitor address(es) failed geocoding on this request; fix addresses in CRM and reload the map.`,
		);
	}

	return warnings;
}
