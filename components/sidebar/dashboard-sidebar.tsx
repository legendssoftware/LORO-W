"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useSessionSync } from "@/api/hooks";
import {
    getAllowedRoutes,
    isStaffDashboardVisible,
    STAFF_SIDEBAR_ROUTES,
} from "@/lib/access";
import {
    BarChart3Icon,
    KnowledgeIcon,
    LayoutDashboardIcon,
    VapiSupportCallIcon,
    XIcon,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { FaqModal } from "@/components/faq-modal";
import { useVapiDemoCall } from "@/hooks/use-vapi-demo-call";
import { useSidebar } from "./sidebar-provider";
import { cn } from "@/lib/utils";

const ROUTE_ICONS: Record<
    string,
    React.ComponentType<{ className?: string }>
> = {
    "/dashboard": LayoutDashboardIcon,
    "/reports": BarChart3Icon,
};

export function DashboardSidebar() {
    const pathname = usePathname();
    const { open, setOpen } = useSidebar();
    const { isSignedIn } = useAuth();
    const [faqOpen, setFaqOpen] = useState(false);
    const { backendUserData: profile } = useSessionSync();
    const {
        startDemoCall,
        endDemoCall,
        retryDemoCall,
        isCallActive,
        isCallInitializing,
        connectionError,
        formattedTimeRemaining,
    } = useVapiDemoCall();

    const closeSidebar = () => setOpen(false);

    const handleSupportClick = () => {
        if (isCallActive) endDemoCall();
        else if (connectionError) retryDemoCall();
        else startDemoCall();
    };

    if (!isSignedIn) return null;

    const isStaff = isStaffDashboardVisible(profile?.accessLevel);
    const routes = isStaff
        ? STAFF_SIDEBAR_ROUTES
        : getAllowedRoutes(profile?.accessLevel);
    const routeIcons = ROUTE_ICONS;

    return (
        <>
            {/* Backdrop: tablet and down when sidebar is open (collapsible below lg) */}
            <button
                type="button"
                aria-label="Close sidebar"
                className={cn(
                    "fixed inset-0 z-[45] bg-black/50 transition-opacity lg:hidden",
                    open
                        ? "visible opacity-100"
                        : "invisible opacity-0 pointer-events-none"
                )}
                onClick={closeSidebar}
            />
            {/* Sidebar: overlay on tablet and down (toggle), always visible on lg+; narrower width below lg */}
            <aside
                className={cn(
                    "flex h-svh w-[7.5rem] lg:w-[9.6rem] flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-out",
                    "fixed inset-y-0 left-0 z-[55] lg:sticky lg:top-0 lg:z-40",
                    open
                        ? "translate-x-0"
                        : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="flex h-14 shrink-0 items-center justify-between px-3 lg:px-4">
                    <span className="text-lg font-bold text-sidebar-foreground">
                        LORO
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Close sidebar"
                        onClick={closeSidebar}
                        className="lg:hidden rounded-full size-8 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                        <XIcon className="size-5" />
                    </Button>
                </div>
                <nav className="flex flex-1 flex-col gap-1 overflow-auto p-3">
                    {routes.map((route) => {
                        const Icon = routeIcons[route.path];
                        const isActive =
                            pathname === route.path ||
                            pathname?.startsWith(route.path + "/");

                        return (
                            <Link
                                key={route.path}
                                href={route.path}
                                onClick={closeSidebar}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )}
                            >
                                {Icon && <Icon className="size-5 shrink-0" />}
                                {route.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="mt-auto space-y-1 p-3">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        aria-label="FAQ"
                        onClick={() => setFaqOpen(true)}
                    >
                        <KnowledgeIcon className="size-5 shrink-0" />
                        FAQ
                    </Button>
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start gap-3 px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                            isCallActive && "text-red-500 hover:text-red-600",
                            connectionError &&
                                "text-amber-500 hover:text-amber-600"
                        )}
                        aria-label={
                            isCallActive
                                ? "End support call"
                                : connectionError
                                  ? "Retry support call"
                                  : "Start support call"
                        }
                        onClick={handleSupportClick}
                        disabled={isCallInitializing}
                    >
                        <VapiSupportCallIcon className="size-5 shrink-0" />
                        {isCallActive
                            ? `End call${formattedTimeRemaining ? ` (${formattedTimeRemaining})` : ""}`
                            : connectionError
                              ? "Retry"
                              : isCallInitializing
                                ? "Connecting..."
                                : "Support"}
                    </Button>
                </div>
            </aside>
            <FaqModal open={faqOpen} onOpenChange={setFaqOpen} />
        </>
    );
}
