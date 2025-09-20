/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#67e8f9',
          dark: '#22d3ee'
        },
        accent: {
          DEFAULT: '#93c5fd',
          dark: '#60a5fa'
        }
      },
      boxShadow: {
        glow: '0 0 20px rgba(147, 197, 253, 0.25)'
      }
    },
  },
  plugins: [],
}
