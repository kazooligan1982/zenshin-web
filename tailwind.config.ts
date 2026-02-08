import type { Config } from "tailwindcss";

const config = {
  darkMode: ["class", ".dark"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        zenshin: {
          cream: "var(--zenshin-cream)",
          orange: "var(--zenshin-orange)",
          teal: "var(--zenshin-teal)",
          charcoal: "var(--zenshin-charcoal)",
          navy: "var(--zenshin-navy)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
