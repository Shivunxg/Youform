export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          400: '#a78bfa',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          900: '#2e1065',
        },
        ink: '#111111',
        paper: '#f9fafb',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neu: '4px 4px 0 #111111',
        'neu-sm': '3px 3px 0 #111111',
        'neu-lg': '6px 6px 0 #111111',
        'neu-orange': '4px 4px 0 #7c3aed',
      },
    },
  },
  plugins: [],
};
