import { Plus, UserPlus, Receipt, Ticket, ListTodo, Megaphone, UserCog, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { QuickCreateClientDialog } from "@/components/QuickCreateClientDialog";

export function QuickCreateMenu() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [quickClientOpen, setQuickClientOpen] = useState(false);

  const items: Array<
    | { type: "label"; label: string }
    | { type: "sep" }
    | { type: "item"; icon: any; label: string; onClick: () => void }
  > = [
    { type: "label", label: t("ক্লায়েন্ট", "Clients") },
    {
      type: "item", icon: UserPlus,
      label: t("নতুন ক্লায়েন্ট (পূর্ণাঙ্গ)", "New client (full)"),
      onClick: () => navigate("/dashboard/clients/add"),
    },
    {
      type: "item", icon: Users,
      label: t("কুইক ক্লায়েন্ট", "Quick client"),
      onClick: () => setQuickClientOpen(true),
    },
    {
      type: "item", icon: UserPlus,
      label: t("নতুন ক্লায়েন্ট রিকোয়েস্ট", "New client request"),
      onClick: () => navigate("/dashboard/clients/new-request"),
    },
    { type: "sep" },
    { type: "label", label: t("বিলিং", "Billing") },
    {
      type: "item", icon: Receipt,
      label: t("দৈনিক বিল কালেকশন", "Daily bill collection"),
      onClick: () => navigate("/dashboard/billing/daily-collection"),
    },
    {
      type: "item", icon: Package,
      label: t("নতুন প্যাকেজ", "New package"),
      onClick: () => navigate("/dashboard/config/packages?new=1"),
    },
    { type: "sep" },
    { type: "label", label: t("সাপোর্ট ও টাস্ক", "Support & Tasks") },
    {
      type: "item", icon: Ticket,
      label: t("নতুন টিকিট", "New ticket"),
      onClick: () => navigate("/dashboard/support/tickets?new=1"),
    },
    {
      type: "item", icon: ListTodo,
      label: t("নতুন টাস্ক", "New task"),
      onClick: () => navigate("/dashboard/tasks?new=1"),
    },
    {
      type: "item", icon: Megaphone,
      label: t("নতুন নোটিশ", "New notice"),
      onClick: () => navigate("/dashboard/support/notices?new=1"),
    },
    { type: "sep" },
    { type: "label", label: t("এইচআর", "HR") },
    {
      type: "item", icon: UserCog,
      label: t("নতুন কর্মী", "New employee"),
      onClick: () => navigate("/dashboard/hr/employees/add"),
    },
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
            title={t("নতুন তৈরি করুন", "Create new")}
            aria-label="Create new"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t("নতুন তৈরি করুন", "Create new")}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((it, i) => {
            if (it.type === "sep") return <DropdownMenuSeparator key={i} />;
            if (it.type === "label") {
              return (
                <DropdownMenuLabel
                  key={i}
                  className="text-[10px] uppercase tracking-wide text-muted-foreground/70 font-semibold pt-2"
                >
                  {it.label}
                </DropdownMenuLabel>
              );
            }
            const Icon = it.icon;
            return (
              <DropdownMenuItem key={i} onClick={it.onClick} className="cursor-pointer">
                <Icon className="mr-2 h-4 w-4" />
                <span className="text-sm">{it.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <QuickCreateClientDialog open={quickClientOpen} onOpenChange={setQuickClientOpen} />
    </>
  );
}
