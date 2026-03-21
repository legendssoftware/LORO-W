/** TanStack Query keys for `/settings` org data (invalidate after mutations). */
export function settingsOrgProfileKey(orgRef: string) {
  return ['settings', 'org', orgRef, 'profile'] as const;
}

export function settingsOrgAppearanceKey(orgRef: string) {
  return ['settings', 'org', orgRef, 'appearance'] as const;
}

export function settingsOrgSettingsKey(orgRef: string) {
  return ['settings', 'org', orgRef, 'settings'] as const;
}

export function settingsOrgHoursKey(orgRef: string) {
  return ['settings', 'org', orgRef, 'hours'] as const;
}

export function settingsOrgBranchesKey(orgRef: string) {
  return ['settings', 'org', orgRef, 'branches'] as const;
}

/** Global branch list key used by `useBranches` — invalidate alongside settings branch mutations. */
export const BRANCHES_LIST_QUERY_KEY = ['branches'] as const;
