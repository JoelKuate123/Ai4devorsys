/**
 * run-tests.js — lance tous les tests de la journée 1 dans un terminal.
 * ---------------------------------------------------------------------------
 * Usage :  node run-tests.js
 *
 * Node n'est PAS obligatoire pour cette formation : le fichier tests.html
 * fait exactement la même chose dans le navigateur, sans rien installer.
 * Ce fichier existe pour les participants qui ont déjà Node, et parce que
 * c'est ainsi que les tests tournent dans une chaîne d'intégration continue.
 * ---------------------------------------------------------------------------
 */

'use strict';

const T = require('../../_commun/test-runner.js');

// L'ordre compte : chaque fichier de test « enregistre » ses cas au moment
// où on le charge. Rien n'est exécuté avant l'appel à lancerLesTests().
require('./exercice_1_chatbot_regles/chatbot.test.js');
require('./exercice_2_generateur_pages/generateur-pages.test.js');

// Une fonction asynchrone auto-appelée : c'est la façon la plus simple
// d'utiliser « await » au niveau le plus haut d'un script.
(async function () {
  console.log('Tests de la journée 1 — L\'IA pour les développeurs\n');

  const bilan = await T.lancerLesTests();

  // Le code de sortie est ce que lit un serveur d'intégration continue :
  // 0 = tout va bien, autre chose = il faut arrêter le déploiement.
  process.exit(bilan.echoues === 0 ? 0 : 1);
})();
