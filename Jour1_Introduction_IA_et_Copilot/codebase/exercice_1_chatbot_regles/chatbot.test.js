/**
 * chatbot.test.js — les tests de l'exercice 1.
 * ---------------------------------------------------------------------------
 * Un test, c'est une phrase qui dit ce que le code DOIT garantir,
 * accompagnée du code qui le vérifie. Rien de plus.
 *
 * Ces tests sont votre filet de sécurité : quand Copilot modifiera
 * chatbot.js, ce sont eux qui vous diront s'il a cassé quelque chose.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const T = racine.TestRunner || require('../../../_commun/test-runner.js');
  const C = racine.Chatbot || require('./chatbot.js');

  const { describe, test, expect } = T;

  describe('normaliser()', function () {

    test('met le texte en minuscules', function () {
      expect(C.normaliser('BONJOUR')).aPourValeur('bonjour');
    });

    test('enlève les accents', function () {
      // Sans cela, « où » ne correspondrait jamais au mot-clé « ou ».
      expect(C.normaliser('Où êtes-vous ?')).aPourValeur('ou etes vous');
    });

    test('enlève la ponctuation', function () {
      expect(C.normaliser('Horaires ???')).aPourValeur('horaires');
    });

    test('réduit les espaces multiples', function () {
      expect(C.normaliser('  bonjour    monsieur  ')).aPourValeur('bonjour monsieur');
    });

    test('supporte une entrée vide ou nulle', function () {
      expect(C.normaliser('')).aPourValeur('');
      expect(C.normaliser(null)).aPourValeur('');
    });
  });

  describe('repondre()', function () {

    test('reconnaît une salutation', function () {
      expect(C.repondre('Bonjour !').regle).aPourValeur('salutation');
    });

    test('reconnaît une question sur les horaires', function () {
      expect(C.repondre('Quels sont vos horaires ?').regle).aPourValeur('horaires');
    });

    test('reconnaît la question malgré les majuscules et les accents', function () {
      expect(C.repondre('VOUS ÊTES OUVERT LE SAMEDI ?').regle).aPourValeur('horaires');
    });

    test('reconnaît une question sur le prix', function () {
      expect(C.repondre('Combien ça coûte ?').regle).aPourValeur('tarifs');
    });

    test('renvoie la réponse par défaut quand aucune règle ne correspond', function () {
      const r = C.repondre('Quelle est la capitale de l\'Australie ?');
      expect(r.comprise).estFaux();
      expect(r.regle).aPourValeur(null);
      expect(r.reponse).aPourValeur(C.REPONSE_PAR_DEFAUT);
    });

    test('ne comprend pas un message vide', function () {
      expect(C.repondre('').comprise).estFaux();
    });

    test('dit toujours quelle règle il a utilisée', function () {
      // C'est ce qui rend un système à règles EXPLICABLE.
      // Un LLM, lui, ne saura jamais vous dire pourquoi il a répondu ça.
      const r = C.repondre('Bonjour');
      expect(typeof r.regle === 'string').estVrai();
    });
  });

  describe('l\'ordre des règles', function () {

    test('la première règle qui correspond gagne', function () {
      // « bonjour » contient la suite de lettres « ou », mais la règle
      // « adresse » ne doit PAS se déclencher : on compare des mots entiers.
      expect(C.repondre('bonjour').regle).aPourValeur('salutation');
    });

    test('un mot-clé n\'est pas cherché comme fragment', function () {
      // « pourquoi » contient « ou ». Sans la comparaison par mot entier,
      // ce message déclencherait la règle « adresse ». C'est le bug
      // le plus fréquent de ce genre de programme.
      expect(C.repondre('pourquoi donc').comprise).estFaux();
    });
  });

  describe('ajouterRegle()', function () {

    test('ajoute une règle qui fonctionne ensuite', function () {
      const avant = C.REGLES.length;
      C.ajouterRegle('paiement', ['payer', 'paiement', 'facture'],
                     'Le paiement se fait par virement, à 30 jours.');

      expect(C.REGLES.length).aPourValeur(avant + 1);
      expect(C.repondre('Je peux payer comment ?').regle).aPourValeur('paiement');
    });

    test('normalise les mots-clés fournis', function () {
      C.ajouterRegle('certif', ['CERTIFIANTE', 'Certificat'],
                     'Oui, la formation est certifiante.');
      expect(C.repondre('c\'est certifiant ?').comprise).estFaux();     // « certifiant » ≠ « certifiante »
      expect(C.repondre('vous donnez un certificat ?').regle).aPourValeur('certif');
    });
  });

  describe('tauxDeComprehension()', function () {

    test('compte les questions comprises', function () {
      const bilan = C.tauxDeComprehension(['Bonjour', 'Vos horaires ?']);
      expect(bilan.total).aPourValeur(2);
      expect(bilan.comprises).aPourValeur(2);
      expect(bilan.pourcentage).aPourValeur(100);
    });

    test('liste les questions ratées', function () {
      const bilan = C.tauxDeComprehension(['Bonjour', 'Zzzzz ?']);
      expect(bilan.ratees).aPourLongueur(1);
      expect(bilan.ratees[0]).aPourValeur('Zzzzz ?');
    });

    test('renvoie zéro, pas NaN, sur une liste vide', function () {
      expect(C.tauxDeComprehension([]).pourcentage).aPourValeur(0);
    });

    test('supporte une entrée qui n\'est pas un tableau', function () {
      expect(C.tauxDeComprehension(null).total).aPourValeur(0);
    });
  });

})(typeof globalThis !== 'undefined' ? globalThis : this);
