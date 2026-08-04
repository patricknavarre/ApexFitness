import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        bg2: 'var(--bg2)',
        bg3: 'var(--bg3)',
        card: 'var(--card)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        accent3: 'var(--accent3)',
        tan: 'var(--tan)',
        text: 'var(--text)',
        muted: 'var(--muted)',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        glow: '0 0 20px rgba(196, 163, 90, 0.18)',
        'glow-accent2': '0 0 20px rgba(196, 92, 74, 0.18)',
        'glow-accent3': '0 0 18px rgba(75, 83, 32, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
