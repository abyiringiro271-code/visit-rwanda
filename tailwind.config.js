/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0B1F3A', light: '#152C4D', dark: '#061428', softer: '#1E3A5F' },
        brand: {
          orange: '#FF7A00', 'orange-hover': '#E56D00', 'orange-light': '#FFA347', 'orange-soft': '#FFF2E5',
          gold: '#F5B700', 'gold-light': '#FFD24D', 'gold-soft': '#FFF8E0',
        },
        rwanda: { blue: '#00A1DE', yellow: '#FAD201', green: '#20603D', 'green-soft': '#E6F0EA', 'blue-soft': '#E5F5FC' },
        light: '#F5F7FA',
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out both',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scaleIn 0.35s ease-out both',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 12s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'gradient-x': 'gradientX 8s ease infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeInUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.94)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 122, 0, 0.55)' },
          '50%': { boxShadow: '0 0 0 12px rgba(255, 122, 0, 0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '60%': { opacity: '1', transform: 'scale(1.08)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      boxShadow: {
        soft: '0 1px 3px rgba(11, 31, 58, 0.04), 0 4px 12px rgba(11, 31, 58, 0.04)',
        card: '0 4px 20px rgba(11, 31, 58, 0.06)',
        'card-hover': '0 12px 32px rgba(11, 31, 58, 0.12)',
        'orange-glow': '0 8px 24px rgba(255, 122, 0, 0.25)',
        'mint-glow': '0 0 20px rgba(61, 214, 140, 0.35)',
      },
    },
  },
  plugins: [],
};