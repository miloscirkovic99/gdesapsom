// Import the required types
import { Config } from 'tailwindcss';

const twColors = require("tailwindcss/colors");
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
  primary_gray:"#404040"
};
// Import DaisyUI
import daisyui from 'daisyui';

// Export the Tailwind configuration
export default Config={
  content: [
    // Paths to your templates
    './apps/**/*.{html,ts}', // Adapt this line according to your NX workspace structure
    './libs/**/*.{html,ts}', // Include libraries if you use them
  ],

  // DaisyUI plugin
  plugins: [daisyui],
  theme: {
    extend: {
      colors: { ...customColors }, // Correct way to extend colors
    },
  },
  // DaisyUI config
  daisyui: {
    themes: ["light", "dark",], // false: only light + dark | true: all themes | array: specific themes
    darkTheme: false,
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root",
    darkMode: "class"

  
  },
};
