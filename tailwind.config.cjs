/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/renderer/index.html", "./src/renderer/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  important: true, // to overwrite MUI style should be true,
};
