"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useSessionSync } from "@/api/hooks";
import { usePrefetchDashboardQueries } from "@/api/hooks/use-prefetch-dashboard";
import { usePrefetchStaffQueries } from "@/api/hooks/use-prefetch-staff";
import {
  canAccessCompetitors,
  canAccessReports,
  canAccessUserSettings,
  canManageApprovals,
  getAllowedRoutes,
  getClientSidebarRoutes,
  isClientPortalUser,
  isStaffDashboardVisible,
  STAFF_SETTINGS_ROUTE,
  STAFF_SIDEBAR_ROUTES,
} from "@/lib/access";
import {
  CheckSquareIcon,
  CpuIcon,
  HandshakeIcon,
  KnowledgeIcon,
  LayoutDashboardIcon,
  MapPinIcon,
  SettingsIcon,
  UsersIcon,
  VapiSupportCallIcon,
} from "@/lib/icons";
import {
  BarChart3,
  Building2,
  FileCheck,
  FileText,
  FolderKanban,
  GitBranch,
  Map,
  Package,
  Receipt,
  ShoppingBag,
  Swords,
  UserCircle,
  Phone,
} from "lucide-react";
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
  SidebarThemeToggle,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const ROUTE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  "/dashboard": LayoutDashboardIcon,
  "/visualiser": Map,
  "/visits": MapPinIcon,
  "/calls": Phone,
  "/leads": HandshakeIcon,
  "/pipeline": GitBranch,
  "/clients": Building2,
  "/competitors": Swords,
  "/planning": CheckSquareIcon,
  "/claims": Receipt,
  "/approvals": FileCheck,
  "/payslips": FileText,
  "/reports": BarChart3,
  "/staff": UsersIcon,
  "/iot": CpuIcon,
  "/settings": SettingsIcon,
  "/store": ShoppingBag,
  "/orders": Package,
  "/projects": FolderKanban,
  "/account": UserCircle,
};

function getSidebarRoutes(accessLevel: string | undefined) {
  if (!accessLevel) {
    return getAllowedRoutes(undefined);
  }

  if (isClientPortalUser(accessLevel)) {
    return getClientSidebarRoutes();
  }

  if (isStaffDashboardVisible(accessLevel)) {
    const staffRoutes = STAFF_SIDEBAR_ROUTES.filter((r) => {
      if (r.path === "/reports") return canAccessReports(accessLevel);
      if (r.path === "/approvals") return canManageApprovals(accessLevel);
      if (r.path === "/competitors" || r.path === "/visualiser") {
        return canAccessCompetitors(accessLevel);
      }
      return true;
    });
    return [
      ...staffRoutes,
      ...(canAccessUserSettings(accessLevel) ? [STAFF_SETTINGS_ROUTE] : []),
    ];
  }

  return getAllowedRoutes(accessLevel);
}

export function AppSidebar() {
  const pathname = usePathname();
  const { closeSidebar } = useSidebar();
  const { isSignedIn, isLoaded } = useAuth();
  const [faqOpen, setFaqOpen] = useState(false);
  const { backendUserData: profile } = useSessionSync();
  const prefetchDashboard = usePrefetchDashboardQueries();
  const prefetchStaff = usePrefetchStaffQueries();
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

  if (!isLoaded || !isSignedIn) return null;

  const routes = getSidebarRoutes(profile?.accessLevel);
  const isClient = isClientPortalUser(profile?.accessLevel);
  const routeIcons = ROUTE_ICONS;

  return (
    <>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="relative flex h-14 w-full shrink-0 flex-row items-center justify-center border-b border-sidebar-border px-3 md:justify-between md:px-4">
          <span className="text-lg font-bold text-sidebar-foreground">LORO</span>
          <SidebarTrigger className="absolute right-3 md:static" />
        </SidebarHeader>
        <SidebarContent className="justify-center md:justify-start">
          <SidebarGroup>
            <SidebarGroupContent className="w-full">
              <SidebarMenu className="items-center md:items-stretch">
                {routes.map((route) => {
                  const Icon = routeIcons[route.path];
                  const isActive =
                    pathname === route.path ||
                    pathname?.startsWith(route.path + "/");

                  return (
                    <SidebarMenuItem key={route.path} className="w-full">
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="justify-center text-center md:justify-start md:text-left"
                      >
                        <Link
                          href={route.path}
                          onClick={closeSidebar}
                          onPointerEnter={() => {
                            if (route.path === "/dashboard" && !isClient) {
                              prefetchDashboard();
                            }
                            if (route.path === "/staff" && !isClient) {
                              prefetchStaff();
                            }
                          }}
                          className="w-full justify-center md:justify-start"
                        >
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
          <div className="flex w-full justify-center px-3 py-1 md:justify-start">
            <SidebarThemeToggle />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-center gap-3 px-3 py-2 text-center text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:justify-start md:text-left"
            aria-label="FAQ"
            onClick={() => setFaqOpen(true)}
          >
            <KnowledgeIcon className="size-5 shrink-0" />
            FAQ
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-center gap-3 px-3 py-2 text-center text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:justify-start md:text-left",
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
