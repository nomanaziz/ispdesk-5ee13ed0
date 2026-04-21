import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeSkin = "default" | "bordered";
export type ThemeScope = "admin" | "portal" | "pop" | "public";

export interface PrimaryColor {
  name: string;
  label: string;
  hsl: string; // e.g. "262 83% 58%"
}

export const primaryColors: PrimaryColor[] = [
  { name: "purple", label: "বেগুনি", hsl: "258 90% 66%" },
  { name: "blue", label: "নীল", hsl: "217 91% 60%" },
  { name: "teal", label: "টিল", hsl: "173 80% 40%" },
  { name: "red", label: "লাল", hsl: "0 84% 60%" },
  { name: "orange", label: "কমলা", hsl: "25 95% 53%" },
  { name: "green", label: "সবুজ", hsl: "142 71% 45%" },
  { name: "cyan", label: "সায়ান", hsl: "199 89% 48%" },
];

export interface ThemeSettings {
  mode: ThemeMode;
  primaryColor: string; // name from primaryColors
  skin: ThemeSkin;
  sidebarCollapsed: boolean;
  contentWidth: "compact" | "wide";
}

const defaultSettings: ThemeSettings = {
  mode: "light",
  primaryColor: "purple",
  skin: "default",
  sidebarCollapsed: false,
  contentWidth: "wide",
};

interface ThemeContextType {
  settings: ThemeSettings;
  updateSettings: (partial: Partial<ThemeSettings>) => void;
  resetSettings: () => void;
  resolvedMode: "light" | "dark";
  scope: ThemeScope;
  lockLight: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  resetSettings: () => {},
  resolvedMode: "light",
  scope: "admin",
  lockLight: false,
});

function getSystemMode(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function detectScope(pathname: string): ThemeScope {
  if (pathname.startsWith("/dashboard")) return "admin";
  if (pathname.startsWith("/portal")) return "portal";
  if (pathname.startsWith("/pop-admin") || pathname.startsWith("/reseller")) return "pop";
  return "public";
}

function storageKey(scope: ThemeScope) {
  return `ispdesk-theme-${scope}`;
}

function loadSettings(scope: ThemeScope): ThemeSettings {
  try {
    const saved = localStorage.getItem(storageKey(scope));
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    // One-time migration of legacy global key into admin scope
    if (scope === "admin") {
      const legacy = localStorage.getItem("ispdesk-theme-v2");
      if (legacy) {
        const parsed = { ...defaultSettings, ...JSON.parse(legacy) };
        localStorage.setItem(storageKey("admin"), JSON.stringify(parsed));
        localStorage.removeItem("ispdesk-theme-v2");
        return parsed;
      }
    }
  } catch {}
  return defaultSettings;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname);

  // React to client-side route changes (history API doesn't fire popstate on push/replace,
  // so we patch them once to emit a custom event).
  useEffect(() => {
    const update = () => setPathname(window.location.pathname);
    const w = window as any;
    if (!w.__ispdeskHistoryPatched) {
      const origPush = history.pushState;
      const origReplace = history.replaceState;
      history.pushState = function (...args) {
        const r = origPush.apply(this, args as any);
        window.dispatchEvent(new Event("ispdesk:locationchange"));
        return r;
      };
      history.replaceState = function (...args) {
        const r = origReplace.apply(this, args as any);
        window.dispatchEvent(new Event("ispdesk:locationchange"));
        return r;
      };
      w.__ispdeskHistoryPatched = true;
    }
    window.addEventListener("popstate", update);
    window.addEventListener("ispdesk:locationchange", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.removeEventListener("ispdesk:locationchange", update);
    };
  }, []);

  const scope = useMemo(() => detectScope(pathname), [pathname]);
  const lockLight = scope !== "admin"; // only admin gets dark mode

  const [settingsByScope, setSettingsByScope] = useState<Record<ThemeScope, ThemeSettings>>(() => ({
    admin: loadSettings("admin"),
    portal: loadSettings("portal"),
    pop: loadSettings("pop"),
    public: loadSettings("public"),
  }));

  const settings = settingsByScope[scope];

  const [systemMode, setSystemMode] = useState<"light" | "dark">(getSystemMode);

  const effectiveMode: ThemeMode = lockLight ? "light" : settings.mode;
  const resolvedMode = effectiveMode === "system" ? systemMode : effectiveMode;

  const updateSettings = useCallback((partial: Partial<ThemeSettings>) => {
    setSettingsByScope(prev => {
      const current = prev[scope];
      // Strip mode changes when scope is locked to light
      const safePartial = lockLight ? { ...partial, mode: "light" as ThemeMode } : partial;
      const next = { ...current, ...safePartial };
      try {
        localStorage.setItem(storageKey(scope), JSON.stringify(next));
      } catch {}
      return { ...prev, [scope]: next };
    });
  }, [scope, lockLight]);

  const resetSettings = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(scope));
    } catch {}
    setSettingsByScope(prev => ({ ...prev, [scope]: defaultSettings }));
  }, [scope]);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemMode(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Apply theme to DOM whenever the active scope or its settings change
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme-mode", resolvedMode);
    root.setAttribute("data-skin", settings.skin);
    root.setAttribute("data-theme-scope", scope);

    const color = primaryColors.find(c => c.name === settings.primaryColor) || primaryColors[0];
    root.style.setProperty("--primary", color.hsl);
    root.style.setProperty("--ring", color.hsl);
    root.style.setProperty("--sidebar-primary", color.hsl);
    root.style.setProperty("--sidebar-ring", color.hsl);
  }, [resolvedMode, settings.primaryColor, settings.skin, scope]);

  return (
    <ThemeContext.Provider value={{ settings: { ...settings, mode: effectiveMode }, updateSettings, resetSettings, resolvedMode, scope, lockLight }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
