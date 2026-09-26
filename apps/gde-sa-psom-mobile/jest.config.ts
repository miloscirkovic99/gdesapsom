export default {
  displayName: 'gde-sa-psom-mobile',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/gde-sa-psom-mobile',
  // The Capacitor native projects hold a copy of the built app.
  modulePathIgnorePatterns: ['<rootDir>/android', '<rootDir>/ios'],
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
        // Transpile only. The app needs moduleResolution 'bundler' (Ionic's types sit
        // behind package exports), which TypeScript rejects for CommonJS output;
        // type errors are caught by `nx build` and lint instead.
        isolatedModules: true,
      },
    ],
  },
  // Transloco depends on `flat`, which ships as ESM only: let it through the
  // ignore list and have jest-preset-angular convert it to CJS with esbuild.
  // Specs mock @ionic/angular and @capacitor/* instead of loading their ESM builds.
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$|@ngneat/transloco/node_modules/flat/|flat/))'],
  globals: { ngJest: { processWithEsbuild: ['**/node_modules/flat/index.js'] } },
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
