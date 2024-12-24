// Import the required types
import { Config } from 'tailwindcss';

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
  },
};
