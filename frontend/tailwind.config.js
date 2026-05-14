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
        sans:    ['Rajdhani', 'system-ui', 'sans-serif'],
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
        // Sentinel Pulse design tokens
        metal: {
          deep:    '#04030a',
          base:    '#07050c',
          surface: '#0a0608',
          raised:  '#100c12',
        },
        gold: {
          dim:    '#503e12',
          mid:    '#b4820a',
          bright: '#dca828',
          gleam:  '#fde88a',
        },
        sentinel: {
          green:  '#2dd4a0',
          red:    '#e03040',
          blue:   '#4d82dc',
          purple: '#4525B5',
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
        'red-sm':   '0 0 10px -3px rgba(224,56,64,0.3)',
        'tunnel':   '0 0 0 1px rgba(200,145,10,0.3), 0 0 24px -4px rgba(200,145,10,0.45)',
      },
      backgroundImage: {
        'gold-sheen':    'linear-gradient(135deg, #503e12 0%, #b4820a 30%, #dca828 50%, #fde88a 55%, #dca828 65%, #b4820a 80%, #503e12 100%)',
        'silver-sheen':  'linear-gradient(135deg, #8a9aaa 0%, #b8ccd8 18%, #ddeef8 38%, #ffffff 50%, #ddeef8 62%, #b8ccd8 80%, #8a9aaa 100%)',
        'header-gold':   'linear-gradient(180deg, #1c1302 0%, #3a2808 15%, #8a6010 35%, #d4a820 55%, #f0c840 72%, #fff090 82%, #f0c840 92%, #d4a820 100%)',
        'header-silver': 'linear-gradient(180deg, #1a1c20 0%, #242830 15%, #363c44 30%, #484e58 40%, #565e6a 48%, #606870 50%, #565e6a 52%, #484e58 60%, #363c44 70%, #242830 85%, #1a1c20 100%)',
      },
      keyframes: {
        'sp-blink': {
          '0%, 100%': { opacity: '1'  },
          '50%':      { opacity: '.2' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0'  },
        },
      },
      animation: {
        'sp-blink': 'sp-blink 2s ease-in-out infinite',
        shimmer:    'shimmer 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [import("tailwindcss-animate")],
}
