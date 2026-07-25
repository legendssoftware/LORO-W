/**
 * Role-based access: allowed routes and route guards for loro-web.
 * Standard users can only access dashboard.
 */

/** Paths any signed-in user with "standard" role can access (view-only scope) */
export const STANDARD_USER_PATHS = [
    "/dashboard",
    "/visits",
    "/leads",
    "/pipeline",
    "/clients",
    "/competitors",
    "/planning",
    "/claims",
    "/payslips",
    "/visualiser",
    "/settings",
] as const;

/** Matches server ReportsController.getAccessScope `isElevated` (org-wide reports / map). */
const REPORTS_ELEVATED_LEVELS = new Set<string>([
    "admin",
    "owner",
    "manager",
    "developer",
    "support",
    "hr",
    "supervisor",
    "executive",
]);

/**
 * True when the user sees org-wide report filters and data (vs self-scoped).
 * Keep in sync with server `getAccessScope` / reports map clamp logic.
 */
export function isReportsElevatedViewer(accessLevel: string | undefined): boolean {
    const level = normalize(accessLevel);
    if (!level) return false;
    return REPORTS_ELEVATED_LEVELS.has(level);
}

export type StandardUserPath = (typeof STANDARD_USER_PATHS)[number];

/** Paths that do not require role checks (public or auth-only) */
export const PUBLIC_OR_AUTH_PATHS = [
    "/",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/onboarding",
    "/employee-intake",
] as const;

/** Client portal routes (linked-client users with accessLevel client). */
export const CLIENT_PORTAL_PATHS = [
    "/dashboard",
    "/store",
    "/orders",
    "/projects",
    "/account",
] as const;

export type ClientPortalPath = (typeof CLIENT_PORTAL_PATHS)[number];

/** Sidebar nav for client portal users. */
export const CLIENT_SIDEBAR_ROUTES: { path: string; label: string }[] = [
    { path: "/dashboard", label: "Home" },
    { path: "/store", label: "Store" },
    { path: "/orders", label: "Orders" },
    { path: "/projects", label: "Projects" },
    { path: "/account", label: "Account" },
];

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

/** True when access level is exactly Admin (dashboard CRM targets column hide). */
export function isAdminAccessLevel(accessLevel: string | undefined): boolean {
    return normalize(accessLevel) === 'admin';
}

/**
 * Whether the user may open organisation / branch admin settings (web UI).
 */
export function canAccessOrgSettings(accessLevel: string | undefined): boolean {
    const level = normalize(accessLevel);
    if (!level) return false;
    return ORG_SETTINGS_ACCESS_LEVELS.has(level);
}

/**
 * Whether the user may open /settings (calendar tab for all staff; org tabs for admins).
 */
export function canAccessUserSettings(accessLevel: string | undefined): boolean {
    if (isClientPortalUser(accessLevel)) return false;
    const level = normalize(accessLevel);
    return Boolean(level);
}

const COMPETITOR_MANAGE_LEVELS = new Set<string>(["admin", "manager"]);

/**
 * True when the user can POST/PATCH competitors per server CompetitorsController roles.
 */
export function canManageCompetitors(accessLevel: string | undefined): boolean {
    const level = normalize(accessLevel);
    if (!level) return false;
    return COMPETITOR_MANAGE_LEVELS.has(level);
}

/**
 * True when the user can DELETE (soft) competitors (admin-only on server).
 */
export function canDeleteCompetitors(accessLevel: string | undefined): boolean {
    return normalize(accessLevel) === "admin";
}

const CLAIMS_MANAGE_LEVELS = new Set<string>(["admin", "manager"]);

/** Approve / decline / mark paid on claims (aligned with mobile manager actions). */
export function canManageClaims(accessLevel: string | undefined): boolean {
    const level = normalize(accessLevel);
    if (!level) return false;
    return CLAIMS_MANAGE_LEVELS.has(level);
}

/**
 * Paginated GET /claims (org-wide list). Matches APK claims index: admin | owner only.
 * Other roles use GET /claims/me on the client.
 */
export function canViewOrgClaimsList(accessLevel: string | undefined): boolean {
    const level = normalize(accessLevel);
    return level === "admin" || level === "owner";
}

function isSettingsPath(pathNormalized: string): boolean {
    return (
        pathNormalized === "/settings" ||
        pathNormalized.startsWith("/settings/")
    );
}

/** True when the user is a linked-client portal user (not staff CRM "clients" page). */
export function isClientPortalUser(accessLevel: string | undefined): boolean {
    return normalize(accessLevel) === "client";
}

function isClientPortalPath(pathNormalized: string): boolean {
    return CLIENT_PORTAL_PATHS.some(
        (p) => pathNormalized === p || pathNormalized.startsWith(p + "/")
    );
}

/**
 * Returns whether the given path is allowed for the given access level.
 * - Public/auth paths are always allowed.
 * - `/settings` is allowed for all staff (calendar tab); org tabs gated in the page UI.
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
        return canAccessUserSettings(accessLevel);
    }

    if (isClientPortalUser(accessLevel)) {
        return isClientPortalPath(pathNormalized);
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
    { path: "/iot", label: "IoT" },
    { path: "/visits", label: "Visits" },
    { path: "/leads", label: "Leads" },
    { path: "/pipeline", label: "Pipeline" },
    { path: "/clients", label: "Clients" },
    { path: "/claims", label: "Claims" },
    { path: "/payslips", label: "Payslips" },
    { path: "/competitors", label: "Competitors" },
    { path: "/planning", label: "Planning" },
    { path: "/visualiser", label: "Competitor Overview" },
];

/** Sidebar item for user settings (calendar for all staff; org tabs for admin / owner / manager). */
export const STAFF_SETTINGS_ROUTE = { path: "/settings", label: "Settings" } as const;

/** Whether the user may invite or provision staff accounts. */
export function canManageStaffUsers(accessLevel: string | undefined): boolean {
    const level = normalize(accessLevel);
    if (!level) return false;
    return level === 'admin' || level === 'manager' || level === 'owner';
}

/**
 * True for admin, manager, owner and other non-restricted roles; false for user and empty.
 */
export function isStaffDashboardVisible(
    accessLevel: string | undefined
): boolean {
    const level = normalize(accessLevel);
    if (!level) return false;
    if (isClientPortalUser(accessLevel)) return false;
    return !RESTRICTED_ACCESS_LEVELS.has(level);
}

/**
 * Returns nav items for client portal users.
 */
export function getClientSidebarRoutes(): AllowedRoute[] {
    return [...CLIENT_SIDEBAR_ROUTES];
}

/**
 * Returns nav items (path + label) to show for the given access level.
 * Standard users see only Dashboard.
 */
export function getAllowedRoutes(
    accessLevel: string | undefined
): AllowedRoute[] {
    const level = normalize(accessLevel);

    if (isClientPortalUser(accessLevel)) {
        return getClientSidebarRoutes();
    }

    const fullNav: AllowedRoute[] = [
        { path: "/dashboard", label: "Home" },
        { path: "/visits", label: "Visits" },
        { path: "/leads", label: "Leads" },
        { path: "/pipeline", label: "Pipeline" },
        { path: "/clients", label: "Clients" },
        { path: "/claims", label: "Claims" },
        { path: "/payslips", label: "Payslips" },
        { path: "/competitors", label: "Competitors" },
        { path: "/planning", label: "Planning" },
        { path: "/visualiser", label: "Competitor Overview" },
    ];

    if (!level || !RESTRICTED_ACCESS_LEVELS.has(level)) {
        return fullNav;
    }

    const restrictedNav = fullNav.filter((r) =>
        STANDARD_USER_PATHS.some((p) => p === r.path || r.path.startsWith(p))
    );

    if (canAccessUserSettings(accessLevel)) {
        return [...restrictedNav, STAFF_SETTINGS_ROUTE];
    }

    return restrictedNav;
}
