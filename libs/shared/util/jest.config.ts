export default {
  displayName: 'shared-util',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/shared/util',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  // Transloco depends on `flat`, which ships as ESM only: let it through the
  // ignore list and have jest-preset-angular convert it to CJS with esbuild.
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|@ngneat/transloco/node_modules/flat/|flat/))'],
  globals: { ngJest: { processWithEsbuild: ['**/node_modules/flat/index.js'] } },
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
