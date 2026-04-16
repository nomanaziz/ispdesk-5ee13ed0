import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ThemeSkin = "default" | "bordered";

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
}

const ThemeContext = createContext<ThemeContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
  resetSettings: () => {},
  resolvedMode: "light",
});

function getSystemMode(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    try {
      const saved = localStorage.getItem("ispdesk-theme-v2");
      if (saved) return { ...defaultSettings, ...JSON.parse(saved) };
    } catch {}
    return defaultSettings;
  });

  const [systemMode, setSystemMode] = useState<"light" | "dark">(getSystemMode);

  const resolvedMode = settings.mode === "system" ? systemMode : settings.mode;

  const updateSettings = useCallback((partial: Partial<ThemeSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem("ispdesk-theme-v2", JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem("ispdesk-theme-v2");
    setSettings(defaultSettings);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemMode(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    // Set mode
    root.setAttribute("data-theme-mode", resolvedMode);
    // Set skin
    root.setAttribute("data-skin", settings.skin);

    // Set primary color CSS variables
    const color = primaryColors.find(c => c.name === settings.primaryColor) || primaryColors[0];
    root.style.setProperty("--primary", color.hsl);
    root.style.setProperty("--ring", color.hsl);
    root.style.setProperty("--sidebar-primary", color.hsl);
    root.style.setProperty("--sidebar-ring", color.hsl);
  }, [resolvedMode, settings.primaryColor, settings.skin]);

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, resetSettings, resolvedMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
