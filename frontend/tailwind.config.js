/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0f0f11",
        card: "#18181b",
        border: "#27272a",
        primaryText: "#e4e4e7",
        secondaryText: "#a1a1aa",
        accent: "#6366f1",
        accentHover: "#4f46e5",
        inputBg: "#09090b",
      },
    },
  },
  plugins: [],
};
