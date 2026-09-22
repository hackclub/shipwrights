import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blueprint: {
          DEFAULT: "#0B3A5C",
          deep: "#082A44",
          line: "#BFE0FF",
        },
        paper: "#F6F0DE",
        "paper-dim": "#EDE4C8",
        ink: "#1C2530",
        brass: "#C79A45",
        signal: "#EC3750",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        paper: "0 1px 0 rgba(28,37,48,0.05), 0 12px 24px -12px rgba(28,37,48,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
