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
        background: "var(--color-bg)",
        surface:    "var(--color-surface)",
        "surface-2":"var(--color-surface-2)",
        primary:    "#C48A97",   // kept as hex — used in gradients
        accent:     "#EDD5DB",
        secondary:  "#7B6D8D",
        dark:       "var(--color-text)",
        "text-mid": "var(--color-text-mid)",
        "text-dim": "var(--color-text-dim)",
        card:       "var(--color-surface)",
        ghost:      "var(--color-ghost)",
      },
      fontFamily: {
        display: ["'Manrope'", "sans-serif"],
        body: ["'Nunito'", "sans-serif"],
        accent: ["'Space Mono'", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(180,80,100,0.08)",
        card: "0 0 0 1px #F5DEE2, 0 4px 16px rgba(180,80,100,0.10)",
        dark: "0 8px 32px rgba(42,35,48,0.18)",
      },
      maxWidth: {
        app: "430px",
      },
    },
  },
  plugins: [],
};

export default config;
