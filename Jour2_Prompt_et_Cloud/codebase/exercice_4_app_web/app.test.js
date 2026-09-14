/**
 * app.test.js — tests des exercices 4 (calcul de coûts + application web).
 * ---------------------------------------------------------------------------
 * Deux familles de tests :
 *   - le calcul de coûts : pur, déterministe, facile à tester ;
 *   - l'application : on remplace le modèle par une doublure.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const T = racine.TestRunner || require('../../../_commun/test-runner.js');
  const LLM = racine.LLM || require('../../../_commun/llm-client.js');
  const C = racine.CalculCouts || require('./calcul-couts.js');
  const A = racine.AppBonnesNouvelles || require('./app.js');

  const { describe, test, expect } = T;

  describe('estimerTokens()', function () {

    test('applique la règle « 4 caractères = 1 token »', function () {
      expect(C.estimerTokens('abcd')).aPourValeur(1);
      expect(C.estimerTokens('abcdefgh')).aPourValeur(2);
    });

    test('arrondit vers le haut', function () {
      // 5 caractères = 1,25 token, donc 2 : on ne sous-estime jamais un budget.
      expect(C.estimerTokens('abcde')).aPourValeur(2);
    });

    test('supporte une entrée vide ou nulle', function () {
      expect(C.estimerTokens('')).aPourValeur(0);
      expect(C.estimerTokens(null)).aPourValeur(0);
    });
  });

  describe('coutDunAppel()', function () {

    test('applique la formule tokens ÷ million × prix', function () {
      // gpt-5.6-luna : 0,20 $/M en entrée, 1,20 $/M en sortie.
      // 1 000 000 tokens en entrée = 0,20 $ exactement.
      expect(C.coutDunAppel('gpt-5.6-luna', 1000000, 0)).aPourValeur(0.2);
    });

    test('additionne bien entrée et sortie', function () {
      const c = C.coutDunAppel('gpt-5.6-luna', 1000000, 1000000);
      expect(c).estProcheDe(1.4, 0.000001);
    });

    test('renvoie zéro pour un modèle local', function () {
      expect(C.coutDunAppel('local', 5000000, 5000000)).aPourValeur(0);
    });

    test('refuse un modèle inconnu avec un message clair', function () {
      expect(function () { C.coutDunAppel('gpt-42', 100, 100); })
        .lanceUneErreur('Modèle inconnu');
    });

    test('refuse un nombre de tokens négatif', function () {
      expect(function () { C.coutDunAppel('local', -1, 0); }).lanceUneErreur('négatif');
    });
  });

  describe('budgetMensuel()', function () {

    test('reproduit le scénario du support', function () {
      // 200 appels/jour, 600 tokens en entrée, 80 en sortie, gpt-5.6-luna.
      const b = C.budgetMensuel({
        modele: 'gpt-5.6-luna', appelsParJour: 200, tokensEntree: 600, tokensSortie: 80
      });
      // Attendu : environ 1,30 $ par mois. On teste l'ordre de grandeur,
      // pas la sixième décimale : c'est ce qui compte pour une décision.
      expect(b.coutParMois).estProcheDe(1.30, 0.1);
    });

    test('respecte le nombre de jours demandé', function () {
      // On prend un volume assez grand pour que l'arrondi à deux décimales
      // ne fausse pas la comparaison : c'est un piège classique en test.
      const base = { modele: 'gpt-5.6-terra', appelsParJour: 5000, tokensEntree: 1000, tokensSortie: 100 };
      const unJour = C.budgetMensuel(Object.assign({}, base, { jours: 1 }));
      const dixJours = C.budgetMensuel(Object.assign({}, base, { jours: 10 }));
      expect(dixJours.coutParMois).estProcheDe(unJour.coutParMois * 10, 0.05);
    });
  });

  describe('comparerTousLesModeles()', function () {

    test('trie du moins cher au plus cher', function () {
      const liste = C.comparerTousLesModeles({ appelsParJour: 200, tokensEntree: 600, tokensSortie: 80 });
      expect(liste[0].modele).aPourValeur('local');
      // Le plus cher doit être le modèle de raisonnement.
      expect(liste[liste.length - 1].modele).aPourValeur('gpt-6-astra');
    });

    test('couvre tous les modèles du tarif', function () {
      const liste = C.comparerTousLesModeles({ appelsParJour: 1, tokensEntree: 100, tokensSortie: 10 });
      expect(liste).aPourLongueur(Object.keys(C.TARIFS).length);
    });

    test('montre un écart d\'au moins un facteur 40 entre les extrêmes payants', function () {
      // C'est LE chiffre à retenir de la journée 2.
      const liste = C.comparerTousLesModeles({ appelsParJour: 200, tokensEntree: 600, tokensSortie: 80 })
        .filter(function (r) { return r.coutParMois > 0; });
      const rapport = liste[liste.length - 1].coutParMois / liste[0].coutParMois;
      expect(rapport).estPlusGrandQue(40);
    });
  });

  describe('economieEnPourcentage()', function () {

    test('calcule une économie simple', function () {
      expect(C.economieEnPourcentage(100, 25)).aPourValeur(75);
    });

    test('renvoie zéro si le coût actuel est nul', function () {
      expect(C.economieEnPourcentage(0, 0)).aPourValeur(0);
    });
  });

  describe('classerUnTitre() — avec une doublure', function () {

    test('renvoie la catégorie annoncée par le modèle', async function () {
      const vraie = LLM.demanderJson;
      LLM.demanderJson = async function () { return { categorie: 'positif', confiance: 0.9 }; };

      try {
        const r = await A.classerUnTitre('Une commune inaugure sa cantine locale');
        expect(r.categorie).aPourValeur('positif');
        expect(r.confiance).aPourValeur(0.9);
      } finally {
        LLM.demanderJson = vraie;
      }
    });

    test('ramène une catégorie inventée à « neutre »', async function () {
      const vraie = LLM.demanderJson;
      // Le modèle invente une quatrième catégorie : notre code doit la refuser.
      LLM.demanderJson = async function () { return { categorie: 'enthousiaste', confiance: 0.95 }; };

      try {
        const r = await A.classerUnTitre('Un titre quelconque de test');
        expect(r.categorie).aPourValeur('neutre');
      } finally {
        LLM.demanderJson = vraie;
      }
    });

    test('applique le seuil de confiance côté code, pas côté modèle', async function () {
      const vraie = LLM.demanderJson;
      LLM.demanderJson = async function () { return { categorie: 'positif', confiance: 0.3 }; };

      try {
        const r = await A.classerUnTitre('Un titre quelconque de test');
        expect(r.categorie).aPourValeur('neutre');
      } finally {
        LLM.demanderJson = vraie;
      }
    });

    test('refuse un titre trop court sans appeler le modèle', async function () {
      let appele = false;
      const vraie = LLM.demanderJson;
      LLM.demanderJson = async function () { appele = true; return {}; };

      try {
        const r = await A.classerUnTitre('bof');
        expect(appele).estFaux();          // aucun appel : donc aucun coût
        expect(r.erreur).contient('trop court');
      } finally {
        LLM.demanderJson = vraie;
      }
    });

    test('ne plante pas quand le modèle échoue', async function () {
      const vraie = LLM.demanderJson;
      LLM.demanderJson = async function () { throw new Error('quota dépassé'); };

      try {
        const r = await A.classerUnTitre('Un titre parfaitement valide ici');
        expect(r.categorie).aPourValeur('neutre');
        expect(r.erreur).contient('quota');
      } finally {
        LLM.demanderJson = vraie;
      }
    });
  });

  describe('filtrerPositifs()', function () {

    test('ne garde que les positifs au-dessus du seuil', function () {
      const entree = [
        { titre: 'a', categorie: 'positif', confiance: 0.9 },
        { titre: 'b', categorie: 'positif', confiance: 0.4 },
        { titre: 'c', categorie: 'negatif', confiance: 0.99 }
      ];
      const sortie = A.filtrerPositifs(entree);
      expect(sortie).aPourLongueur(1);
      expect(sortie[0].titre).aPourValeur('a');
    });

    test('classe les plus sûrs en premier', function () {
      const entree = [
        { titre: 'moyen', categorie: 'positif', confiance: 0.7 },
        { titre: 'sûr', categorie: 'positif', confiance: 0.95 }
      ];
      expect(A.filtrerPositifs(entree)[0].titre).aPourValeur('sûr');
    });
  });

  describe('statistiques()', function () {

    test('compte les catégories et les erreurs', function () {
      const s = A.statistiques([
        { titre: 'a', categorie: 'positif', confiance: 0.9 },
        { titre: 'b', categorie: 'neutre', confiance: 0.5 },
        { titre: 'c', categorie: 'neutre', confiance: 0, erreur: 'panne' }
      ]);
      expect(s.total).aPourValeur(3);
      expect(s.parCategorie.positif).aPourValeur(1);
      expect(s.parCategorie.neutre).aPourValeur(2);
      expect(s.erreurs).aPourValeur(1);
    });

    test('compte le message système dans les tokens envoyés', function () {
      // Piège classique : on oublie le prompt système dans son budget,
      // alors que c'est lui qui pèse le plus lourd sur une tâche courte.
      const s = A.statistiques([{ titre: 'court', categorie: 'neutre', confiance: 0.5 }]);
      expect(s.tokensEntree).estPlusGrandQue(100);
    });

    test('renvoie un coût nul avec un modèle local', function () {
      const s = A.statistiques([{ titre: 'a', categorie: 'positif', confiance: 0.9 }], 'local');
      expect(s.coutDollars).aPourValeur(0);
    });
  });

})(typeof globalThis !== 'undefined' ? globalThis : this);
