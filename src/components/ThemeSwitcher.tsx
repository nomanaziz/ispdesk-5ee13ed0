import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeSwitcher() {
  const { resolvedMode, updateSettings } = useTheme();

  const toggle = () => {
    updateSettings({ mode: resolvedMode === "dark" ? "light" : "dark" });
  };

  return (
    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggle}>
      {resolvedMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
