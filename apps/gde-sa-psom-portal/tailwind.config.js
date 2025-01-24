import { Config } from 'tailwindcss';
const twColors = require('tailwindcss/colors');

// Custom color configuration
const customColors = {
  primary: "#2d314d",
  "primary-content": "#FFFFFF",
  secondary: "#31d35c",
  "secondary-content": "#FFFFFF",
  accent: "#2bb7da",
  "accent-content": "#FFFFFF",
  neutral: twColors.gray["200"],
  "neutral-focus": twColors.gray["300"],
  "neutral-content": twColors.gray["800"],
  base: {
    100: "#fafafa",
    200: "#F4F5F7",
    300: "#9698a6",
    content: "#FF0000",
  },
  info: "#66D6F5",
  "info-content": "#FFFFFF",
  success: "#1AD575",
  "success-content": "#FFFFFF",
  warning: "#F0C505",
  "warning-content": "#FFFFFF",
  error: "#E5667E",
  "error-content": "#FFFFFF",
  primary_green:"#44cd88",
  primary_gray:"#404040",
};

// Import DaisyUI
import daisyui from 'daisyui';

// TailwindCSS config export
export default Config = {
  content: [
    // Include paths to all of your template files
    './apps/**/*.{html,ts}', // Adjust according to your workspace structure
    './libs/**/*.{html,ts}', // Include libraries if necessary
  ],
  important: true,
  darkMode: 'class', // Enable dark mode based on class (for class-based theme toggling)
  
  // DaisyUI plugin configuration
  plugins: [daisyui],
  
  theme: {
    extend: {
      colors: { ...customColors }, // Extending Tailwind with your custom colors
    },
  },
  
  // DaisyUI specific configuration
  daisyui: {
    themes: ["light", "dark"], // Themes to enable
    darkTheme: "dark", // Specify dark theme
    base: true, // Whether to include base styles
    styled: true, // Whether to apply DaisyUI styles to components
    utils: true, // Enable utilities like spacing, colors, etc.
    prefix: "", // Optional prefix for DaisyUI classes
    logs: true, // Enable logs for DaisyUI theme switches
    themeRoot: ":root", // Define the root theme selector for the global styles
  },
};
