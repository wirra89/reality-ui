import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        taxi: {
          yellow: '#FFD700',
          dark: '#0f0f0f',
          card: '#151515',
          border: '#2a2a2a',
          muted: '#555555',
        },
      },
    },
  },
  plugins: [],
}
export default config
