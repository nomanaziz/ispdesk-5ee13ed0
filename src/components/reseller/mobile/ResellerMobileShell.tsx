import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { MobileBottomTabs } from "./MobileBottomTabs";
import { NotesButton } from "@/components/notes/NotesButton";
import { InstallAppButton } from "@/components/InstallAppButton";
import { HeaderClock } from "@/components/HeaderClock";
import { Smartphone } from "lucide-react";

interface Props {
  children: ReactNode;
  onOpenSidebar: () => void;
}

export function ResellerMobileShell({ children, onOpenSidebar }: Props) {
  const { customer, logout } = usePortalAuth();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  

  const popType = (customer as any)?.pop_type as string | undefined;

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 h-[62px] bg-primary text-primary-foreground px-3 flex items-center gap-2 shadow-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-9 w-9 rounded-full bg-primary-foreground/15 flex items-center justify-center font-bold text-sm shrink-0 active:scale-95 transition-transform"
              aria-label="User menu"
            >
              {customer?.name?.[0]?.toUpperCase() || "P"}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span className="font-semibold leading-tight">{customer?.name}</span>
              <span className="text-xs font-normal text-muted-foreground leading-tight">
                {customer?.username}
              </span>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{customer?.code}</Badge>
                {popType && (
                  <Badge
                    className={cn(
                      "uppercase text-[10px] tracking-wide font-bold border",
                      popType.toLowerCase() === "prepaid"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
                    )}
                  >
                    {popType}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/pop-admin/settings")}>
              <Settings className="h-4 w-4 mr-2" />
              {t("সেটিংস", "Settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("লগআউট", "Logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate leading-tight">
            {customer?.name || "POP Admin"}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-primary-foreground/80 leading-tight flex items-center gap-1">
            <span>{customer?.code || "POP"}</span>
            <span>·</span>
            <span>{customer?.type === "reseller_sub" ? "Sub-user" : "Reseller"}</span>
            {popType && (
              <>
                <span>·</span>
                <span className="font-bold">{popType}</span>
              </>
            )}
          </div>
        </div>

        {/* Language micro-toggle */}
        <div
          className="inline-flex items-center rounded-full bg-primary-foreground/15 p-0.5 h-7"
          role="group"
          aria-label="Language"
        >
          <button
            type="button"
            onClick={() => setLang("bn")}
            className={cn(
              "px-2 h-6 rounded-full text-[10px] font-bold transition-colors",
              lang === "bn"
                ? "bg-primary-foreground text-primary"
                : "text-primary-foreground/80",
            )}
          >
            বাং
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={cn(
              "px-2 h-6 rounded-full text-[10px] font-bold transition-colors",
              lang === "en"
                ? "bg-primary-foreground text-primary"
                : "text-primary-foreground/80",
            )}
          >
            EN
          </button>
        </div>

        
        <div className="text-primary-foreground">
          <NotesButton ownerType="pop" />
        </div>
        <div className="text-primary-foreground">
          <InstallAppButton variant="icon" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <Bell className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          onClick={onOpenSidebar}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </header>

      {/* Page content */}
      <main className="flex-1 p-3 pb-24 overflow-x-hidden">{children}</main>

      <MobileBottomTabs />
    </div>
  );
}
