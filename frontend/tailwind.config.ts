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
        navy: "#0D2137",
        "navy-light": "#1A3A5C",
        accent: "#2E86C1",
        "accent-dark": "#1A5276",
        teal: "#148F77",
        success: "#1E8449",
        danger: "#922B21",
        warning: "#CA6F1E",
        muted: "#5D6D7E",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;