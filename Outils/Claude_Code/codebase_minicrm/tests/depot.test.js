/**
 * depot.test.js — les tests du stockage.
 */

(function (racine) {
  'use strict';

  const T = racine.TestRunner || require('./test-runner.js');
  const D = racine.DepotModule || require('../js/depot.js');

  const { describe, test, expect } = T;
  const Depot = D.Depot;

  /** Trois contacts de départ, recréés à chaque test pour éviter toute contagion. */
  function jeuDeDepart() {
    return [
      { nom: 'Amina Diallo', email: 'amina@exemple.be', entreprise: 'Nord Logistique',
        statut: 'client', source: 'recommandation', montant: 8400, dateContact: '2026-08-28' },
      { nom: 'Chloé Martin', email: 'chloe@exemple.fr', entreprise: 'Verte Énergie',
        statut: 'prospect', source: 'site-web', montant: 0, dateContact: '2026-09-05' },
      { nom: 'Marc Lefèvre', email: 'marc@exemple.be', entreprise: 'Bureau Central',
        statut: 'client', source: 'prospection', montant: 12750.5, dateContact: '2026-07-15' }
    ];
  }

  describe('Depot — construction', function () {

    test('normalise les contacts fournis au départ', function () {
      const d = new Depot([{ nom: '  Marie  ', email: 'A@B.CD' }]);
      expect(d.tous()[0].email).aPourValeur('a@b.cd');
    });

    test('démarre vide sans argument', function () {
      expect(new Depot().compter()).aPourValeur(0);
    });

    test('tous() renvoie une copie, pas la liste interne', function () {
      // Sans cela, un appelant pourrait vider la base sans passer par le dépôt.
      const d = new Depot(jeuDeDepart());
      d.tous().length = 0;
      expect(d.compter()).aPourValeur(3);
    });
  });

  describe('ajouter()', function () {

    test('ajoute un contact valide', function () {
      const d = new Depot([]);
      const r = d.ajouter({ nom: 'Test Untel', email: 'test@exemple.be' });
      expect(r.succes).estVrai();
      expect(d.compter()).aPourValeur(1);
    });

    test('refuse un contact invalide et n\'ajoute rien', function () {
      const d = new Depot([]);
      const r = d.ajouter({ nom: 'X', email: 'pasunemail' });
      expect(r.succes).estFaux();
      expect(d.compter()).aPourValeur(0);
    });

    test('refuse un doublon d\'adresse e-mail', function () {
      const d = new Depot(jeuDeDepart());
      const r = d.ajouter({ nom: 'Autre Personne', email: 'amina@exemple.be' });
      expect(r.succes).estFaux();
      expect(r.erreurs.email).contient('déjà');
    });

    test('détecte le doublon quelle que soit la casse', function () {
      const d = new Depot(jeuDeDepart());
      const r = d.ajouter({ nom: 'Autre Personne', email: '  AMINA@EXEMPLE.BE ' });
      expect(r.succes).estFaux();
    });
  });

  describe('modifier()', function () {

    test('met à jour les champs fournis', function () {
      const d = new Depot(jeuDeDepart());
      const id = d.tous()[1].id;

      const r = d.modifier(id, { statut: 'client', montant: 500 });
      expect(r.succes).estVrai();
      expect(d.parId(id).statut).aPourValeur('client');
    });

    test('laisse les autres champs intacts', function () {
      const d = new Depot(jeuDeDepart());
      const id = d.tous()[0].id;

      d.modifier(id, { montant: 9000 });
      expect(d.parId(id).nom).aPourValeur('Amina Diallo');
      expect(d.parId(id).entreprise).aPourValeur('Nord Logistique');
    });

    test('refuse un identifiant inconnu', function () {
      const d = new Depot(jeuDeDepart());
      expect(d.modifier('inexistant', { nom: 'X Y' }).succes).estFaux();
    });

    test('accepte de garder sa propre adresse e-mail', function () {
      // Piège classique : le contrôle de doublon se déclenche sur le contact
      // qu'on est justement en train de modifier.
      const d = new Depot(jeuDeDepart());
      const contact = d.tous()[0];
      const r = d.modifier(contact.id, { email: contact.email, montant: 9999 });
      expect(r.succes).estVrai();
    });

    test('refuse de prendre l\'adresse e-mail d\'un autre', function () {
      const d = new Depot(jeuDeDepart());
      const id = d.tous()[0].id;
      expect(d.modifier(id, { email: 'marc@exemple.be' }).succes).estFaux();
    });

    test('ne laisse pas changer l\'identifiant', function () {
      const d = new Depot(jeuDeDepart());
      const id = d.tous()[0].id;
      d.modifier(id, { id: 'pirate' });
      expect(d.parId(id)).estVrai();
      expect(d.parId('pirate')).aPourValeur(null);
    });
  });

  describe('supprimer()', function () {

    test('retire le contact demandé', function () {
      const d = new Depot(jeuDeDepart());
      const id = d.tous()[0].id;
      expect(d.supprimer(id)).estVrai();
      expect(d.compter()).aPourValeur(2);
      expect(d.parId(id)).aPourValeur(null);
    });

    test('renvoie false sur un identifiant inconnu', function () {
      const d = new Depot(jeuDeDepart());
      expect(d.supprimer('inexistant')).estFaux();
      expect(d.compter()).aPourValeur(3);
    });
  });

  describe('chercher()', function () {

    test('trouve par le nom, sans tenir compte de la casse', function () {
      const d = new Depot(jeuDeDepart());
      expect(d.chercher('AMINA')).aPourLongueur(1);
    });

    test('trouve par l\'entreprise', function () {
      const d = new Depot(jeuDeDepart());
      expect(d.chercher('bureau')).aPourLongueur(1);
    });

    test('trouve par un fragment d\'adresse e-mail', function () {
      const d = new Depot(jeuDeDepart());
      expect(d.chercher('exemple.fr')).aPourLongueur(1);
    });

    test('renvoie tout sur une recherche vide', function () {
      const d = new Depot(jeuDeDepart());
      expect(d.chercher('   ')).aPourLongueur(3);
    });

    test('renvoie une liste vide quand rien ne correspond', function () {
      const d = new Depot(jeuDeDepart());
      expect(d.chercher('zzzz')).aPourLongueur(0);
    });
  });

  describe('filtrer()', function () {

    test('filtre par statut', function () {
      const d = new Depot(jeuDeDepart());
      expect(d.filtrer({ statut: 'client' })).aPourLongueur(2);
    });

    test('combine plusieurs critères', function () {
      const d = new Depot(jeuDeDepart());
      const r = d.filtrer({ statut: 'client', source: 'prospection' });
      expect(r).aPourLongueur(1);
      expect(r[0].nom).aPourValeur('Marc Lefèvre');
    });

    test('applique le montant minimum', function () {
      const d = new Depot(jeuDeDepart());
      expect(d.filtrer({ montantMinimum: 10000 })).aPourLongueur(1);
    });

    test('renvoie tout avec des critères vides', function () {
      const d = new Depot(jeuDeDepart());
      expect(d.filtrer({})).aPourLongueur(3);
    });
  });

  describe('trier()', function () {

    test('trie les textes en tenant compte des accents', function () {
      const d = new Depot(jeuDeDepart());
      const noms = d.trier(d.tous(), 'nom', true).map(function (c) { return c.nom; });
      expect(noms[0]).aPourValeur('Amina Diallo');
    });

    test('trie les nombres, pas leur écriture', function () {
      // Une comparaison de texte mettrait « 8400 » après « 12750.5 ».
      const d = new Depot(jeuDeDepart());
      const montants = d.trier(d.tous(), 'montant', true).map(function (c) { return c.montant; });
      expect(montants[0]).aPourValeur(0);
      expect(montants[2]).aPourValeur(12750.5);
    });

    test('inverse le sens quand on le demande', function () {
      const d = new Depot(jeuDeDepart());
      const montants = d.trier(d.tous(), 'montant', false).map(function (c) { return c.montant; });
      expect(montants[0]).aPourValeur(12750.5);
    });

    test('ne modifie pas la liste passée en paramètre', function () {
      const d = new Depot(jeuDeDepart());
      const liste = d.tous();
      const premier = liste[0].nom;
      d.trier(liste, 'montant', false);
      expect(liste[0].nom).aPourValeur(premier);
    });
  });

  describe('exporterCsv()', function () {

    test('écrit une ligne d\'en-tête puis une ligne par contact', function () {
      const d = new Depot(jeuDeDepart());
      expect(d.exporterCsv().split('\n')).aPourLongueur(4);
    });

    test('protège un champ contenant une virgule', function () {
      // LE bug classique de l'export CSV : une note avec une virgule
      // décale toutes les colonnes suivantes.
      const d = new Depot([]);
      d.ajouter({ nom: 'Dupont, Marie', email: 'a@b.cd' });
      expect(d.exporterCsv()).contient('"Dupont, Marie"');
    });

    test('double les guillemets à l\'intérieur d\'un champ', function () {
      const d = new Depot([]);
      d.ajouter({ nom: 'Marie "MD" Dupont', email: 'a@b.cd' });
      expect(d.exporterCsv()).contient('""MD""');
    });
  });

})(typeof globalThis !== 'undefined' ? globalThis : this);
