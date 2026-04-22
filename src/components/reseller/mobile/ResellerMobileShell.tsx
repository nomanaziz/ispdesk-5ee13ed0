import { ReactNode, useState } from "react";
import { Menu, Bell, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { MobileBottomTabs } from "./MobileBottomTabs";
import { QuickCreateClientDialog } from "@/components/QuickCreateClientDialog";

interface Props {
  children: ReactNode;
  onOpenSidebar: () => void;
}

export function ResellerMobileShell({ children, onOpenSidebar }: Props) {
  const { customer } = usePortalAuth();
  const { lang, setLang } = useLanguage();
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Mobile header */}
      <header className="sticky top-0 z-30 h-[62px] bg-primary text-primary-foreground px-3 flex items-center gap-2 shadow-sm">
        <div className="h-9 w-9 rounded-full bg-primary-foreground/15 flex items-center justify-center font-bold text-sm shrink-0">
          {customer?.name?.[0]?.toUpperCase() || "P"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate leading-tight">
            {customer?.name || "POP Admin"}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-primary-foreground/80 leading-tight">
            {customer?.code || "POP"} · {customer?.type === "reseller_sub" ? "Sub-user" : "Reseller"}
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

      {/* Floating Quick Create FAB */}
      <button
        type="button"
        onClick={() => setQuickOpen(true)}
        className="fixed right-4 bottom-20 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        aria-label={lang === "bn" ? "দ্রুত ক্লায়েন্ট তৈরি" : "Quick create client"}
      >
        <Plus className="h-7 w-7" />
      </button>

      <MobileBottomTabs />

      <QuickCreateClientDialog open={quickOpen} onOpenChange={setQuickOpen} />
    </div>
  );
}
