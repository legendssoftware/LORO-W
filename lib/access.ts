/**
 * Role-based access: allowed routes and route guards for loro-web.
 * Standard users can only access dashboard.
 */

/** Paths any signed-in user with "standard" role can access (view-only scope) */
export const STANDARD_USER_PATHS = ['/dashboard'] as const;

export type StandardUserPath = (typeof STANDARD_USER_PATHS)[number];

/** Paths that do not require role checks (public or auth-only) */
export const PUBLIC_OR_AUTH_PATHS = [
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/onboarding',
] as const;

/**
 * Access levels that are restricted to STANDARD_USER_PATHS only.
 * All other roles (e.g. owner, admin, manager) can access any route.
 */
const RESTRICTED_ACCESS_LEVELS = new Set<string>([
  'user',
  'member',
  'technician',
  'support',
  'developer',
  'analyst',
  'accountant',
  'auditor',
  'consultant',
  'coordinator',
  'specialist',
  'trainer',
  'researcher',
  'officer',
  'cashier',
  'receptionist',
  'secretary',
  'security',
  'cleaner',
  'maintenance',
  'event planner',
  'marketing',
  'hr',
  'finance',
  'accounting',
  'legal',
  'operations',
  'it',
  'development',
  'design',
]);

/** Normalize access level for comparison (lowercase) */
function normalize(accessLevel: string | undefined): string {
  if (accessLevel == null || accessLevel === '') return '';
  return accessLevel.toLowerCase().trim();
}

/**
 * Returns whether the given path is allowed for the given access level.
 * - Public/auth paths are always allowed.
 * - Restricted roles only get STANDARD_USER_PATHS.
 * - Non-restricted roles (e.g. owner, admin, manager) can access any path.
 */
export function canAccess(
  path: string,
  accessLevel: string | undefined
): boolean {
  const pathNormalized = path.replace(/\/$/, '') || '/';
  const level = normalize(accessLevel);

  if (PUBLIC_OR_AUTH_PATHS.some((p) => pathNormalized === p || pathNormalized.startsWith(p + '/'))) {
    return true;
  }

  if (!level) {
    return true;
  }

  if (RESTRICTED_ACCESS_LEVELS.has(level)) {
    return STANDARD_USER_PATHS.some(
      (p) => pathNormalized === p || pathNormalized.startsWith(p + '/')
    );
  }

  return true;
}

/** Nav item for header */
export interface AllowedRoute {
  path: string;
  label: string;
}

/**
 * Staff sidebar nav items (path + label). Visible only to admin, manager, owner, etc.
 */
export const STAFF_SIDEBAR_ROUTES: { path: string; label: string }[] = [
  { path: '/dashboard', label: 'Dashboard' },
];

/**
 * Returns whether the staff dashboard (e.g. expanded nav) is visible.
 * True for admin, manager, owner and other non-restricted roles; false for user and empty.
 */
export function isStaffDashboardVisible(accessLevel: string | undefined): boolean {
  const level = normalize(accessLevel);
  if (!level) return false;
  return !RESTRICTED_ACCESS_LEVELS.has(level);
}

/**
 * Returns nav items (path + label) to show for the given access level.
 * Standard users see only Dashboard.
 */
export function getAllowedRoutes(accessLevel: string | undefined): AllowedRoute[] {
  const level = normalize(accessLevel);

  const fullNav: AllowedRoute[] = [{ path: '/dashboard', label: 'Dashboard' }];

  if (!level || !RESTRICTED_ACCESS_LEVELS.has(level)) {
    return fullNav;
  }

  return fullNav.filter((r) =>
    STANDARD_USER_PATHS.some((p) => p === r.path || r.path.startsWith(p))
  );
}
