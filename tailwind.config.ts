import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Source Sans 3", "ui-sans-serif", "sans-serif"],
        display: ["var(--font-display)", "Outfit", "ui-sans-serif", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(15, 23, 42, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
