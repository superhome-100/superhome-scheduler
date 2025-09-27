/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'prussian-blue': '#00294C',
        'oxford-blue': '#001734',
        'prussian-blue-2': '#003257',
        'oxford-blue-2': '#001F3D',
        'oxford-blue-3': '#000F26',
        'oxford-blue-4': '#011129',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        }
      }
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        superhome: {
          "primary": "#00294C",
          "secondary": "#003257",
          "accent": "#001F3D",
          "neutral": "#001734",
          "base-100": "#000F26",
          "base-200": "#011129",
          "base-300": "#001F3D",
          "info": "#00294C",
          "success": "#00294C",
          "warning": "#003257",
          "error": "#001734",
        },
      },
    ],
  },
}
