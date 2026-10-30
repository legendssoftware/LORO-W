import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { signedInAuthDestination } from "@/lib/safe-return-path";

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
    "/takeoff(.*)",
    "/payslips(.*)",
    "/competitors(.*)",
    "/planning(.*)",
    "/reports(.*)",
    "/settings(.*)",
    "/assets(.*)",
    "/merchandise(.*)",
    "/wellbeing(.*)",
    "/performance(.*)",
    "/approvals(.*)",
]);
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();

    if (isAuthRoute(req) && userId) {
        const nextPath = signedInAuthDestination(req.nextUrl.searchParams.get("redirect_url"), req.url);
        return NextResponse.redirect(new URL(nextPath, req.url));
    }

    if (isProtectedRoute(req)) {
        await auth.protect();
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
