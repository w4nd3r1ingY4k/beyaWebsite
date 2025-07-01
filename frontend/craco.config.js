// /Users/akbarshamji/Development/Beya/websiteReal/beyaWebsite/my-app/craco.config.js
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
    style: {
      postcss: {
        plugins: [
          require('tailwindcss'),       // Pass 'tailwindcss' as a PostCSS plugin directly
          require('autoprefixer'),      // And autoprefixer
        ],
      },
    },
    webpack: {
      alias: {
        '@': require('path').resolve(__dirname, 'src'),
      },
      plugins: {
        remove: ['ForkTsCheckerWebpackPlugin'], // Completely remove TypeScript checker to prevent memory issues
      },
    },
  };