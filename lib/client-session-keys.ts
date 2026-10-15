/** sessionStorage key: welcome toast once per tab session (see AppHeader). */
export const LORO_WELCOME_SHOWN_SESSION_KEY = 'loro_welcome_shown';

/**
 * sessionStorage value: Clerk session id for which the user dismissed the sales benchmarks dialog.
 * @deprecated Removed from localStorage; kept name for one-time cleanup in sign-out.
 */
export const LORO_SALES_BENCHMARKS_WELCOME_DISMISSED_KEY = 'loro_sales_benchmarks_welcome_dismissed';

/** sessionStorage: stores Clerk sessionId string after user dismisses benchmarks (per sign-in session). */
export const LORO_SALES_BENCHMARKS_DISMISSED_SESSION_ID_KEY = 'loro_sales_benchmarks_dismissed_session_id';

/** sessionStorage: notice uid dismissed for the current Clerk session. */
export const LORO_ORG_NOTICE_DISMISSED_UID_KEY = 'loro_org_notice_dismissed_uid';

/** sessionStorage: Clerk session id for which a notice view was already counted. */
export const LORO_ORG_NOTICE_COUNTED_SESSION_ID_KEY = 'loro_org_notice_counted_session_id';

/** sessionStorage: notice uid whose view was already counted in the current Clerk session. */
export const LORO_ORG_NOTICE_COUNTED_UID_KEY = 'loro_org_notice_counted_uid';
