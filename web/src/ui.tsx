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

export function LogoMark({ className = "h-5 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="4 19 56 26" className={`shrink-0 ${className}`} aria-hidden>
      <circle cx="15" cy="32" r="11" fill="var(--color-p0)" />
      <circle cx="49" cy="32" r="11" fill="var(--color-p2)" />
      <circle cx="32" cy="32" r="13" fill="var(--color-accent)" stroke="var(--color-call)" strokeWidth="3.5" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <a href="/" className={`inline-flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight ${className}`}>
      <LogoMark />
      crewi
    </a>
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
