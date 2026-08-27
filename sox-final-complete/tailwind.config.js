/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 50:'#eef3ff', 100:'#e0eaff', 500:'#4f6ef7', 600:'#3b5bf5', 700:'#2d4ae0', 900:'#1a2d8f' },
        surface: { DEFAULT:'#ffffff', 2:'#f8f9fb', 3:'#f0f2f7' },
        'dark-surface': { DEFAULT:'#161b27', 2:'#1e2538', 3:'#252d40' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['JetBrains Mono', 'monospace'] },
    },
  },
  plugins: [],
}
