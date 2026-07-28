import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF6EC",
        ink: "#1B1D22",
        indigo: {
          DEFAULT: "#1E2A4A",
          light: "#2E3E64",
          dark: "#141D34"
        },
        marigold: {
          DEFAULT: "#E8912D",
          light: "#F3AE5C",
          dark: "#C4761D"
        },
        verified: "#2F7A4F",
        muted: "#7A7264",
        line: "#D8D0BE"
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        native: ["var(--font-tiro)", "serif"],
        body: ["var(--font-hind)", "sans-serif"]
      },
      boxShadow: {
        seal: "0 0 0 3px #FAF6EC, 0 0 0 5px #1E2A4A"
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "0.55" },
          "100%": { transform: "scale(1.9)", opacity: "0" }
        }
      },
      animation: {
        pulseRing: "pulseRing 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite"
      }
    }
  },
  plugins: []
};
export default config;
