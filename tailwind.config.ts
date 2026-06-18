import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: "#082f2a",
        obsidian: "#070707",
        charcoal: "#111318",
        gold: "#f5c542",
        danger: "#ef4444",
      },
      boxShadow: {
        gold: "0 0 40px rgba(245, 197, 66, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
