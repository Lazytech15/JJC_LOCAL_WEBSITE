module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: {
    react: { version: 'detect' }
  },
  plugins: ['react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    // Relax rules temporarily for procurement theme work scope (Option B)
    'no-unused-vars': 'off',
    'react/no-unescaped-entities': 'off',
    'no-empty': 'warn',
    'no-case-declarations': 'off',
    'no-extra-semi': 'off',
    'no-useless-escape': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'no-undef': 'off'
  },
  ignorePatterns: ['dist/', 'node_modules/', 'public/models/', 'Toolbox_new/']
};
