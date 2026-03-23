/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        oxford: {
          DEFAULT: '#0F172A', // Primary Navy
          light: '#1B365D',   // Dark Navy for badge text
          steel: '#1E293B',   // Steel Navy for status bar, divider
        },
        action: {
          DEFAULT: '#F37021', // Action Orange
          hover: '#D9621C',   // Hover Orange
        },
        status: {
          green: '#22C55E',    // Status Green
        },
        slate: {
          50: '#F8FAFC',      // Lightest Slate (button hover, card bg)
          100: '#F1F5F9',     // Very Light Slate (badge bg)
          200: '#E2E8F0',     // Card border
          400: '#94A3B8',     // Link Grey (nav default, footer links)
          500: '#64748B',     // Body Text (secondary)
          600: '#475569',     // Copyright text
        },
        black: {
          DEFAULT: '#020617',  // Near-black for footer
        },
        white: '#FFFFFF',
      },
      borderRadius: {
        'xl': '24px',
        '3xl': '32px',
      },
    },
  },
  plugins: [],
}

