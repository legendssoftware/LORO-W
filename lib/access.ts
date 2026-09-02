/**
 * Role-based access: allowed routes and route guards for loro-web.
 * Standard users get operational paths + role-scoped reports; no competitors / competitor overview.
 */

/** Paths any signed-in user with "standard" role can access (view-only scope) */
export const STANDARD_USER_PATHS = [
    "/dashboard",
    "/visits",
    "/calls",
    "/leads",
    "/pipeline",
    "/clients",
    "/planning",
    "/claims",
    "/payslips",
    "/reports",
    "/settings",
] as const;

/** Reports data visibility: org = everyone, team = self+managedStaff, self = authenticated user only. */
export type ReportsDataScope = "org" | "team" | "self";

/** Admin / owner / manager (+ ops roles) see full organisation reports. */
const REPORTS_ORG_LEVELS = new Set<string>([
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
 * True when the user may open `/reports`.
 * All staff (non-client) — Overview + Targets scoped by getReportsDataScope.
 */
export function canAccessReports(accessLevel: string | undefined): boolean {
    const level = normalize(accessLevel);
    if (!level) return false;
    if (level === "client") return false;
    return true;
}

/**
 * Three-tier reports data scope (mirrors server reports-access.util).
 * - org: admin/owner/manager (+ developer, support, hr, supervisor, executive)
 * - team: reserved for self + managedStaff (unused by current access levels)
 * - self: everyone else (sales / standard users)
 */
export function getReportsDataScope(
    accessLevel: string | undefined
): ReportsDataScope {
    const level = normalize(accessLevel);
    if (!level) return "self";
    if (REPORTS_ORG_LEVELS.has(level)) return "org";
    return "self";
}

/**
 * True when the user can see multi-user Targets / Overview filters (org or team).
 */
export function canViewMultiUserReports(
    accessLevel: string | undefined
): boolean {
    return getReportsDataScope(accessLevel) !== "self";
}

/**
 * @deprecated Prefer getReportsDataScope / canViewMultiUserReports.
 * True for org or team scope (not pure self).
 */
export function isReportsElevatedViewer(
    accessLevel: string | undefined
): boolean {
    return canViewMultiUserReports(accessLevel);
}

/**
 * Competitors list + Competitor Overview (`/visualiser`).
 * Restricted (standard) users are denied via STANDARD_USER_PATHS; this gates the routes for clarity.
 */
export function canAccessCompetitors(accessLevel: string | undefined): boolean {
    const level = normalize(accessLevel);
    if (!level || level === "client") return false;
    return !RESTRICTED_ACCESS_LEVELS.has(level);
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

const APPROVALS_MANAGE_LEVELS = new Set<string>([
    "admin",
    "manager",
    "owner",
    "hr",
    "finance",
    "accounting",
    "accountant",
    "supervisor",
]);

/** View and decide approvals (web inbox + HR portal). Typed users can open even without these roles. */
export function canManageApprovals(
    accessLevel: string | undefined,
    approvableTypes?: string[] | null,
): boolean {
    if (Array.isArray(approvableTypes) && approvableTypes.length > 0) return true;
    const level = normalize(accessLevel);
    if (!level) return false;
    return APPROVALS_MANAGE_LEVELS.has(level);
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
 * - `/reports` is all staff (Overview + Targets scoped by role).
 * - `/competitors` and `/visualiser` are not available to restricted (standard) users.
 * - Restricted roles only get STANDARD_USER_PATHS.
 * - Non-restricted roles (e.g. owner, admin, manager) can access other paths.
 */
export function canAccess(
    path: string,
    accessLevel: string | undefined,
    approvableTypes?: string[] | null,
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

    if (
        pathNormalized === "/reports" ||
        pathNormalized.startsWith("/reports/")
    ) {
        return canAccessReports(accessLevel);
    }

    if (
        pathNormalized === "/approvals" ||
        pathNormalized.startsWith("/approvals/")
    ) {
        return canManageApprovals(accessLevel, approvableTypes);
    }

    if (
        pathNormalized === "/competitors" ||
        pathNormalized.startsWith("/competitors/") ||
        pathNormalized === "/visualiser" ||
        pathNormalized.startsWith("/visualiser/")
    ) {
        return canAccessCompetitors(accessLevel);
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
    { path: "/calls", label: "Call recordings" },
    { path: "/leads", label: "Leads" },
    { path: "/pipeline", label: "Pipeline" },
    { path: "/clients", label: "Clients" },
    { path: "/claims", label: "Claims" },
    { path: "/approvals", label: "Approvals" },
    { path: "/payslips", label: "Payslips" },
    { path: "/planning", label: "Planning" },
    { path: "/reports", label: "Reports" },
    { path: "/competitors", label: "Competitors" },
    { path: "/visualiser", label: "Competitor Overview" },
];

/** Sidebar item for user settings (calendar for all staff; org tabs for admin / owner / manager). */
export const STAFF_SETTINGS_ROUTE = { path: "/settings", label: "Settings" } as const;

/** Whether the user may invite or provision staff accounts. */
export function canManageStaffUsers(accessLevel: string | undefined): boolean {
    const level = normalize(accessLevel);
    if (!level) return false;
    return level === 'admin' || level === 'manager' || level === 'owner' || level === 'hr';
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
 * Standard users get operational paths + Reports (self-scoped); no Competitors / Competitor Overview.
 * Reports Overview + Targets are available to all staff; data scope is org | team | self.
 */
export function getAllowedRoutes(
    accessLevel: string | undefined,
    approvableTypes?: string[] | null,
): AllowedRoute[] {
    const level = normalize(accessLevel);

    if (isClientPortalUser(accessLevel)) {
        return getClientSidebarRoutes();
    }

    const fullNav: AllowedRoute[] = [
        { path: "/dashboard", label: "Home" },
        { path: "/visits", label: "Visits" },
        { path: "/calls", label: "Call recordings" },
        { path: "/leads", label: "Leads" },
        { path: "/pipeline", label: "Pipeline" },
        { path: "/clients", label: "Clients" },
        { path: "/claims", label: "Claims" },
        { path: "/payslips", label: "Payslips" },
        { path: "/planning", label: "Planning" },
    ];

    if (canManageApprovals(accessLevel, approvableTypes)) {
        const claimsIndex = fullNav.findIndex((r) => r.path === "/claims");
        fullNav.splice(claimsIndex + 1, 0, { path: "/approvals", label: "Approvals" });
    }

    if (canAccessReports(accessLevel)) {
        fullNav.push({ path: "/reports", label: "Reports" });
    }

    if (canAccessCompetitors(accessLevel)) {
        fullNav.push(
            { path: "/competitors", label: "Competitors" },
            { path: "/visualiser", label: "Competitor Overview" }
        );
    }

    if (!level || !RESTRICTED_ACCESS_LEVELS.has(level)) {
        return fullNav;
    }

    const restrictedNav = fullNav.filter((r) =>
        STANDARD_USER_PATHS.some((p) => p === r.path || r.path.startsWith(p))
    );

    if (canManageApprovals(accessLevel, approvableTypes) && !restrictedNav.some((r) => r.path === "/approvals")) {
        const claimsIndex = restrictedNav.findIndex((r) => r.path === "/claims");
        restrictedNav.splice(
            claimsIndex >= 0 ? claimsIndex + 1 : restrictedNav.length,
            0,
            { path: "/approvals", label: "Approvals" }
        );
    }

    if (canAccessUserSettings(accessLevel)) {
        return [...restrictedNav, STAFF_SETTINGS_ROUTE];
    }

    return restrictedNav;
}
