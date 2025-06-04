// /Users/akbarshamji/Development/Beya/websiteReal/beyaWebsite/my-app/craco.config.js
module.exports = {
    style: {
      postcss: {
        plugins: [
          require('tailwindcss'),       // Pass 'tailwindcss' as a PostCSS plugin directly
          require('autoprefixer'),      // And autoprefixer
        ],
      },
    },
  };