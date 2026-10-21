import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#091932',
        surface:  '#0d2244',
        ink:      '#96E0F7',
        critical: '#FFE600',
        high:     '#FF6B35',
        notable:  '#4ECDC4',
      },
      fontFamily: {
        pixel:   ['var(--font-pixel)', 'monospace'],
        display: ['var(--font-bangers)', 'cursive'],
        mono:    ['var(--font-ibm-mono)', 'monospace'],
        body:    ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
