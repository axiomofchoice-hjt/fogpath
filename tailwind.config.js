/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "game-bg": "#0d0d12",
        "game-panel": "#1a1520",
        "game-card": "#231f2b",
        "game-border": "#2e2a38",
        "game-text": "#c4c0cc",
        "game-dim": "#6b6375",
        "game-gold": "#d4a853",
        "game-red": "#c0392b",
        "game-blue": "#4a8fe7",
        "game-green": "#27ae60",
        "game-purple": "#8e44ad",
        "game-orange": "#e67e22",
        "game-deepgreen": "#1f7a3d",
      },
      fontFamily: {
        mono: [
          '"Sarasa Mono SC"',
          '"JetBrains Mono"',
          "ui-monospace",
          "Consolas",
          "monospace",
        ],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "typewriter": "typewriter 0.05s steps(1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
