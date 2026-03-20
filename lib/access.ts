/**
 * Role-based access: allowed routes and route guards for loro-web.
 * Standard users can only access dashboard.
 */

/** Paths any signed-in user with "standard" role can access (view-only scope) */
export const STANDARD_USER_PATHS = ["/dashboard", "/visits", "/leads", "/planning"] as const;

export type StandardUserPath = (typeof STANDARD_USER_PATHS)[number];

/** Paths that do not require role checks (public or auth-only) */
export const PUBLIC_OR_AUTH_PATHS = [
    "/",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/onboarding",
] as const;

/**
 * Access levels that are restricted to STANDARD_USER_PATHS only.
 * All other roles (e.g. owner, admin, manager) can access any route.
 */
const RESTRICTED_ACCESS_LEVELS = new Set<string>([
    "user",
    "member",
    "technician",
    "support",
    "developer",
    "analyst",
    "accountant",
    "auditor",
    "consultant",
    "coordinator",
    "specialist",
    "trainer",
    "researcher",
    "officer",
    "cashier",
    "receptionist",
    "secretary",
    "security",
    "cleaner",
    "maintenance",
    "event planner",
    "marketing",
    "hr",
    "finance",
    "accounting",
    "legal",
    "operations",
    "it",
    "development",
    "design",
]);

/** Normalize access level for comparison (lowercase) */
function normalize(accessLevel: string | undefined): string {
    if (accessLevel == null || accessLevel === "") return "";
    return accessLevel.toLowerCase().trim();
}

const ORG_SETTINGS_ACCESS_LEVELS = new Set<string>([
    "admin",
    "owner",
    "manager",
]);

/**
 * Whether the user may open organisation / branch admin settings (web UI).
 */
export function canAccessOrgSettings(accessLevel: string | undefined): boolean {
    const level = normalize(accessLevel);
    if (!level) return false;
    return ORG_SETTINGS_ACCESS_LEVELS.has(level);
}

function isSettingsPath(pathNormalized: string): boolean {
    return (
        pathNormalized === "/settings" ||
        pathNormalized.startsWith("/settings/")
    );
}

/**
 * Returns whether the given path is allowed for the given access level.
 * - Public/auth paths are always allowed.
 * - `/settings` is allowed only for admin, owner, and manager.
 * - Restricted roles only get STANDARD_USER_PATHS.
 * - Non-restricted roles (e.g. owner, admin, manager) can access any path.
 */
export function canAccess(
    path: string,
    accessLevel: string | undefined
): boolean {
    const pathNormalized = path.replace(/\/$/, "") || "/";
    const level = normalize(accessLevel);

    if (
        PUBLIC_OR_AUTH_PATHS.some(
            (p) => pathNormalized === p || pathNormalized.startsWith(p + "/")
        )
    ) {
        return true;
    }

    if (isSettingsPath(pathNormalized)) {
        return canAccessOrgSettings(accessLevel);
    }

    if (!level) {
        return true;
    }

    if (RESTRICTED_ACCESS_LEVELS.has(level)) {
        return STANDARD_USER_PATHS.some(
            (p) => pathNormalized === p || pathNormalized.startsWith(p + "/")
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
    { path: "/dashboard", label: "Home" },
    { path: "/staff", label: "Staff" },
    { path: "/visits", label: "Visits" },
    { path: "/leads", label: "Leads" },
    { path: "/planning", label: "Planning" },
    { path: "/reports", label: "Reports" },
];

/** Sidebar item for org settings (admin / owner / manager only). */
export const STAFF_SETTINGS_ROUTE = { path: "/settings", label: "Settings" } as const;

/**
 * Returns whether the staff dashboard (e.g. expanded nav) is visible.
 * True for admin, manager, owner and other non-restricted roles; false for user and empty.
 */
export function isStaffDashboardVisible(
    accessLevel: string | undefined
): boolean {
    const level = normalize(accessLevel);
    if (!level) return false;
    return !RESTRICTED_ACCESS_LEVELS.has(level);
}

/**
 * Returns nav items (path + label) to show for the given access level.
 * Standard users see only Dashboard.
 */
export function getAllowedRoutes(
    accessLevel: string | undefined
): AllowedRoute[] {
    const level = normalize(accessLevel);

    const fullNav: AllowedRoute[] = [
        { path: "/dashboard", label: "Home" },
        { path: "/visits", label: "Visits" },
        { path: "/leads", label: "Leads" },
        { path: "/planning", label: "Planning" },
    ];

    if (!level || !RESTRICTED_ACCESS_LEVELS.has(level)) {
        return fullNav;
    }

    return fullNav.filter((r) =>
        STANDARD_USER_PATHS.some((p) => p === r.path || r.path.startsWith(p))
    );
}
