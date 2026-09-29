import { Moon, Sun } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { useTheme } from "./theme";

const variants = {
  primary: "bg-accent text-on-accent press hover:bg-accent/90",
  secondary: "bg-panel-2 text-ink press [--press-color:var(--color-panel-2)]",
  ghost: "text-ink hover:bg-panel-2",
  exit: "border-2 border-accent text-accent-ink hover:bg-accent hover:text-on-accent",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3",
  lg: "px-7 py-4 text-lg",
  icon: "size-10",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="flex size-10 items-center justify-center rounded-full text-mute hover:bg-panel-2 hover:text-ink"
    >
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
