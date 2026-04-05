import { Config } from 'tailwindcss';

import daisyui from 'daisyui';

export default Config = {
  content: [
    './apps/**/*.{html,ts}',
    './libs/**/*.{html,ts}',
  ],
  darkMode: 'class',

  plugins: [daisyui],

  theme: {
    extend: {
      fontFamily: {
        display: ['Dosis', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },

  daisyui: {
    themes: [
      {
        light: {
          "primary": "#6366f1",
          "primary-content": "#ffffff",
          "secondary": "#10b981",
          "secondary-content": "#ffffff",
          "accent": "#06b6d4",
          "accent-content": "#ffffff",
          "neutral": "#1e293b",
          "neutral-content": "#f8fafc",
          "base-100": "#ffffff",
          "base-200": "#f8fafc",
          "base-300": "#e2e8f0",
          "base-content": "#0f172a",
          "info": "#38bdf8",
          "info-content": "#ffffff",
          "success": "#10b981",
          "success-content": "#ffffff",
          "warning": "#f59e0b",
          "warning-content": "#0f172a",
          "error": "#ef4444",
          "error-content": "#ffffff",
        },
      },
      {
        dark: {
          "primary": "#818cf8",
          "primary-content": "#ffffff",
          "secondary": "#34d399",
          "secondary-content": "#022c22",
          "accent": "#22d3ee",
          "accent-content": "#ffffff",
          "neutral": "#1e293b",
          "neutral-content": "#f1f5f9",
          "base-100": "#0c1222",
          "base-200": "#162032",
          "base-300": "#1e3048",
          "base-content": "#e2e8f0",
          "info": "#38bdf8",
          "info-content": "#ffffff",
          "success": "#34d399",
          "success-content": "#022c22",
          "warning": "#fbbf24",
          "warning-content": "#1e293b",
          "error": "#f87171",
          "error-content": "#ffffff",
        },
      },
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
};
