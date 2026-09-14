/**
 * app.js — Exercice 4 · L'application web « Bonnes nouvelles ».
 * ---------------------------------------------------------------------------
 * Le TP du programme : « développer et déployer une application web
 * uniquement à l'aide d'un assistant IA de développement ».
 *
 * L'application classe des titres d'actualité en trois catégories
 * (positif / neutre / négatif) et n'affiche que les positifs.
 *
 * Trois choses à observer dans ce fichier :
 *   1. la logique est séparée de l'affichage (index.html) : elle est testable ;
 *   2. rien n'est stocké côté serveur : pas de donnée personnelle, pas de RGPD ;
 *   3. le coût de chaque appel est calculé et affiché : on sait ce qu'on dépense.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const LLM = racine.LLM || require('../../../_commun/llm-client.js');
  const Couts = racine.CalculCouts || require('./calcul-couts.js');

  /** Les trois catégories autorisées. Une liste fermée : le modèle ne peut pas inventer. */
  const CATEGORIES = ['positif', 'neutre', 'negatif'];

  /**
   * MESSAGE_SYSTEME — court, précis, avec des exemples.
   *
   * Pourquoi si court ? Parce que classer un titre est une TÂCHE FERMÉE.
   * Quatre bons exemples suffisent, et un petit modèle la réussit aussi bien
   * qu'un grand pour cinquante fois moins cher. C'est le message principal
   * de la journée 2.
   */
  const MESSAGE_SYSTEME = [
    'Tu classes des titres de presse en trois catégories : positif, neutre, negatif.',
    '',
    'Exemples —',
    'Titre : "Une commune inaugure sa première cantine 100 % locale" → positif',
    'Titre : "Le conseil municipal se réunit jeudi" → neutre',
    'Titre : "Trois blessés dans un accident sur la N4" → negatif',
    'Titre : "Un traitement contre la drépanocytose validé en Europe" → positif',
    '',
    'Un titre est positif s\'il annonce une amélioration concrète et vérifiable.',
    'Un titre d\'annonce, d\'agenda ou de procédure est neutre.',
    '',
    'Réponds UNIQUEMENT par un objet JSON : {"categorie": "...", "confiance": 0.0}',
    'La confiance va de 0 à 1. Sous 0.6, mets "neutre".'
  ].join('\n');

  /**
   * classerUnTitre() — classe un titre unique.
   *
   * @param {string} titre
   * @returns {Promise<{titre:string, categorie:string, confiance:number, erreur?:string}>}
   */
  async function classerUnTitre(titre) {
    // Garde-fou d'entrée : on ne paie pas un appel pour une chaîne vide.
    const propre = String(titre || '').trim();
    if (propre.length < 5) {
      return { titre: propre, categorie: 'neutre', confiance: 0, erreur: 'Titre trop court.' };
    }

    try {
      const reponse = await LLM.demanderJson('Titre : "' + propre + '"', {
        systeme: MESSAGE_SYSTEME,
        temperature: 0            // classification : on veut la stabilité
      });

      // On ne fait JAMAIS confiance à la réponse : le modèle peut inventer
      // une quatrième catégorie, ou renvoyer « Positif » avec une majuscule.
      const brute = String(reponse.categorie || '').toLowerCase().trim();
      const categorie = CATEGORIES.indexOf(brute) !== -1 ? brute : 'neutre';

      // Number() convertit ; le || 0 rattrape un NaN. Math.min/max borne.
      const confiance = Math.max(0, Math.min(1, Number(reponse.confiance) || 0));

      return {
        titre: propre,
        // La règle métier est appliquée par NOTRE code, pas par le modèle :
        // c'est nous qui décidons du seuil, et il est testable.
        categorie: confiance < 0.6 ? 'neutre' : categorie,
        confiance: confiance
      };

    } catch (erreur) {
      // Un titre non classé ne doit pas faire tomber toute la page.
      return { titre: propre, categorie: 'neutre', confiance: 0, erreur: erreur.message };
    }
  }

  /**
   * classerPlusieursTitres() — traite une liste, en série contrôlée.
   *
   * Pourquoi pas tout en parallèle ? Parce qu'envoyer 200 requêtes d'un coup
   * déclenche une limite de débit chez tous les fournisseurs. On travaille
   * donc par PAQUETS : rapide, mais poli.
   *
   * @param {string[]} titres
   * @param {number} [taillePaquet=5]
   * @param {Function} [surProgres]  Appelée après chaque paquet.
   * @returns {Promise<Array>}
   */
  async function classerPlusieursTitres(titres, taillePaquet, surProgres) {
    const taille = taillePaquet || 5;
    const resultats = [];

    for (let i = 0; i < titres.length; i += taille) {
      const paquet = titres.slice(i, i + taille);
      const lot = await Promise.all(paquet.map(classerUnTitre));
      resultats.push(...lot);

      if (surProgres) surProgres(resultats.length, titres.length);
    }

    return resultats;
  }

  /**
   * filtrerPositifs() — la règle métier de l'application.
   * @param {Array} resultats
   * @param {number} [seuil=0.6]
   * @returns {Array}
   */
  function filtrerPositifs(resultats, seuil) {
    const minimum = seuil === undefined ? 0.6 : seuil;
    return resultats
      .filter(function (r) { return r.categorie === 'positif' && r.confiance >= minimum; })
      // Les plus sûres d'abord : c'est la meilleure première impression.
      .sort(function (a, b) { return b.confiance - a.confiance; });
  }

  /**
   * statistiques() — le tableau de bord de l'exécution.
   *
   * On mesure toujours : combien de titres, combien de positifs, combien
   * d'erreurs, et combien ça a coûté. Sans ces quatre chiffres, on pilote
   * à l'aveugle.
   *
   * @param {Array} resultats
   * @param {string} [modele='gpt-5.6-luna']
   * @returns {Object}
   */
  function statistiques(resultats, modele) {
    const m = modele || 'gpt-5.6-luna';

    const parCategorie = { positif: 0, neutre: 0, negatif: 0 };
    let erreurs = 0;
    let tokensEntree = 0;
    let tokensSortie = 0;

    resultats.forEach(function (r) {
      parCategorie[r.categorie] = (parCategorie[r.categorie] || 0) + 1;
      if (r.erreur) erreurs++;
      // Estimation : le message système est envoyé à chaque appel,
      // c'est lui qui pèse le plus lourd. Beaucoup l'oublient dans leur budget.
      tokensEntree += Couts.estimerTokens(MESSAGE_SYSTEME) + Couts.estimerTokens(r.titre);
      tokensSortie += 20;                                  // la réponse JSON est courte
    });

    const cout = Couts.coutDunAppel(m, tokensEntree, tokensSortie);

    return {
      total: resultats.length,
      parCategorie: parCategorie,
      erreurs: erreurs,
      tokensEntree: tokensEntree,
      tokensSortie: tokensSortie,
      coutDollars: cout,
      coutLisible: cout.toFixed(5) + ' $',
      // Projeté sur un mois : le chiffre qui parle à une direction.
      coutMensuelSiQuotidien: (cout * 30).toFixed(2) + ' $'
    };
  }

  /** Un jeu de titres pour la démonstration, sans dépendre d'une source réelle. */
  const TITRES_EXEMPLE = [
    'Une commune wallonne inaugure sa première cantine 100 % locale',
    'Le conseil communal se réunit jeudi à 18 heures',
    'Trois blessés légers dans un accident sur la N4',
    'Un traitement contre la drépanocytose validé par l\'agence européenne',
    'La bibliothèque prolonge ses horaires pendant les examens',
    'Hausse de 4 % du prix de l\'électricité annoncée pour janvier',
    'Des étudiants brestois créent un capteur de qualité d\'air à 12 euros',
    'Publication du rapport annuel de la commission des finances',
    'Le taux de reboisement double en trois ans dans la région',
    'Fermeture temporaire du pont pour travaux de maintenance'
  ];

  const api = {
    CATEGORIES: CATEGORIES,
    MESSAGE_SYSTEME: MESSAGE_SYSTEME,
    TITRES_EXEMPLE: TITRES_EXEMPLE,
    classerUnTitre: classerUnTitre,
    classerPlusieursTitres: classerPlusieursTitres,
    filtrerPositifs: filtrerPositifs,
    statistiques: statistiques
  };

  racine.AppBonnesNouvelles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
