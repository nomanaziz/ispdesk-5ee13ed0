import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useTheme();

  return (
    <SidebarProvider defaultOpen={!settings.sidebarCollapsed}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className={cn(
            "flex-1 p-3 sm:p-5 overflow-auto",
            settings.contentWidth === "compact" && "max-w-6xl mx-auto w-full"
          )}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
