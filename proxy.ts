import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
    "/dashboard(.*)",
    "/visits(.*)",
    "/leads(.*)",
    "/visualiser(.*)",
    "/store(.*)",
    "/orders(.*)",
    "/projects(.*)",
    "/account(.*)",
    "/staff(.*)",
    "/iot(.*)",
    "/pipeline(.*)",
    "/clients(.*)",
    "/claims(.*)",
    "/payslips(.*)",
    "/competitors(.*)",
    "/planning(.*)",
    "/reports(.*)",
    "/settings(.*)",
]);
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

/** Same-origin return path from Clerk `redirect_url`. Rejects open redirects. */
function safeReturnPath(raw: string | null, requestUrl: string): string | null {
    if (!raw) return null;
    let value = raw.trim();
    try {
        value = decodeURIComponent(value);
    } catch {
        return null;
    }
    if (!value || value.includes("\\") || value.includes("\n") || value.includes("\r")) {
        return null;
    }
    if (value.startsWith("/") && !value.startsWith("//")) {
        return value;
    }
    try {
        const target = new URL(value);
        if (target.origin !== new URL(requestUrl).origin) return null;
        return `${target.pathname}${target.search}${target.hash}`;
    } catch {
        return null;
    }
}

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();

    if (isAuthRoute(req) && userId) {
        const nextPath = safeReturnPath(req.nextUrl.searchParams.get("redirect_url"), req.url);
        return NextResponse.redirect(new URL(nextPath ?? "/dashboard", req.url));
    }

    if (isProtectedRoute(req)) {
        await auth.protect();
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
