/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      /* Map DaisyUI CSS variables to Tailwind colors with alpha support */
      colors: {
        primary: 'hsl(var(--p))',
        'primary-content': 'hsl(var(--pc))',
        secondary: 'hsl(var(--s))',
        'secondary-content': 'hsl(var(--sc))',
        accent: 'hsl(var(--a))',
        'accent-content': 'hsl(var(--ac))',
        info: 'hsl(var(--in))',
        success: 'hsl(var(--su))',
        warning: 'hsl(var(--wa))',
        error: 'hsl(var(--er))',
        'base-content': 'hsl(var(--bc))',
        base: {
          100: 'hsl(var(--b1))',
          200: 'hsl(var(--b2))',
          300: 'hsl(var(--b3))',
        },
        /* Keep your existing brand/static colors if you still use them */
        'prussian-blue': '#00294C',
        'oxford-blue': '#001734',
        'prussian-blue-2': '#003257',
        'oxford-blue-2': '#001F3D',
        'oxford-blue-3': '#000F26',
        'oxford-blue-4': '#011129',
        'sidebar-bg': '#ffffff',
        'sidebar-border': '#e2e8f0',
        'sidebar-text': '#1e293b',
        'sidebar-text-secondary': '#64748b',
        'sidebar-hover': '#f1f5f9',
        'sidebar-active': '#dbeafe',
        'sidebar-active-text': '#1d4ed8',
        'sidebar-overlay': 'rgba(0, 0, 0, 0.5)',
        'nav-text': '#64748b',
        'nav-hover': '#f1f5f9',
        'nav-active-bg': '#dbeafe',
        'nav-active-text': '#1d4ed8',
        'text-black': '#000000',
        'text-black-soft': '#1a1a1a',
        'text-grey': '#6b7280',
        'text-grey-light': '#9ca3af',
        'text-grey-dark': '#374151',
        'text-grey-soft': '#6b7280',
      },
      fontSize: {
        'xs-custom': '10px',
        'sm-custom': '12px',
        'base-custom': '14px',
        'lg-custom': '16px',
        'xl-custom': '18px',
      },
      spacing: {
        '18': '4.5rem', // 72px
        '72': '18rem',  // 288px
        '70': '17.5rem', // 280px
        'sidebar-width': '18rem', // 288px
        'mobile-sidebar-width': '17.5rem', // 280px
        // Custom spacing for sidebar components
        'sidebar-padding': '20px',
        'sidebar-padding-y': '16px',
        'sidebar-gap': '12px',
      },
      zIndex: {
        '30': '30',
        '1000': '1000',
        '100': '100',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-in',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
  daisyui: {
    themes: [
      "nord",
      {
        superhome: {
          "primary": "#00294C",
          "secondary": "#003257", 
          "accent": "#001F3D",
          "neutral": "#f5f5f5",
          "base-100": "#ffffff",
          "base-200": "#f8f9fa",
          "base-300": "#e9ecef",
          "base-content": "#000000",
          "info": "#00294C",
          "success": "#28a745",
          "warning": "#ffc107",
          "error": "#dc3545",
        },
      },
    ],
    darkTheme: "nord",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
  },
}