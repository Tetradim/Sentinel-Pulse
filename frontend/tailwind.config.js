/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Syne for bold display headings, Rajdhani for UI labels
        sans:    ['Rajdhani', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        heading: ['Syne', 'system-ui', 'sans-serif'],
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // Metal palette as named tokens
        metal: {
          deep:    '#0a0a0b',
          base:    '#101014',
          surface: '#16161c',
          raised:  '#1c1c24',
        },
        gold: {
          dim:    '#503e12',
          mid:    '#b4820a',
          bright: '#dca828',
          gleam:  '#ffdc64',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'gold-sm':  '0 0 8px -2px rgba(220,168,40,0.3)',
        'gold-md':  '0 0 16px -4px rgba(220,168,40,0.35)',
        'gold-lg':  '0 0 28px -6px rgba(220,168,40,0.4)',
        'green-sm': '0 0 10px -3px rgba(45,212,160,0.3)',
        'red-sm':   '0 0 10px -3px rgba(240,80,96,0.3)',
      },
      keyframes: {
        'gleam-sweep': {
          '0%':         { backgroundPosition: '-100% 0' },
          '60%, 100%':  { backgroundPosition: '200% 0' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
      animation: {
        'gleam-sweep': 'gleam-sweep 5s ease-in-out infinite',
        shimmer:       'shimmer 1.5s ease-in-out infinite',
        'pulse-dot':   'pulse-dot 2s ease-in-out infinite',
      },
      backgroundImage: {
        'gold-sheen': 'linear-gradient(135deg, #503e12 0%, #b4820a 30%, #dca828 50%, #ffdc64 55%, #dca828 65%, #b4820a 80%, #503e12 100%)',
        'metal-card': 'linear-gradient(145deg, #1c1c24 0%, #16161c 60%, #141418 100%)',
        'metal-header': 'linear-gradient(180deg, #101014 0%, #0e0e12 100%)',
      },
    },
  },
  plugins: [import("tailwindcss-animate")],
}
