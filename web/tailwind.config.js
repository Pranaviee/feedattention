/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#EDEEF1',
        panel: 'rgb(252 252 253 / 0.52)',
        panel2: 'rgb(246 247 249 / 0.44)',
        line: '#E3E5E9',
        'line-strong': '#C9CDD4',

        fg: '#16181D',
        muted: '#5C6370',
        faint: '#8B919C',

        accent: '#2C5FE8',
        'accent-deep': '#1E4FC4',

        live: '#16A34A',
        'live-ink': '#067A4E',
        pre: '#2C5FE8',
        cite: '#5C6370',

        warn: '#E8850C',
        'warn-ink': '#B36400',
        danger: '#DC2626',
        violet: '#7B4BE8',
        'violet-ink': '#5B2FC0',
        teal: '#0D9488',

        chart: {
          background: 'var(--chart-background)',
          foreground: 'var(--chart-foreground)',
          label: 'var(--chart-label)',
          'tooltip-foreground': 'var(--chart-tooltip-foreground)',
          'tooltip-muted': 'var(--chart-tooltip-muted)',
          'tooltip-background': 'var(--chart-tooltip-background)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        // Scoped to specific headings/copy that want to read as less
        // "generic AI product" than the sans/serif pairing above — not a
        // replacement for it app-wide.
        display: ['Fraunces', '"Source Serif 4"', 'Georgia', 'serif'],
        reading: ['Newsreader', '"Source Serif 4"', 'Georgia', 'serif'],
      },
      maxWidth: {
        page: '1240px',
      },
      boxShadow: {
        card: '0 1px 0 rgb(255 255 255 / 0.55) inset, 0 8px 28px rgb(22 24 29 / 0.07)',
      },
      animation: {
        shine: 'shine var(--duration, 14s) infinite linear',
        'shiny-text': 'shiny-text 8s infinite',
      },
      keyframes: {
        shine: {
          '0%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        'shiny-text': {
          '0%, 90%, 100%': {
            backgroundPosition: 'calc(-100% - var(--shiny-width)) 0',
          },
          '30%, 60%': {
            backgroundPosition: 'calc(100% + var(--shiny-width)) 0',
          },
        },
      },
    },
  },
  plugins: [],
}
