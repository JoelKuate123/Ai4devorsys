/**
 * statistiques.test.js — les tests des calculs du tableau de bord.
 * ---------------------------------------------------------------------------
 * Un chiffre faux sur un tableau de bord est plus dangereux qu'une page qui
 * plante : personne ne s'en aperçoit. Ces tests sont donc les plus importants
 * du projet, même s'ils portent sur le fichier le plus court.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const T = racine.TestRunner || require('./test-runner.js');
  const S = racine.Statistiques || require('../js/statistiques.js');
  const M = racine.Modele || require('../js/modele.js');

  const { describe, test, expect } = T;

  /** Un jeu de données qui couvre tous les cas intéressants. */
  function contacts() {
    return [
      { statut: 'client', source: 'site-web', montant: 1000, dateContact: '2026-05-10' },
      { statut: 'client', source: 'site-web', montant: 3000, dateContact: '2026-05-22' },
      { statut: 'client', source: 'salon', montant: 2000, dateContact: '2026-06-04' },
      { statut: 'prospect', source: 'site-web', montant: 5000, dateContact: '2026-06-18' },
      { statut: 'prospect', source: 'salon', montant: 0, dateContact: '2026-01-09' },
      { statut: 'inactif', source: 'prospection', montant: 0, dateContact: '2025-11-30' }
    ].map(M.normaliserContact);
  }

  describe('resume()', function () {

    test('compte tous les contacts', function () {
      expect(S.resume(contacts()).total).aPourValeur(6);
    });

    test('répartit correctement par statut', function () {
      const r = S.resume(contacts());
      expect(r.parStatut.client).aPourValeur(3);
      expect(r.parStatut.prospect).aPourValeur(2);
      expect(r.parStatut.inactif).aPourValeur(1);
    });

    test('affiche zéro pour un statut absent de la base', function () {
      // Sans cela, le statut manquerait complètement du tableau de bord
      // et l'utilisateur croirait à un bug.
      const r = S.resume([M.normaliserContact({ statut: 'client', montant: 100 })]);
      expect(r.parStatut.inactif).aPourValeur(0);
    });

    test('ne compte que les clients dans le chiffre d\'affaires', function () {
      // Le prospect à 5000 € est une ESTIMATION, pas un revenu.
      // C'est la règle métier la plus facile à casser par mégarde.
      expect(S.resume(contacts()).chiffreAffaires).aPourValeur(6000);
    });

    test('calcule le panier moyen sur les clients seulement', function () {
      expect(S.resume(contacts()).panierMoyen).aPourValeur(2000);
    });

    test('calcule le taux de conversion en pourcentage', function () {
      // 3 clients sur 6 contacts = 50 %.
      expect(S.resume(contacts()).tauxConversion).aPourValeur(50);
    });

    test('renvoie zéro, pas NaN, sur une base vide', function () {
      // « NaN € » affiché sur un tableau de bord, c'est une réunion perdue.
      const r = S.resume([]);
      expect(r.chiffreAffaires).aPourValeur(0);
      expect(r.panierMoyen).aPourValeur(0);
      expect(r.tauxConversion).aPourValeur(0);
    });

    test('supporte une entrée qui n\'est pas un tableau', function () {
      expect(S.resume(null).total).aPourValeur(0);
      expect(S.resume(undefined).total).aPourValeur(0);
    });
  });

  describe('parSource()', function () {

    test('ne liste que les sources réellement présentes', function () {
      const lignes = S.parSource(contacts());
      const sources = lignes.map(function (l) { return l.source; });
      expect(sources.indexOf('recommandation')).aPourValeur(-1);
    });

    test('classe du plus rentable au moins rentable', function () {
      expect(S.parSource(contacts())[0].source).aPourValeur('site-web');
    });

    test('calcule le taux de conversion par source', function () {
      const siteWeb = S.parSource(contacts()).find(function (l) { return l.source === 'site-web'; });
      // 2 clients sur 3 contacts venus du site = 66,7 %.
      expect(siteWeb.tauxConversion).estProcheDe(66.7, 0.1);
    });

    test('gère une base vide', function () {
      expect(S.parSource([])).aPourLongueur(0);
    });
  });

  describe('parMois()', function () {

    test('regroupe par mois', function () {
      const lignes = S.parMois(contacts());
      const mai = lignes.find(function (l) { return l.mois === '2026-05'; });
      expect(mai.contacts).aPourValeur(2);
      expect(mai.chiffreAffaires).aPourValeur(4000);
    });

    test('classe par ordre chronologique', function () {
      const lignes = S.parMois(contacts());
      expect(lignes[0].mois).aPourValeur('2025-11');
    });

    test('ignore les contacts sans date exploitable', function () {
      const liste = [
        { statut: 'client', montant: 100, dateContact: '2026-05-01' },
        { statut: 'client', montant: 100, dateContact: 'jamais' }
      ];
      // normaliserContact() remplace une date invalide par celle du jour ;
      // ici on court-circuite volontairement pour tester le cas brut.
      expect(S.parMois(liste)).aPourLongueur(1);
    });
  });

  describe('meilleursClients()', function () {

    test('classe par montant décroissant', function () {
      const top = S.meilleursClients(contacts());
      expect(top[0].montant).aPourValeur(3000);
    });

    test('exclut les prospects, même à montant élevé', function () {
      // Le prospect à 5000 € ne doit PAS apparaître dans le classement clients.
      const top = S.meilleursClients(contacts());
      expect(top.every(function (c) { return c.statut === 'client'; })).estVrai();
    });

    test('respecte le nombre demandé', function () {
      expect(S.meilleursClients(contacts(), 2)).aPourLongueur(2);
    });
  });

  describe('contactsDormants()', function () {

    test('trouve ceux qu\'on n\'a pas contactés depuis le délai', function () {
      // On passe une date de référence : sans elle, le test donnerait
      // un résultat différent demain.
      const dormants = S.contactsDormants(contacts(), 90, '2026-09-10');
      expect(dormants.length >= 1).estVrai();
    });

    test('exclut les contacts déjà classés inactifs', function () {
      // On ne relance pas quelqu'un qui a dit non : c'est une règle métier,
      // pas une optimisation.
      const dormants = S.contactsDormants(contacts(), 30, '2026-09-10');
      expect(dormants.every(function (c) { return c.statut !== 'inactif'; })).estVrai();
    });

    test('classe du plus ancien au plus récent', function () {
      const dormants = S.contactsDormants(contacts(), 30, '2026-09-10');
      if (dormants.length >= 2) {
        expect(dormants[0].dateContact <= dormants[1].dateContact).estVrai();
      }
    });

    test('renvoie une liste vide quand tout est à jour', function () {
      expect(S.contactsDormants(contacts(), 3650, '2026-09-10')).aPourLongueur(0);
    });
  });

})(typeof globalThis !== 'undefined' ? globalThis : this);
