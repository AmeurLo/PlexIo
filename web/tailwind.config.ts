import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Domely brand palette — extracted from low-poly logo
        teal: {
          50:  "#E3F5F2",
          100: "#C7EBE5",
          200: "#A0D9D0",
          300: "#6CC4B8",
          400: "#3FAF86",   // accent green
          500: "#1E7A6E",   // primary
          600: "#196860",
          700: "#144F54",   // dark teal
          800: "#0E3840",
          900: "#08232B",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      letterSpacing: {
        tighter: "-0.04em",
        tight: "-0.025em",
      },
      animation: {
        "fade-up":    "fadeUp 0.5s ease forwards",
        "fade-in":    "fadeIn 0.4s ease forwards",
        "float":      "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
      },
      backgroundImage: {
        "domely-gradient": "linear-gradient(135deg, #144F54 0%, #1E7A6E 50%, #3FAF86 100%)",
        "hero-grid": "radial-gradient(circle at 1px 1px, rgba(30,122,110,0.07) 1px, transparent 0)",
      },
      boxShadow: {
        "teal-sm":  "0 2px 12px rgba(30,122,110,0.12)",
        "teal-md":  "0 4px 24px rgba(30,122,110,0.18)",
        "teal-lg":  "0 8px 40px rgba(30,122,110,0.22)",
        "card":     "0 1px 4px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06)",
        "card-hover": "0 2px 8px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
