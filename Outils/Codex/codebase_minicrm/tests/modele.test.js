/**
 * modele.test.js — les tests des règles métier.
 * ---------------------------------------------------------------------------
 * Ces tests sont le contrat de MiniCRM. Quand vous demanderez à un assistant
 * IA de modifier modele.js, ce sont eux qui diront s'il a compris le métier
 * ou s'il a simplement produit du code plausible.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const T = racine.TestRunner || require('./test-runner.js');
  const M = racine.Modele || require('../js/modele.js');

  const { describe, test, expect } = T;

  describe('emailValide()', function () {

    test('accepte une adresse ordinaire', function () {
      expect(M.emailValide('marie.dupont@exemple.be')).estVrai();
    });

    test('accepte un sous-domaine', function () {
      expect(M.emailValide('contact@service.exemple.co.uk')).estVrai();
    });

    test('accepte un tiret et un plus dans la partie locale', function () {
      expect(M.emailValide('marie-claire+devis@exemple.fr')).estVrai();
    });

    test('refuse une adresse sans arobase', function () {
      expect(M.emailValide('marie.exemple.be')).estFaux();
    });

    test('refuse deux arobases', function () {
      expect(M.emailValide('marie@@exemple.be')).estFaux();
    });

    test('refuse une adresse sans point après l\'arobase', function () {
      expect(M.emailValide('marie@exemple')).estFaux();
    });

    test('refuse une adresse contenant un espace', function () {
      expect(M.emailValide('marie dupont@exemple.be')).estFaux();
    });

    test('refuse une valeur qui n\'est pas une chaîne', function () {
      expect(M.emailValide(null)).estFaux();
      expect(M.emailValide(42)).estFaux();
      expect(M.emailValide(undefined)).estFaux();
    });
  });

  describe('normaliserContact()', function () {

    test('met l\'adresse e-mail en minuscules', function () {
      const c = M.normaliserContact({ nom: 'Marie', email: '  Marie.DUPONT@Exemple.BE ' });
      expect(c.email).aPourValeur('marie.dupont@exemple.be');
    });

    test('ne touche pas à la casse du nom', function () {
      // « van der Berg » et « McDonald » ne se mettent pas en Majuscule.
      const c = M.normaliserContact({ nom: 'Pieter van der Berg' });
      expect(c.nom).aPourValeur('Pieter van der Berg');
    });

    test('réduit les espaces multiples dans le nom', function () {
      const c = M.normaliserContact({ nom: '  Marie    Dupont  ' });
      expect(c.nom).aPourValeur('Marie Dupont');
    });

    test('donne le statut « prospect » par défaut', function () {
      expect(M.normaliserContact({}).statut).aPourValeur('prospect');
    });

    test('remplace un statut inconnu par « prospect »', function () {
      expect(M.normaliserContact({ statut: 'super-client' }).statut).aPourValeur('prospect');
    });

    test('remplace une source inconnue par « inconnue »', function () {
      expect(M.normaliserContact({ source: 'tiktok' }).source).aPourValeur('inconnue');
    });

    test('convertit un montant écrit en texte', function () {
      expect(M.normaliserContact({ montant: '1250.5' }).montant).aPourValeur(1250.5);
    });

    test('ramène un montant illisible à zéro', function () {
      expect(M.normaliserContact({ montant: 'beaucoup' }).montant).aPourValeur(0);
    });

    test('génère un identifiant quand il en manque un', function () {
      const c = M.normaliserContact({ nom: 'Test' });
      expect(typeof c.id === 'string' && c.id.length > 3).estVrai();
    });

    test('conserve l\'identifiant fourni', function () {
      expect(M.normaliserContact({ id: 'abc123' }).id).aPourValeur('abc123');
    });

    test('ne modifie pas l\'objet d\'origine', function () {
      const brut = { nom: '  Marie  ', email: 'A@B.CD' };
      M.normaliserContact(brut);
      expect(brut.nom).aPourValeur('  Marie  ');
    });

    test('supporte une entrée nulle', function () {
      const c = M.normaliserContact(null);
      expect(c.nom).aPourValeur('');
      expect(c.statut).aPourValeur('prospect');
    });
  });

  describe('validerContact()', function () {

    /** Un contact correct, dont chaque test dégrade un seul champ. */
    function contactValide() {
      return M.normaliserContact({
        nom: 'Marie Dupont', email: 'marie@exemple.be',
        statut: 'client', montant: 1200, dateContact: '2026-05-12'
      });
    }

    test('accepte un contact correct', function () {
      const r = M.validerContact(contactValide());
      expect(r.valide).estVrai();
      expect(Object.keys(r.erreurs)).aPourLongueur(0);
    });

    test('refuse un nom d\'une seule lettre', function () {
      const c = contactValide(); c.nom = 'M';
      expect(M.validerContact(c).erreurs.nom).contient('deux caractères');
    });

    test('refuse un nom de plus de 80 caractères', function () {
      const c = contactValide(); c.nom = 'a'.repeat(81);
      expect(M.validerContact(c).valide).estFaux();
    });

    test('refuse une adresse e-mail absente', function () {
      const c = contactValide(); c.email = '';
      expect(M.validerContact(c).erreurs.email).contient('obligatoire');
    });

    test('refuse un montant négatif', function () {
      const c = contactValide(); c.montant = -50;
      expect(M.validerContact(c).erreurs.montant).contient('négatif');
    });

    test('refuse un client sans montant', function () {
      // Règle métier : elle vient du métier, pas du code. Un assistant IA
      // ne l'inventera jamais tout seul — c'est à vous de la lui donner.
      const c = contactValide(); c.montant = 0;
      expect(M.validerContact(c).erreurs.montant).contient('client');
    });

    test('accepte un prospect sans montant', function () {
      const c = contactValide(); c.statut = 'prospect'; c.montant = 0;
      expect(M.validerContact(c).valide).estVrai();
    });

    test('signale toutes les erreurs d\'un coup', function () {
      // L'utilisateur doit pouvoir tout corriger en une fois,
      // pas découvrir les problèmes un par un.
      const r = M.validerContact({ nom: '', email: 'nawak', statut: 'x', montant: -1 });
      expect(Object.keys(r.erreurs).length >= 4).estVrai();
    });
  });

  describe('dateValide()', function () {

    test('accepte une date réelle', function () {
      expect(M.dateValide('2026-05-12')).estVrai();
    });

    test('refuse le 31 février', function () {
      // Le piège classique : l'expression régulière passe, la date n'existe pas.
      expect(M.dateValide('2026-02-31')).estFaux();
    });

    test('accepte le 29 février d\'une année bissextile', function () {
      expect(M.dateValide('2028-02-29')).estVrai();
    });

    test('refuse le 29 février d\'une année ordinaire', function () {
      expect(M.dateValide('2026-02-29')).estFaux();
    });

    test('refuse un format à l\'européenne', function () {
      expect(M.dateValide('12/05/2026')).estFaux();
    });
  });

  describe('arrondiCentimes()', function () {

    test('corrige les surprises de la virgule flottante', function () {
      // 0.1 + 0.2 vaut 0.30000000000000004 en JavaScript, comme partout ailleurs.
      expect(M.arrondiCentimes(0.1 + 0.2)).aPourValeur(0.3);
    });

    test('arrondit au centime supérieur', function () {
      expect(M.arrondiCentimes(19.999)).aPourValeur(20);
    });
  });

  describe('formaterDate()', function () {

    test('passe au format français', function () {
      expect(M.formaterDate('2026-05-12')).aPourValeur('12/05/2026');
    });

    test('affiche un tiret pour une date absente', function () {
      expect(M.formaterDate('')).aPourValeur('—');
      expect(M.formaterDate('n\'importe quoi')).aPourValeur('—');
    });
  });

})(typeof globalThis !== 'undefined' ? globalThis : this);
