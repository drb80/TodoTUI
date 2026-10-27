// Ink is published only as ES modules, so Jest runs in ESM mode
// (see the --experimental-vm-modules flag in package.json) and Babel only
// has to translate JSX.
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.jsx'],
  transform: {
    '\\.jsx?$': 'babel-jest',
  },
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/cli.jsx'],
};
