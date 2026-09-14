/**
 * run-tests.js — lance tous les tests de la journée 2.
 * Usage : node run-tests.js   (ou ouvrez tests.html, sans rien installer)
 */

'use strict';

const T = require('../../_commun/test-runner.js');

require('./exercice_3_specification/specification.test.js');
require('./exercice_4_app_web/app.test.js');

(async function () {
  console.log('Tests de la journée 2 — Prompt et cloud\n');
  const bilan = await T.lancerLesTests();
  process.exit(bilan.echoues === 0 ? 0 : 1);
})();
