import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEMES = ["system", "light", "dark"] as const;
type Theme = (typeof THEMES)[number];

const LABELS: Record<Theme, string> = {
  system: "Theo hệ thống",
  light: "Sáng",
  dark: "Tối",
};

const ICONS: Record<Theme, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "full";
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Render disabled placeholder during SSR/before hydration to avoid mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={variant === "full" ? "sm" : "icon"}
        className={className}
        aria-label="Đổi chế độ giao diện"
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const current = (THEMES.includes(theme as Theme) ? theme : "system") as Theme;
  const nextIdx = (THEMES.indexOf(current) + 1) % THEMES.length;
  const next = THEMES[nextIdx];
  const Icon = ICONS[current];

  const ariaLabel = `Chế độ giao diện hiện tại: ${LABELS[current]}. Nhấn để chuyển sang ${LABELS[next]}.`;

  if (variant === "full") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(next)}
        className={className}
        aria-label={ariaLabel}
      >
        <Icon className="h-4 w-4 mr-2" />
        Giao diện: {LABELS[current]}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      className={className}
      aria-label={ariaLabel}
      title={`Giao diện: ${LABELS[current]}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
