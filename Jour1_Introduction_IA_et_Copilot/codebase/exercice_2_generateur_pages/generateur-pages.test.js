/**
 * generateur-pages.test.js — les tests de l'exercice 2.
 * ---------------------------------------------------------------------------
 * RÈGLE D'OR : un test ne doit JAMAIS appeler un vrai modèle.
 * Ce serait lent, payant, et surtout non reproductible — un modèle ne répond
 * pas deux fois exactement la même chose.
 *
 * On teste donc ce qui nous appartient : la construction du prompt,
 * le nettoyage de la réponse, la vérification de la page. Pour tester
 * genererPage(), on remplace le client LLM par une DOUBLURE.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const T = racine.TestRunner || require('../../../_commun/test-runner.js');
  const LLM = racine.LLM || require('../../../_commun/llm-client.js');
  const G = racine.GenerateurPages || require('./generateur-pages.js');

  const { describe, test, expect } = T;

  // Une page minimale mais valide, qui sert de réponse à la doublure.
  const PAGE_EXEMPLE = [
    '<!DOCTYPE html>',
    '<html lang="fr"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Test</title><style>body{font-size:16px}</style></head>',
    '<body><h1>Bonjour</h1></body></html>'
  ].join('\n');

  describe('construirePrompt()', function () {

    test('inclut la description demandée', function () {
      const p = G.construirePrompt('un club de sport');
      expect(p).contient('un club de sport');
    });

    test('ajoute les contraintes fournies', function () {
      const p = G.construirePrompt('une boulangerie', { couleur: 'ocre', ton: 'chaleureux' });
      expect(p).contient('ocre');
      expect(p).contient('chaleureux');
    });

    test('liste les sections dans l\'ordre donné', function () {
      const p = G.construirePrompt('un cabinet', { sections: ['accueil', 'équipe', 'contact'] });
      expect(p).contient('accueil, équipe, contact');
    });

    test('rappelle toujours le format attendu à la fin', function () {
      const p = G.construirePrompt('n\'importe quoi');
      expect(p).contient('uniquement par le code HTML');
    });
  });

  describe('extraireHtml()', function () {

    test('retire les accents graves d\'un bloc de code', function () {
      const brut = 'Voici votre page :\n```html\n' + PAGE_EXEMPLE + '\n```\nBonne journée !';
      const html = G.extraireHtml(brut);
      expect(html.startsWith('<!DOCTYPE html>')).estVrai();
      expect(html).contient('</html>');
      expect(html.indexOf('Bonne journée')).aPourValeur(-1);
    });

    test('retire une phrase placée avant le DOCTYPE', function () {
      const brut = 'Bien sûr ! ' + PAGE_EXEMPLE;
      expect(G.extraireHtml(brut).startsWith('<!DOCTYPE')).estVrai();
    });

    test('renvoie une chaîne vide si la réponse ne contient pas de HTML', function () {
      // Comportement voulu : mieux vaut rien qu'un texte quelconque
      // qu'on écrirait dans un fichier .html.
      expect(G.extraireHtml('Je ne peux pas répondre à cette demande.')).aPourValeur('');
    });

    test('supporte une réponse vide ou nulle', function () {
      expect(G.extraireHtml('')).aPourValeur('');
      expect(G.extraireHtml(null)).aPourValeur('');
    });
  });

  describe('verifierPage()', function () {

    test('valide une page correcte', function () {
      const controle = G.verifierPage(PAGE_EXEMPLE);
      expect(controle.valide).estVrai();
      expect(controle.points).aPourValeur(7);
    });

    test('repère un DOCTYPE manquant', function () {
      const controle = G.verifierPage('<html lang="fr"><head><meta charset="utf-8"></head><body></body></html>');
      expect(controle.valide).estFaux();
      expect(controle.problemes.join(' ')).contient('DOCTYPE');
    });

    test('repère un appel à une ressource distante', function () {
      const page = PAGE_EXEMPLE.replace('</head>', '<link href="https://cdn.exemple.com/a.css"></head>');
      const controle = G.verifierPage(page);
      expect(controle.valide).estFaux();
      expect(controle.problemes.join(' ')).contient('distante');
    });

    test('repère une page tronquée', function () {
      const controle = G.verifierPage(PAGE_EXEMPLE.replace('</html>', ''));
      expect(controle.problemes.join(' ')).contient('tronquée');
    });
  });

  describe('genererPage() — avec une doublure de modèle', function () {

    test('renvoie succes:true et une page propre', async function () {
      // La doublure : elle ignore le prompt et renvoie toujours la même page.
      // On remplace la vraie fonction, le temps du test seulement.
      const vraieFonction = LLM.demander;
      LLM.demander = async function () { return '```html\n' + PAGE_EXEMPLE + '\n```'; };

      try {
        const resultat = await G.genererPage('un club de sport');
        expect(resultat.succes).estVrai();
        expect(resultat.html).contient('<h1>Bonjour</h1>');
        expect(resultat.controle.valide).estVrai();
      } finally {
        // On restaure TOUJOURS, même si le test échoue : sinon les tests
        // suivants travailleraient sur une fonction trafiquée.
        LLM.demander = vraieFonction;
      }
    });

    test('renvoie succes:false quand le modèle ne produit pas de HTML', async function () {
      const vraieFonction = LLM.demander;
      LLM.demander = async function () { return 'Désolé, je ne peux pas.'; };

      try {
        const resultat = await G.genererPage('peu importe');
        expect(resultat.succes).estFaux();
        expect(resultat.html).aPourValeur('');
      } finally {
        LLM.demander = vraieFonction;
      }
    });

    test('ne lance pas d\'erreur quand le réseau tombe', async function () {
      const vraieFonction = LLM.demander;
      LLM.demander = async function () { throw new Error('réseau injoignable'); };

      try {
        const resultat = await G.genererPage('peu importe');
        expect(resultat.succes).estFaux();
        expect(resultat.erreur).contient('réseau');
      } finally {
        LLM.demander = vraieFonction;
      }
    });
  });

})(typeof globalThis !== 'undefined' ? globalThis : this);
