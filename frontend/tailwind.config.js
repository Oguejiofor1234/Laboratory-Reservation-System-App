/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dark navy theme matching screenshots
        dark: {
          bg: '#0d1117',
          surface: '#161b22',
          border: '#30363d',
          hover: '#21262d',
          muted: '#484f58',
        },
        // Teal accent
        teal: {
          DEFAULT: '#00bfa5',
          light: '#00d4b4',
          dark: '#00a08c',
        },
        // Status colors
        status: {
          confirmed: '#3fb950',
          rejected: '#f85149',
          pending: '#d29922',
          cancelled: '#8b949e',
        },
        // Text
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          muted: '#484f58',
        },
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        widest: '0.2em',
      },
      animation: {
        'pulse-teal': 'pulse-teal 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-teal': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        'slide-up': {
          from: { transform: 'translateY(10px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        'fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
