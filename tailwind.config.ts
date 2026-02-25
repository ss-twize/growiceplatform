import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#032221",
        surface: "#0b0b0b",
        border: "rgba(57,255,20,0.25)",
        accent: "#00E378",
        muted: "#9ca3af",
        danger: "#FF1A1A",
        warning: "#f3cd66",
        success: "#66f7bf"
      },
      boxShadow: {
        card: "0 18px 40px rgba(0,0,0,0.45)"
      }
    }
  },
  plugins: []
};

export default config;
