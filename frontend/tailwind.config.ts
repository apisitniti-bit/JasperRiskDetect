import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ide: {
          bg: "#1e1e1e",
          sidebar: "#252526",
          panel: "#1e1e1e",
          border: "#3c3c3c",
          active: "#094771",
          text: "#cccccc",
          "text-muted": "#858585",
          accent: "#007acc",
          error: "#f44747",
          warning: "#cca700",
          info: "#3794ff",
          success: "#89d185",
        },
      },
      fontFamily: {
        mono: ["Fira Code", "Consolas", "monospace"],
        thai: ["Sarabun", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
