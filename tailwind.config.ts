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
        background: "#F7F5F2",
        primary: "#C48A97",
        accent: "#EDD5DB",
        secondary: "#7B6D8D",
        dark: "#2E2E2E",
        card: "#FFFFFF",
        "card-dark": "#2A2330",
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(196,138,151,0.10)",
        card: "0 2px 16px rgba(46,46,46,0.06)",
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
