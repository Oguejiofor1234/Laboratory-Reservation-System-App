/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Light theme matching landing page
        dark: {
          bg: '#EEF4FB',       // page background (LifeLabs-style light blue-grey)
          surface: '#ffffff',  // card / panel surface
          border: '#dde8f0',   // borders (blue-tinted)
          hover: '#e4f0f7',    // hover tint
          muted: '#c8d8e8',    // muted dividers
        },
        // Teal accent — exact landing page value
        teal: {
          DEFAULT: '#00B5BD',
          light: '#00cdd6',
          dark: '#009aa1',
        },
        // Status colors
        status: {
          confirmed: '#27ae60',
          rejected: '#e74c3c',
          pending: '#e67e22',
          cancelled: '#95a5a6',
        },
        // Text — navy / dark-grey scale
        text: {
          primary: '#333333',
          secondary: '#666666',
          muted: '#999999',
        },
        // Explicit navy for headings
        navy: '#003B5C',
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
