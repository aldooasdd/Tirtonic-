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
        // token shadcn (dipakai komponen pihak ketiga, mis. SkateDeckRail test page).
        // Nilainya dari CSS var yang didefinisikan scoped di page-nya; kelas di tempat
        // lain gak kepakai, jadi aman buat sisa situs.
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        card: "var(--color-card)",
        "card-foreground": "var(--color-card-foreground)",
        "muted-foreground": "var(--color-muted-foreground)",
        border: "var(--color-border)",
        ring: "var(--color-ring)",
        "chart-1": "var(--color-chart-1)",
        "chart-2": "var(--color-chart-2)",
        "chart-3": "var(--color-chart-3)",
        "chart-4": "var(--color-chart-4)",
        "chart-5": "var(--color-chart-5)",
      },
      maxWidth: { site: "1440px" },
    },
  },
  plugins: [],
};

export default config;
