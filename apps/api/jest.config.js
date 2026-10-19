/* eslint-disable */
// Tests of apps/api: the planner and winter logic in lib/, the handlers in
// handlers/ called like MARS calls them, and the bundles generated into v2/
// and events/ by tools/build-mars-api.mjs. Suites that need a database run
// against a throwaway MariaDB/MySQL database (test/support/mariadb.js) and
// skip when no server is reachable.
module.exports = {
  displayName: 'api',
  testEnvironment: 'node',
  rootDir: __dirname,
  testMatch: ['<rootDir>/test/**/*.spec.js'],
  transform: {},
};
