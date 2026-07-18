import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom color palette based on your CSS variables
        background: "var(--background)",
        "bg-primary": "var(--bg-primary)",
        "bg-secondary": "var(--bg-secondary)",
        "bg-tertiary": "var(--bg-tertiary)",
        "card-background": "var(--card-background)",
        "secondary-background": "var(--secondary-background)",
        "hover-background": "var(--hover-background)",
        "input-background": "var(--input-background)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        "border-color": "var(--border-color)",
        "hover-bg": "var(--hover-bg)",
        "primary-color": "var(--primary-color)",
        "primary-hover": "var(--primary-hover)",
        "primary-color-alpha": "var(--primary-color-alpha)",
        "accent-primary": "var(--accent-primary)",
        "accent-hover": "var(--accent-hover)",
        "error-color": "var(--error-color)",
        "error-background": "var(--error-background)",
      },
      boxShadow: {
        custom: "var(--shadow)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
  darkMode: ["class", '[data-theme="dark"]'],
};

export default config;