import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

const variants = {
  primary:   "bg-[#0a7cff] text-white hover:bg-[#2e94ff] shadow-[0_0_16px_rgba(10,124,255,0.3)] hover:shadow-[0_0_24px_rgba(10,124,255,0.5)]",
  secondary: "bg-[#1e2d63] text-[#e8eaf2] hover:bg-[#2e3f7f] border border-[#2e3f7f]",
  ghost:     "text-[#7784b5] hover:text-[#e8eaf2] hover:bg-[#111c47]",
  danger:    "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2   text-sm rounded-xl",
  lg: "px-6 py-3   text-sm rounded-xl font-semibold",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
