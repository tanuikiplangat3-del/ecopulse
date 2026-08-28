import type { Config } from "tailwindcss";

/**
 * Welcome Tomorrow brand design system (from welcometomorrow.io).
 * Dark theme, Outfit font, green / yellow / blue accents, glass cards.
 * NOTE: This is the official brand system - do not swap for ranktomorrow's palette.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wt: {
          black: "#000000",
          white: "#ffffff",
          green: "#0aa865",
          greenSoft: "#4ca56b",
          yellow: "#ffd952",
          blue: "#2b4dff",
          muted: "rgba(255,255,255,0.60)",
          faint: "rgba(255,255,255,0.50)",
          surface1: "rgba(255,255,255,0.10)",
          surface2: "rgba(255,255,255,0.15)",
          surface3: "rgba(255,255,255,0.20)",
          border: "rgba(255,255,255,0.12)",
        },
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "Outfit", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "10px",
        md: "15px",
        lg: "20px",
        pill: "30px",
      },
      boxShadow: {
        card: "0 4px 4px rgba(0,0,0,0.25)",
      },
      maxWidth: {
        container: "1200px",
        measure: "680px",
      },
    },
  },
  plugins: [],
};
export default config;
