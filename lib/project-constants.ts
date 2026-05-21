/** Mirrors server ProjectType enum values. */
export const PROJECT_TYPE_VALUES = [
  'residential_house',
  'commercial_building',
  'industrial_facility',
  'retail_space',
  'office_building',
  'warehouse',
  'hotel',
  'restaurant',
  'hospital',
  'school',
  'apartment_complex',
  'shopping_center',
  'infrastructure',
  'renovation',
  'maintenance',
  'other',
] as const;

/** Mirrors server ProjectStatus enum values. */
export const PROJECT_STATUS_VALUES = [
  'planning',
  'design',
  'approved',
  'sourcing',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
  'delayed',
  'review',
] as const;

/** Mirrors server ProjectPriority enum values. */
export const PROJECT_PRIORITY_VALUES = [
  'low',
  'medium',
  'high',
  'urgent',
  'critical',
] as const;

export type ProjectTypeValue = (typeof PROJECT_TYPE_VALUES)[number];
export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];
export type ProjectPriorityValue = (typeof PROJECT_PRIORITY_VALUES)[number];

function toLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const PROJECT_TYPE_OPTIONS = PROJECT_TYPE_VALUES.map((value) => ({
  value,
  label: toLabel(value),
}));

export const PROJECT_STATUS_OPTIONS = PROJECT_STATUS_VALUES.map((value) => ({
  value,
  label: toLabel(value),
}));

export const PROJECT_PRIORITY_OPTIONS = PROJECT_PRIORITY_VALUES.map((value) => ({
  value,
  label: toLabel(value),
}));
