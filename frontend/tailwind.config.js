export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#fff7ed',100:'#ffedd5',200:'#fed7aa',400:'#fb923c',500:'#f97316',600:'#ea580c',700:'#c2410c',900:'#7c2d12' },
        ink: '#111111',
        paper: '#FFFBF2',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neu: '4px 4px 0 #111111',
        'neu-sm': '3px 3px 0 #111111',
        'neu-lg': '6px 6px 0 #111111',
        'neu-orange': '4px 4px 0 #f97316',
      },
    },
  },
  plugins: [],
};
