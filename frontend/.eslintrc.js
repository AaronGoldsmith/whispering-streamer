module.exports = {
  env: {
    browser: true,
    // es2021: true,
  },
  extends: [
    'plugin:react/recommended',
    'airbnb',
  ],
  overrides: [
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'react',
    'eslint-plugin-react',
  ],
  rules: {
    'react/jsx-filename-extension': 'off',
    'comma-dangle': 'off'
  },
  ignorePatterns: ['src/**/*.test.js']
};
