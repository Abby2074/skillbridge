/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1B4F72', light: '#2E86C1' },
        accent: { DEFAULT: '#E67E22', light: '#F39C12' },
        red: { brand: '#EF4444', light: '#F87171', soft: '#FEE2E2' },
        orange: { brand: '#F97316', light: '#FB923C', soft: '#FFF7ED' },
        success: '#1E8449',
        danger: '#C0392B',
        warning: '#B7950B',
        surface: '#FFFFFF',
        border: '#DEE2E6',
        'text-main': '#1A1A2E',
        'text-muted': '#6C757D',
        sidebar: '#0F2D4A',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
