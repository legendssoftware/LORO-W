import * as XLSX from 'xlsx';
import { LEAD_IMPORT_SAMPLE_XLSX_FILENAME } from '@/api/types/leads';

/**
 * Column headers for the downloadable Excel template — aligned with server lead import mapping
 * (see server/src/leads/utils/csv-parser.util.ts).
 */
export const LEAD_IMPORT_SAMPLE_XLSX_HEADERS = [
	'Name',
	'Email',
	'Phone',
	'companyName',
	'title',
	'street',
	'city',
	'state',
	'countryCode',
	'website',
	'categories/0',
	'url',
	'categoryName',
	'Created',
	'Source',
	'Form',
	'Channel',
	'Stage',
	'Owner',
	'Labels',
	'Secondary phone number',
	'WhatsApp number',
	'notes',
	'category',
	'status',
	'intent',
	'temperature',
	'priority',
	'lifecycleStage',
	'jobTitle',
	'decisionMakerRole',
	'industry',
	'businessSize',
	'budgetRange',
	'purchaseTimeline',
	'preferredCommunication',
	'timezone',
	'bestContactTime',
	'painPoints',
	'estimatedValue',
	'competitorInfo',
	'referralSource',
	'campaignName',
	'landingPage',
	'utmSource',
	'utmMedium',
	'utmCampaign',
	'utmTerm',
	'utmContent',
	'leadScore',
	'lastContactDate',
	'nextFollowUpDate',
	'totalInteractions',
	'averageResponseTime',
	'daysSinceLastResponse',
	'customFields',
	'image',
	'attachments',
	'latitude',
	'longitude',
	'userQualityRating',
] as const;

function rowFromMap(
	headers: readonly string[],
	values: Partial<Record<(typeof LEAD_IMPORT_SAMPLE_XLSX_HEADERS)[number], string>>,
): string[] {
	return headers.map((h) => values[h as keyof typeof values] ?? '');
}

/** Maps-style export example (business title + address + phone; name/email optional). */
const MAPS_EXAMPLE: Partial<
	Record<(typeof LEAD_IMPORT_SAMPLE_XLSX_HEADERS)[number], string>
> = {
	Phone: '+27 84 381 7385',
	title: 'Capital Steel and Hardware',
	street: 'Takamine Road',
	city: 'Ganyesa',
	state: 'North West',
	countryCode: 'ZA',
	'categories/0': 'Hardware store',
	url: 'https://www.google.com/maps/search/?api=1&query=Example',
	categoryName: 'Hardware store',
};

/** Classic CRM-style row (name + email + phone + company). */
const CLASSIC_EXAMPLE: Partial<
	Record<(typeof LEAD_IMPORT_SAMPLE_XLSX_HEADERS)[number], string>
> = {
	Name: 'Jane Smith',
	Email: 'jane@example.com',
	Phone: '+27123456789',
	companyName: 'Acme Demo (Pty) Ltd',
	Source: 'REFERRAL',
};

export function buildLeadImportSampleXlsxArrayBuffer(): ArrayBuffer {
	const headers = [...LEAD_IMPORT_SAMPLE_XLSX_HEADERS];
	const aoa = [
		headers,
		rowFromMap(headers, MAPS_EXAMPLE),
		rowFromMap(headers, CLASSIC_EXAMPLE),
	];
	const ws = XLSX.utils.aoa_to_sheet(aoa);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Leads');
	return XLSX.write(wb, { bookType: 'xlsx', type: 'array', bookSST: false });
}

export function triggerDownloadLeadImportSampleXlsx(): void {
	const buf = buildLeadImportSampleXlsxArrayBuffer();
	const blob = new Blob([buf], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = LEAD_IMPORT_SAMPLE_XLSX_FILENAME;
	a.rel = 'noopener';
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
