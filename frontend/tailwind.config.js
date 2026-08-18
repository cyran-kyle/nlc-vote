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
        nlc: {
          blue: '#418ccd',       // Official College Primary Blue
          'blue-light': '#5ca3db',
          'blue-dark': '#2c6ea6',
          navy: '#0e1e2e',       // Official College Deep Navy Base
          toolbar: '#2a4856',    // Official Toolbar Slate/Teal
          card: '#16283b',       // Official Surface Card
          gold: '#ffb606',       // Official College Gold/Amber Accent
          'gold-light': '#fad556',
          green: '#5ebb3e',      // Official Accent Green
          coral: '#f24c0a',      // Official Accent Coral Red
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
