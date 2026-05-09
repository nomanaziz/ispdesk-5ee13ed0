import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useTheme } from "@/contexts/ThemeContext";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ResellerSidebar } from "./portal-shell/ResellerSidebar";
import { PortalTopBar } from "./portal-shell/PortalTopBar";
import { ResellerMobileShell } from "@/components/reseller/mobile/ResellerMobileShell";

export const ResellerLayout = ({ children }: { children: ReactNode }) => {
  const { settings } = useTheme();
  const { customer } = usePortalAuth();
  const isMobile = useIsMobile();

  if (isMobile) {
    return <ResellerMobileShell onOpenSidebar={() => {}}>{children}</ResellerMobileShell>;
  }

  return (
    <SidebarProvider defaultOpen={!settings.sidebarCollapsed}>
      <div className="min-h-screen flex w-full bg-background text-foreground">
        <ResellerSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <PortalTopBar notesOwner="pop" profilePath="/pop-admin/settings" />
          <main className={cn(
            "flex-1 p-3 sm:p-5 overflow-auto",
            settings.contentWidth === "compact" && "max-w-6xl mx-auto w-full",
          )}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ResellerLayout;
