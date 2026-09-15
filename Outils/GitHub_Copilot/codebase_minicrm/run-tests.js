/**
 * run-tests.js — lance toute la suite de tests de MiniCRM dans un terminal.
 * Usage :  node run-tests.js
 * (ou ouvrez tests.html dans un navigateur, sans rien installer)
 */

'use strict';

const T = require('./tests/test-runner.js');

// L'ordre compte : chaque fichier enregistre ses cas au chargement.
require('./tests/modele.test.js');
require('./tests/depot.test.js');
require('./tests/statistiques.test.js');

(async function () {
  console.log('MiniCRM — suite de tests\n');
  const bilan = await T.lancerLesTests();
  // Code de sortie 0 = tout va bien. C'est ce que lit une chaîne d'intégration.
  process.exit(bilan.echoues === 0 ? 0 : 1);
})();
