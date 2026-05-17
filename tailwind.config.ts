import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // CampaignWise brand
        navy: {
          DEFAULT: "#1B2B4B",
          50:  "#EEF1F7",
          100: "#D4DCF0",
          200: "#A9B9E1",
          300: "#7E96D2",
          400: "#5373C3",
          500: "#2B50A8",
          600: "#1B2B4B",   // PRIMARY NAVY
          700: "#152238",
          800: "#0F1A29",
          900: "#09111A",
          950: "#040809",
        },
        blue: {
          DEFAULT: "#2563EB",
          50:  "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",   // PRIMARY BLUE
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#172554",
        },
        brand: {
          navy:   "#1B2B4B",
          blue:   "#2563EB",
          bghover:"#243762",
          border: "#2D3F6B",
          muted:  "#8896B3",
          text:   "#F0F4FF",
          surface:"#243250",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(37,99,235,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.07) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid": "28px 28px",
      },
      animation: {
        "fade-in":   "fadeIn 0.35s ease-out forwards",
        "slide-up":  "slideUp 0.4s ease-out forwards",
        "slide-in-left": "slideInLeft 0.3s ease-out forwards",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:       { from: { opacity: "0" },               to: { opacity: "1" } },
        slideUp:      { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideInLeft:  { from: { opacity: "0", transform: "translateX(-8px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        pulseDot:     { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
      },
      boxShadow: {
        "blue-sm":  "0 0 12px rgba(37,99,235,0.25)",
        "blue-md":  "0 0 24px rgba(37,99,235,0.35)",
        "blue-lg":  "0 0 48px rgba(37,99,235,0.25)",
        "card":     "0 2px 16px rgba(0,0,0,0.35)",
        "sidebar":  "4px 0 24px rgba(0,0,0,0.3)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
