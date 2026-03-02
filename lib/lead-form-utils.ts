/**
 * Shared option arrays for lead forms (create/edit) and filters.
 * Values match server LeadStatus, LeadSource, LeadTemperature, LeadPriority enums.
 */

export const LEAD_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const LEAD_STATUS_OPTIONS_WITH_ALL: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  ...LEAD_STATUS_OPTIONS,
];

export const LEAD_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'COLD_CALL', label: 'Cold call' },
  { value: 'SOCIAL_MEDIA', label: 'Social media' },
  { value: 'EMAIL_CAMPAIGN', label: 'Email campaign' },
  { value: 'TRADE_SHOW', label: 'Trade show' },
  { value: 'ADVERTISING', label: 'Advertising' },
  { value: 'OTHER', label: 'Other' },
];

export const LEAD_SOURCE_OPTIONS_WITH_ALL: { value: string; label: string }[] = [
  { value: 'all', label: 'All sources' },
  ...LEAD_SOURCE_OPTIONS,
];

export const LEAD_TEMPERATURE_OPTIONS: { value: string; label: string }[] = [
  { value: 'HOT', label: 'Hot' },
  { value: 'WARM', label: 'Warm' },
  { value: 'COLD', label: 'Cold' },
  { value: 'FROZEN', label: 'Frozen' },
];

export const LEAD_TEMPERATURE_OPTIONS_WITH_ALL: { value: string; label: string }[] = [
  { value: 'all', label: 'All temperatures' },
  ...LEAD_TEMPERATURE_OPTIONS,
];

export const LEAD_PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

/** Industry (server Industry enum). */
export const INDUSTRY_OPTIONS: { value: string; label: string }[] = [
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'HOME_OWNER', label: 'Home owner' },
  { value: 'TECHNOLOGY', label: 'Technology' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'REAL_ESTATE', label: 'Real estate' },
  { value: 'AUTOMOTIVE', label: 'Automotive' },
  { value: 'AGRICULTURE', label: 'Agriculture' },
  { value: 'ENERGY', label: 'Energy' },
  { value: 'TELECOMMUNICATIONS', label: 'Telecommunications' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'HOSPITALITY', label: 'Hospitality' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'NON_PROFIT', label: 'Non-profit' },
  { value: 'CONSULTING', label: 'Consulting' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'LEGAL', label: 'Legal' },
  { value: 'OTHER', label: 'Other' },
];

/** Business size (server BusinessSize enum). */
export const BUSINESS_SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: 'STARTUP', label: 'Startup (1-10)' },
  { value: 'SMALL', label: 'Small (11-50)' },
  { value: 'MEDIUM', label: 'Medium (51-200)' },
  { value: 'LARGE', label: 'Large (201-1000)' },
  { value: 'ENTERPRISE', label: 'Enterprise (1000+)' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

/** Decision maker role (server DecisionMakerRole enum). */
export const DECISION_MAKER_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'CEO', label: 'CEO' },
  { value: 'CTO', label: 'CTO' },
  { value: 'CFO', label: 'CFO' },
  { value: 'CMO', label: 'CMO' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'ANALYST', label: 'Analyst' },
  { value: 'COORDINATOR', label: 'Coordinator' },
  { value: 'SPECIALIST', label: 'Specialist' },
  { value: 'CONSULTANT', label: 'Consultant' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'OTHER', label: 'Other' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

/** Lead intent (server LeadIntent enum). Subset for form. */
export const LEAD_INTENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'PURCHASE', label: 'Purchase' },
  { value: 'ENQUIRY', label: 'Enquiry' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'QUOTE_REQUEST', label: 'Quote request' },
  { value: 'DEMO_REQUEST', label: 'Demo request' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

/** Lifecycle stage (server LeadLifecycleStage enum). */
export const LIFECYCLE_STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'SUBSCRIBER', label: 'Subscriber' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'MARKETING_QUALIFIED_LEAD', label: 'Marketing qualified' },
  { value: 'SALES_QUALIFIED_LEAD', label: 'Sales qualified' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'EVANGELIST', label: 'Evangelist' },
];

/** Budget range (server BudgetRange enum). */
export const BUDGET_RANGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'UNDER_1K', label: 'Under R1k' },
  { value: 'R1K_5K', label: 'R1k - R5k' },
  { value: 'R5K_10K', label: 'R5k - R10k' },
  { value: 'R10K_25K', label: 'R10k - R25k' },
  { value: 'R25K_50K', label: 'R25k - R50k' },
  { value: 'R50K_100K', label: 'R50k - R100k' },
  { value: 'R100K_250K', label: 'R100k - R250k' },
  { value: 'OVER_1M', label: 'Over R1M' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

/** Purchase timeline (server Timeline enum). */
export const TIMELINE_OPTIONS: { value: string; label: string }[] = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'SHORT_TERM', label: 'Short term (1-4 weeks)' },
  { value: 'MEDIUM_TERM', label: 'Medium term (1-3 months)' },
  { value: 'LONG_TERM', label: 'Long term (3-6 months)' },
  { value: 'FUTURE', label: 'Future (6+ months)' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

/** Communication preference (server CommunicationPreference enum). */
export const COMMUNICATION_PREFERENCE_OPTIONS: { value: string; label: string }[] = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'SMS', label: 'SMS' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'IN_PERSON', label: 'In person' },
  { value: 'VIDEO_CALL', label: 'Video call' },
  { value: 'SOCIAL_MEDIA', label: 'Social media' },
];

/** Timezone options (APK-style). */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'America/New_York', label: 'America/New York' },
  { value: 'UTC', label: 'UTC' },
];

/** Best contact time (APK-style). */
export const BEST_CONTACT_TIME_OPTIONS: { value: string; label: string }[] = [
  { value: 'business_hours', label: 'Business hours' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
];
