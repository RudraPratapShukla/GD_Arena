/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0E0F12",
        surface: "#16181D",
        raised: "#1E2128",
        border: "#2A2E37",
        ink: "#F2EFE8",
        muted: "#9A9CA5",
        accent: "#C8F545",
        success: "#4ADE80",
        warn: "#FBBF24",
        danger: "#F87171",
        // Speaker colors
        aarav: "#FF5C5C",
        meera: "#2DD4BF",
        kabir: "#6EA8FF",
        riya: "#F472B6",
        dev: "#FBBF24",
        moderator: "#E7E2D6",
        you: "#C8F545",
      },
      fontFamily: {
        heading: ["'Space Grotesk'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
    },
  },
  plugins: [],
};
