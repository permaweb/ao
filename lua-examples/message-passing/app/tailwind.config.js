/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "light-blue1": "#00FFF2F3",
        "light-blue2": "#6DE2FF",
        primary: "#293241",
        secondary: "#FF8500",
      },
      backgroundColor: {
        primary: "#FFF",
        secondary: "#F2F3F4",
      },
      borderColor: {
        primary: "#293241",
        secondary: "#FF8500",
      },
    },
  },
  plugins: [],
};
