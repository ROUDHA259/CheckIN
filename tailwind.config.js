/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Alexandria', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 45px -25px rgba(30, 64, 175, 0.35)',
      },
    },
  },
  plugins: [],
};
