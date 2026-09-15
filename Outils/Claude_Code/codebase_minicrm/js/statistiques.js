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
   * @param {Array} contacts
   * @returns {Array} trié du plus rentable au moins rentable.
   */
  function parSource(contacts) {
    const liste = Array.isArray(contacts) ? contacts : [];
    const table = {};

    Modele.SOURCES.forEach(function (s) {
      table[s] = { source: s, contacts: 0, clients: 0, chiffreAffaires: 0 };
    });

    liste.forEach(function (c) {
      const ligne = table[c.source] || table.inconnue;
      ligne.contacts++;
      if (c.statut === 'client') {
        ligne.clients++;
        ligne.chiffreAffaires += Number(c.montant) || 0;
      }
    });

    return Object.values(table)
      .map(function (l) {
        l.chiffreAffaires = Modele.arrondiCentimes(l.chiffreAffaires);
        l.tauxConversion = l.contacts > 0
          ? Math.round((l.clients / l.contacts) * 1000) / 10
          : 0;
        return l;
      })
      // On garde les sources qui existent réellement dans la base.
      .filter(function (l) { return l.contacts > 0; })
      .sort(function (a, b) { return b.chiffreAffaires - a.chiffreAffaires; });
  }

  /**
   * parMois() — l'évolution du nombre de contacts et du chiffre d'affaires.
   *
   * @param {Array} contacts
   * @returns {Array} [{mois:'2026-05', contacts:3, chiffreAffaires:1200}, …]
   *                  trié par ordre chronologique.
   */
  function parMois(contacts) {
    const liste = Array.isArray(contacts) ? contacts : [];
    const table = {};

    liste.forEach(function (c) {
      // On garde les sept premiers caractères de AAAA-MM-JJ : « 2026-05 ».
      const mois = String(c.dateContact || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(mois)) return;   // date absente ou invalide : on ignore

      if (!table[mois]) table[mois] = { mois: mois, contacts: 0, clients: 0, chiffreAffaires: 0 };

      table[mois].contacts++;
      if (c.statut === 'client') {
        table[mois].clients++;
        table[mois].chiffreAffaires += Number(c.montant) || 0;
      }
    });

    return Object.values(table)
      .map(function (l) {
        l.chiffreAffaires = Modele.arrondiCentimes(l.chiffreAffaires);
        return l;
      })
      // Le format AAAA-MM se trie correctement comme du texte : c'est
      // exactement pour cela qu'on écrit les dates dans cet ordre.
      .sort(function (a, b) { return a.mois.localeCompare(b.mois); });
  }

  /**
   * meilleursClients() — le classement par montant.
   *
   * @param {Array} contacts
   * @param {number} [combien=5]
   * @returns {Array}
   */
  function meilleursClients(contacts, combien) {
    const n = combien === undefined ? 5 : combien;

    return (Array.isArray(contacts) ? contacts : [])
      .filter(function (c) { return c.statut === 'client'; })
      .sort(function (a, b) { return (b.montant || 0) - (a.montant || 0); })
      .slice(0, n);
  }

  /**
   * contactsADormants() — ceux qu'on n'a pas contactés depuis N jours.
   *
   * C'est la fonctionnalité qui justifie l'existence d'un CRM : sans elle,
   * on ne rappelle jamais personne.
   *
   * @param {Array} contacts
   * @param {number} [jours=90]
   * @param {string} [aujourdhui]  Date de référence, pour rendre la fonction testable.
   * @returns {Array} du plus ancien contact au plus récent.
   */
  function contactsDormants(contacts, jours, aujourdhui) {
    const seuil = jours === undefined ? 90 : jours;

    // On accepte une date de référence en paramètre : sans cela, le test
    // donnerait un résultat différent demain. Une fonction qui dépend de
    // l'heure qu'il est n'est pas testable.
    const reference = aujourdhui ? new Date(aujourdhui) : new Date();

    return (Array.isArray(contacts) ? contacts : [])
      .filter(function (c) {
        if (c.statut === 'inactif') return false;      // déjà classé, on n'insiste pas
        if (!Modele.dateValide(c.dateContact)) return false;

        const ecartJours = (reference - new Date(c.dateContact)) / (1000 * 60 * 60 * 24);
        return ecartJours >= seuil;
      })
      .sort(function (a, b) { return a.dateContact.localeCompare(b.dateContact); });
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
