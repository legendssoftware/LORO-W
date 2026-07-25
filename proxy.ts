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
    "/settings(.*)",
]);
const isAuthRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
    const { userId } = await auth();

    if (isAuthRoute(req) && userId) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    if (isProtectedRoute(req)) {
        await auth.protect();
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
