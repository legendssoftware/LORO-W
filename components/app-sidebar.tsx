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
  CheckSquareIcon,
  HandshakeIcon,
  KnowledgeIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  UsersIcon,
  VapiSupportCallIcon,
} from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { FaqModal } from "@/components/faq-modal";
import { useVapiDemoCall } from "@/hooks/use-vapi-demo-call";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const ROUTE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  "/dashboard": LayoutDashboardIcon,
  "/reports": BarChart3Icon,
  "/visits": MapPinIcon,
  "/leads": HandshakeIcon,
  "/planning": CheckSquareIcon,
  "/staff": UsersIcon,
};

export function AppSidebar() {
  const pathname = usePathname();
  const { closeSidebar } = useSidebar();
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
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="flex flex-row h-14 w-full shrink-0 items-center justify-between border-b border-sidebar-border px-3 md:px-4">
          <span className="text-lg font-bold text-sidebar-foreground">LORO</span>
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {routes.map((route) => {
                  const Icon = routeIcons[route.path];
                  const isActive =
                    pathname === route.path ||
                    pathname?.startsWith(route.path + "/");

                  return (
                    <SidebarMenuItem key={route.path}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={route.path} onClick={closeSidebar}>
                          {Icon && <Icon className="size-5 shrink-0" />}
                          <span>{route.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
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
              connectionError && "text-amber-500 hover:text-amber-600"
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
        </SidebarFooter>
      </Sidebar>
      <FaqModal open={faqOpen} onOpenChange={setFaqOpen} />
    </>
  );
}
