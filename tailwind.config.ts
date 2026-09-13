import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // replicated from old-site screenshots
        primary: "#146b52", // header / brand green
        primaryDark: "#0e5540",
        ball: "#a4d037", // tennis-ball lime
        ink: "#111111", // dark pill buttons
      },
      maxWidth: { site: "1200px" },
    },
  },
  plugins: [],
};

export default config;
