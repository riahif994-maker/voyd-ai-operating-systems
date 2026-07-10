import { Moon, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label="Toggle interface theme"
      onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
    >
      {theme === "dark" ? <Moon size={16} /> : <SunMedium size={16} />}
    </button>
  );
}
