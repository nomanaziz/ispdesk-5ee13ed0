import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { MenuIconTile } from "@/components/sidebar/MenuIconTile";
import ispDeskLogo from "@/assets/isp-desk-logo.png";
import type { PortalMenuGroup, PortalMenuItem } from "./sidebarUtils";
import { pickTint } from "./sidebarUtils";

interface PortalSidebarProps {
  groups: PortalMenuGroup[];
  title: string;
  subtitle?: string;
  /** Optional footer slot (e.g. "Back to BW" link, upgrade CTA) */
  footer?: React.ReactNode;
  /** Optional logo override; defaults to ISP Desk logo */
  logoSrc?: string;
}

function GroupNode({
  group,
  groupIndex,
  forceOpen,
  openKey,
  onToggle,
}: {
  group: PortalMenuGroup;
  groupIndex: number;
  forceOpen?: boolean;
  openKey: string | null;
  onToggle: (key: string) => void;
}) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { resolvedMode } = useTheme();
  const { lang } = useLanguage();
  const isLight = resolvedMode === "light";

  const labelOf = (l: { label: string; labelEn?: string }) =>
    lang === "bn" ? l.label : l.labelEn ?? l.label;

  const itemTitle = (i: PortalMenuItem) =>
    lang === "bn" ? i.title : i.titleEn ?? i.title;

  const groupLabel = labelOf(group);
  const tint = pickTint(group, groupIndex);

  const isActiveItem = (i: PortalMenuItem) => location.pathname.startsWith(i.url);
  const isActiveGroup = group.items.some(isActiveItem);

  const controlledOpen = openKey === group.key;
  const open = forceOpen ?? controlledOpen;
  const isDirect = group.direct ?? group.items.length === 1;

  if (isDirect) {
    const item = group.items[0];
    if (!item) return null;
    const active = isActiveItem(item);
    if (collapsed) {
      return (
        <div className="px-2 py-1">
          <NavLink
            to={item.url}
            title={groupLabel}
            className={cn(
              "relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : isLight
                  ? "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
            )}
          >
            <MenuIconTile icon={group.icon} tint={tint} active={active} />
          </NavLink>
        </div>
      );
    }
    return (
      <div className="mb-0.5 px-2">
        <NavLink
          to={item.url}
          className={cn(
            "relative flex items-center gap-3 px-4 py-2 text-[13px] font-semibold transition-colors rounded-lg uppercase tracking-wider",
            active
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-sidebar-primary-foreground/80"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          )}
        >
          <MenuIconTile icon={group.icon} tint={tint} active={active} />
          <span className="flex-1 truncate">{groupLabel}</span>
        </NavLink>
      </div>
    );
  }

  if (collapsed) {
    const first = group.items[0];
    const active = first ? isActiveItem(first) : false;
    return (
      <div className="px-2 py-1">
        {first && (
          <NavLink
            to={first.url}
            title={groupLabel}
            className={cn(
              "relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <MenuIconTile icon={group.icon} tint={tint} active={active} />
          </NavLink>
        )}
      </div>
    );
  }

  const effectiveOpen = open;

  return (
    <div className="mb-0.5">
      <button
        onClick={() => onToggle(group.key)}
        className={cn(
          "relative w-full flex items-center gap-3 px-4 py-2 text-[13px] font-semibold transition-colors rounded-lg mx-2 uppercase tracking-wider",
          isActiveGroup
            ? "text-sidebar-foreground before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-sidebar-primary"
            : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent",
        )}
        style={{ width: "calc(100% - 16px)" }}
      >
        <MenuIconTile icon={group.icon} tint={tint} active={isActiveGroup} />
        <span className="flex-1 text-left truncate">{groupLabel}</span>
        {effectiveOpen ? (
          <ChevronDown className="h-3 w-3 opacity-60" />
        ) : (
          <ChevronRight className="h-3 w-3 opacity-60" />
        )}
      </button>
      {effectiveOpen && (
        <div className="relative ml-7 mr-2 mt-1 mb-1 pl-4 border-l border-sidebar-border/70 space-y-0.5">
          {group.items.map((item) => {
            const active = isActiveItem(item);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.url}
                to={item.url}
                className={cn(
                  "group/sub relative flex items-center gap-2.5 px-3 py-[7px] text-[13px] rounded-md transition-colors",
                  "before:absolute before:left-[-16px] before:top-1/2 before:-translate-y-1/2 before:w-3 before:h-px before:bg-sidebar-border/70",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground font-semibold after:absolute after:left-[-17px] after:top-1.5 after:bottom-1.5 after:w-[2px] after:rounded-full after:bg-sidebar-primary before:bg-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-70")}
                  strokeWidth={2}
                />
                <span className="flex-1 truncate">{itemTitle(item)}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PortalSidebar({
  groups,
  title,
  subtitle,
  footer,
  logoSrc,
}: PortalSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { resolvedMode } = useTheme();
  const { lang } = useLanguage();
  const isLight = resolvedMode === "light";
  const location = useLocation();
  const [search, setSearch] = useState("");

  const activeGroupKey = useMemo(() => {
    const found = groups.find((g) =>
      g.items.some((i) => location.pathname.startsWith(i.url)),
    );
    return found?.key ?? groups[0]?.key ?? null;
  }, [location.pathname, groups]);

  const [openKey, setOpenKey] = useState<string | null>(activeGroupKey);

  useEffect(() => {
    if (activeGroupKey && activeGroupKey !== openKey) setOpenKey(activeGroupKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupKey]);

  const handleToggle = (key: string) =>
    setOpenKey((prev) => (prev === key ? null : key));

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups.map((g) => ({ group: g, matched: false }));
    return groups
      .map((g) => {
        const groupMatches =
          g.label.toLowerCase().includes(q) ||
          (g.labelEn ?? "").toLowerCase().includes(q);
        const items = groupMatches
          ? g.items
          : g.items.filter(
              (i) =>
                i.title.toLowerCase().includes(q) ||
                (i.titleEn ?? "").toLowerCase().includes(q),
            );
        if (items.length === 0) return null;
        return { group: { ...g, items }, matched: true };
      })
      .filter(Boolean) as { group: PortalMenuGroup; matched: boolean }[];
  }, [groups, search]);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div
        className={cn(
          "flex flex-col h-full transition-colors",
          isLight
            ? "bg-card text-foreground border-r border-sidebar-border"
            : "bg-sidebar text-sidebar-foreground",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-4 shrink-0",
            collapsed && "px-2 justify-center",
            isLight ? "border-b border-sidebar-border" : "border-b border-white/10",
          )}
        >
          <img
            src={logoSrc || ispDeskLogo}
            alt={title}
            className={cn(
              "object-contain shrink-0",
              collapsed ? "h-8 w-8" : "h-9 w-9 rounded",
            )}
          />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold uppercase tracking-wide truncate">
                {title}
              </div>
              {subtitle && (
                <div className="text-[11px] text-muted-foreground truncate">
                  {subtitle}
                </div>
              )}
            </div>
          )}
        </div>

        {!collapsed && (
          <div
            className={cn(
              "px-3 py-2 shrink-0",
              isLight ? "border-b border-sidebar-border" : "border-b border-white/10",
            )}
          >
            <div className="relative">
              <Search
                className={cn(
                  "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5",
                  isLight ? "text-muted-foreground" : "text-slate-400",
                )}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === "bn" ? "মেনু খুঁজুন..." : "Search menu..."}
                className={cn(
                  "w-full h-8 pl-8 pr-7 text-[12px] rounded-md outline-none transition-colors",
                  isLight
                    ? "bg-muted/50 border border-border focus:border-primary text-foreground placeholder:text-muted-foreground"
                    : "bg-white/5 border border-white/10 focus:border-primary text-white placeholder:text-slate-500",
                )}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted",
                    isLight ? "text-muted-foreground" : "text-slate-400",
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <SidebarContent className="bg-transparent py-2">
            {filteredGroups.map(({ group, matched }, idx) => (
              <GroupNode
                key={group.key}
                group={group}
                groupIndex={idx}
                forceOpen={matched ? true : undefined}
                openKey={openKey}
                onToggle={handleToggle}
              />
            ))}
            {filteredGroups.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                {lang === "bn" ? "কোনো মেনু পাওয়া যায়নি" : "No menu found"}
              </div>
            )}
          </SidebarContent>
        </ScrollArea>

        {footer && !collapsed && (
          <div
            className={cn(
              "px-3 py-2 shrink-0",
              isLight ? "border-t border-sidebar-border" : "border-t border-white/10",
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </Sidebar>
  );
}
