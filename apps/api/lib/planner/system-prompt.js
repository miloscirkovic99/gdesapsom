/**
 * The planner's system prompt: the text of docs/planer-sistemski-prompt.md.
 *
 * Under Node (tests, eval) the file is read from disk. tools/build-mars-api.mjs
 * replaces this module with the file's text when it bundles the handlers, so
 * the MARS host needs no file access. An empty prompt switches the AI steps
 * off and every plan comes from the rules.
 */
const fs = require('fs');
const path = require('path');

let text = '';
try {
  text = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'docs', 'planer-sistemski-prompt.md'), 'utf8').trim();
} catch {
  text = '';
}

module.exports = text;
