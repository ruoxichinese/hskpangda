/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-mode="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: v('primary'),
        secondary: v('secondary'),
        bg: v('bg'),
        surface: v('surface'),
        ink: v('text'),
        muted: v('muted'),
        line: v('line'),
        accent: v('accent'),
        onprimary: v('onprimary'),
        good: v('good'),
        bad: v('bad'),
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        han: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      borderRadius: { card: '18px' },
    },
  },
  plugins: [],
};
