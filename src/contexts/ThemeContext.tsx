import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeName = "default" | "light" | "ocean" | "purple" | "emerald" | "sunset";

interface ThemeInfo {
  name: ThemeName;
  label: string;
  preview: string; // CSS color for preview dot
}

export const themes: ThemeInfo[] = [
  { name: "default", label: "Dark Teal", preview: "hsl(173, 80%, 40%)" },
  { name: "light", label: "Light", preview: "hsl(0, 0%, 96%)" },
  { name: "ocean", label: "Ocean Blue", preview: "hsl(217, 91%, 50%)" },
  { name: "purple", label: "Purple Night", preview: "hsl(262, 83%, 58%)" },
  { name: "emerald", label: "Emerald", preview: "hsl(152, 76%, 36%)" },
  { name: "sunset", label: "Warm Sunset", preview: "hsl(25, 95%, 53%)" },
];

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "default", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem("fiberwatch-theme");
    return (saved as ThemeName) || "light";
  });

  const setTheme = (t: ThemeName) => {
    setThemeState(t);
    localStorage.setItem("fiberwatch-theme", t);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "default") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
