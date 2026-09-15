/**
 * statistiques.js — les chiffres du tableau de bord.
 * ---------------------------------------------------------------------------
 * Des fonctions PURES : mêmes entrées, même sortie, aucun effet de bord.
 * C'est ce qui les rend faciles à tester — et c'est aussi ce qui rend
 * une erreur de calcul immédiatement visible dans un test.
 *
 * Un chiffre faux sur un tableau de bord est plus dangereux qu'une page
 * qui plante : personne ne s'en aperçoit.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const Modele = racine.Modele || require('./modele.js');

  /**
   * resume() — les cinq chiffres de la page d'accueil.
   *
   * @param {Array} contacts
   * @returns {{total:number, parStatut:Object, chiffreAffaires:number,
   *            panierMoyen:number, tauxConversion:number}}
   */
  function resume(contacts) {
    const liste = Array.isArray(contacts) ? contacts : [];

    // On part de zéro pour CHAQUE statut connu : sans cela, un statut
    // absent de la base n'apparaîtrait pas du tout dans le tableau de bord,
    // et l'utilisateur croirait à un bug.
    const parStatut = {};
    Modele.STATUTS.forEach(function (s) { parStatut[s] = 0; });

    let chiffreAffaires = 0;

    liste.forEach(function (c) {
      parStatut[c.statut] = (parStatut[c.statut] || 0) + 1;

      // Règle métier : seul un CLIENT compte dans le chiffre d'affaires.
      // Un prospect peut avoir un montant : c'est une estimation, pas un revenu.
      if (c.statut === 'client') {
        chiffreAffaires += Number(c.montant) || 0;
      }
    });

    const nombreClients = parStatut.client || 0;

    return {
      total: liste.length,
      parStatut: parStatut,
      chiffreAffaires: Modele.arrondiCentimes(chiffreAffaires),
      // Division par zéro : on renvoie 0, pas NaN ni Infinity.
      // Un « NaN € » affiché sur un tableau de bord, c'est une réunion perdue.
      panierMoyen: nombreClients > 0
        ? Modele.arrondiCentimes(chiffreAffaires / nombreClients)
        : 0,
      tauxConversion: liste.length > 0
        ? Math.round((nombreClients / liste.length) * 1000) / 10   // une décimale
        : 0
    };
  }

  /**
   * parSource() — d'où viennent les clients, et combien ils rapportent.
   *
   * À COMPLÉTER — exercice 2 du support GitHub Copilot.
   *
   * Attendu, pour CHAQUE source réellement présente dans la base :
   *   { source, contacts, clients, chiffreAffaires, tauxConversion }
   *
   * Règles :
   *   - « contacts » compte tous les contacts venus de cette source ;
   *   - « clients » ne compte que ceux dont le statut vaut 'client' ;
   *   - « chiffreAffaires » n'additionne QUE les montants des clients ;
   *   - « tauxConversion » est un pourcentage à une décimale (clients ÷ contacts) ;
   *   - une source sans aucun contact ne doit PAS apparaître ;
   *   - le résultat est trié du plus rentable au moins rentable.
   *
   * @param {Array} contacts
   * @returns {Array}
   */
  function parSource(contacts) {
    // TODO : placez le curseur ici, laissez Copilot proposer, PUIS relisez.
    // Les tests de tests/statistiques.test.js disent exactement ce qui est attendu.
    return [];
  }

  /**
   * parMois() — l'évolution du nombre de contacts et du chiffre d'affaires.
   *
   * À COMPLÉTER — exercice 2 du support GitHub Copilot.
   *
   * Attendu : [{ mois: '2026-05', contacts: 3, clients: 2, chiffreAffaires: 4000 }, …]
   *
   * Règles :
   *   - le mois se lit sur les sept premiers caractères de dateContact (AAAA-MM) ;
   *   - un contact dont la date n'a pas ce format est ignoré, pas compté à part ;
   *   - le résultat est trié par ordre chronologique.
   *
   * @param {Array} contacts
   * @returns {Array}
   */
  function parMois(contacts) {
    // TODO
    return [];
  }

  /**
   * meilleursClients() — le classement par montant.
   *
   * À COMPLÉTER — exercice 2 du support GitHub Copilot.
   *
   * Règles :
   *   - seuls les contacts au statut 'client' entrent dans le classement ;
   *     un prospect à 50 000 € est une estimation, pas un revenu ;
   *   - tri décroissant sur le montant ;
   *   - on renvoie au plus « combien » entrées (5 par défaut).
   *
   * @param {Array} contacts
   * @param {number} [combien=5]
   * @returns {Array}
   */
  function meilleursClients(contacts, combien) {
    // TODO
    return [];
  }

  /**
   * contactsDormants() — ceux qu'on n'a pas contactés depuis N jours.
   *
   * À COMPLÉTER — exercice 2 du support GitHub Copilot.
   *
   * C'est la fonctionnalité qui justifie l'existence d'un CRM :
   * sans elle, on ne rappelle jamais personne.
   *
   * Règles :
   *   - un contact au statut 'inactif' est exclu : il a dit non, on n'insiste pas ;
   *   - un contact sans date valide est exclu ;
   *   - « dormant » = au moins « jours » jours depuis dateContact ;
   *   - tri du plus ancien au plus récent ;
   *   - le paramètre « aujourdhui » sert à rendre la fonction testable :
   *     sans lui, le test donnerait un résultat différent demain.
   *
   * @param {Array} contacts
   * @param {number} [jours=90]
   * @param {string} [aujourdhui]
   * @returns {Array}
   */
  function contactsDormants(contacts, jours, aujourdhui) {
    // TODO
    return [];
  }

  const api = {
    resume: resume,
    parSource: parSource,
    parMois: parMois,
    meilleursClients: meilleursClients,
    contactsDormants: contactsDormants
  };

  racine.Statistiques = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
