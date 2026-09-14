/**
 * calcul-couts.js — Exercice 4 · Calculer un budget AVANT d'écrire l'application.
 * ---------------------------------------------------------------------------
 * Dix lignes de calcul évitent des mois de mauvaise surprise.
 * La formule est toujours la même :
 *
 *     coût = (tokens / 1 000 000) × prix du million
 *
 * Le reste du fichier n'est que de la mise en forme et des garde-fous.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  /**
   * TARIFS — prix en dollars par million de tokens, ordres de grandeur
   * relevés en septembre 2026.
   *
   * AVERTISSEMENT : ces chiffres seront périmés dans six mois.
   * Ce qui ne périmera pas : le rapport de 1 à 50 entre le plus cher et
   * le plus économique, et la méthode de calcul. Mettez à jour ce tableau,
   * pas le reste du fichier — c'est la raison d'être d'une constante.
   */
  const TARIFS = {
    'gpt-6-astra':      { entree: 10.00, sortie: 50.00, usage: 'Raisonnement complexe' },
    'gpt-5.6-sol':      { entree:  4.00, sortie: 20.00, usage: 'Rédaction exigeante' },
    'gpt-5.6-terra':    { entree:  2.00, sortie: 12.00, usage: 'Usage général' },
    'gpt-5.6-luna':     { entree:  0.20, sortie:  1.20, usage: 'Classer, extraire, router' },
    'claude-opus-5':    { entree:  5.00, sortie: 25.00, usage: 'Analyse longue' },
    'claude-sonnet-5':  { entree:  2.00, sortie: 10.00, usage: 'Usage général' },
    'claude-haiku-4.5': { entree:  1.00, sortie:  5.00, usage: 'Volume élevé' },
    'local':            { entree:  0.00, sortie:  0.00, usage: 'Confidentiel, volume illimité' }
  };

  /**
   * estimerTokens() — convertit un texte en nombre de tokens, approximativement.
   *
   * Règle de pouce : 1 token ≈ 4 caractères en français, un peu moins en anglais.
   * Ce n'est PAS exact : seul le tokenizer du modèle donne le chiffre réel.
   * Mais pour décider d'un budget, un ordre de grandeur suffit largement.
   *
   * @param {string} texte
   * @returns {number}
   */
  function estimerTokens(texte) {
    return Math.ceil(String(texte || '').length / 4);
  }

  /**
   * coutDunAppel() — le calcul de base.
   *
   * @param {string} modele        Une clé de TARIFS.
   * @param {number} tokensEntree  Ce que l'on envoie (prompt + contexte).
   * @param {number} tokensSortie  Ce que le modèle produit.
   * @returns {number} le coût en dollars.
   */
  function coutDunAppel(modele, tokensEntree, tokensSortie) {
    // Mieux vaut une erreur claire qu'un budget faux : si l'on se trompe de
    // nom de modèle, on veut le savoir tout de suite, pas dans trois mois
    // en lisant la facture.
    if (!Object.prototype.hasOwnProperty.call(TARIFS, modele)) {
      throw new Error('Modèle inconnu : ' + modele
        + '. Modèles connus : ' + Object.keys(TARIFS).join(', '));
    }
    if (tokensEntree < 0 || tokensSortie < 0) {
      throw new Error('Un nombre de tokens ne peut pas être négatif.');
    }

    const tarif = TARIFS[modele];
    const coutEntree = (tokensEntree / 1e6) * tarif.entree;
    const coutSortie = (tokensSortie / 1e6) * tarif.sortie;

    // On arrondit à six décimales : un appel unitaire coûte souvent
    // moins d'un millième de dollar, et l'arrondi par défaut le masquerait.
    return Math.round((coutEntree + coutSortie) * 1e6) / 1e6;
  }

  /**
   * budgetMensuel() — projette un coût d'appel sur un mois d'exploitation.
   *
   * @param {Object} scenario
   * @param {string} scenario.modele
   * @param {number} scenario.appelsParJour
   * @param {number} scenario.tokensEntree
   * @param {number} scenario.tokensSortie
   * @param {number} [scenario.jours=30]
   * @returns {{modele:string, coutParAppel:number, coutParJour:number, coutParMois:number, usage:string}}
   */
  function budgetMensuel(scenario) {
    const jours = scenario.jours === undefined ? 30 : scenario.jours;
    const unitaire = coutDunAppel(scenario.modele, scenario.tokensEntree, scenario.tokensSortie);

    return {
      modele: scenario.modele,
      usage: TARIFS[scenario.modele].usage,
      coutParAppel: unitaire,
      coutParJour: arrondi(unitaire * scenario.appelsParJour, 4),
      coutParMois: arrondi(unitaire * scenario.appelsParJour * jours, 2)
    };
  }

  /**
   * comparerTousLesModeles() — le tableau qui fait prendre les bonnes décisions.
   *
   * @param {Object} scenario  Même forme que pour budgetMensuel(), sans « modele ».
   * @returns {Array} trié du moins cher au plus cher.
   */
  function comparerTousLesModeles(scenario) {
    return Object.keys(TARIFS)
      .map(function (modele) {
        return budgetMensuel(Object.assign({}, scenario, { modele: modele }));
      })
      .sort(function (a, b) { return a.coutParMois - b.coutParMois; });
  }

  /**
   * economieEnPourcentage() — de combien on divise la facture en changeant de modèle.
   * @returns {number} pourcentage d'économie, entre 0 et 100.
   */
  function economieEnPourcentage(coutActuel, coutAlternatif) {
    if (coutActuel <= 0) return 0;
    return arrondi(((coutActuel - coutAlternatif) / coutActuel) * 100, 1);
  }

  /** Arrondi à N décimales, sans surprise de virgule flottante. */
  function arrondi(valeur, decimales) {
    const facteur = Math.pow(10, decimales);
    return Math.round(valeur * facteur) / facteur;
  }

  /**
   * enTableauTexte() — rend la comparaison lisible dans un terminal.
   * @param {Array} resultats  La sortie de comparerTousLesModeles().
   * @returns {string}
   */
  function enTableauTexte(resultats) {
    const lignes = [];
    lignes.push('Modèle              Coût/mois   Usage typique');
    lignes.push('------------------  ----------  -----------------------------');
    resultats.forEach(function (r) {
      lignes.push(
        r.modele.padEnd(20) +
        (r.coutParMois.toFixed(2) + ' $').padStart(10) + '  ' +
        r.usage
      );
    });
    return lignes.join('\n');
  }

  const api = {
    TARIFS: TARIFS,
    estimerTokens: estimerTokens,
    coutDunAppel: coutDunAppel,
    budgetMensuel: budgetMensuel,
    comparerTousLesModeles: comparerTousLesModeles,
    economieEnPourcentage: economieEnPourcentage,
    enTableauTexte: enTableauTexte
  };

  racine.CalculCouts = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  // Exécution directe : node calcul-couts.js
  if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    // Le scénario du support : l'application « bonnes nouvelles » classe
    // 200 titres par jour, 600 tokens envoyés, 80 reçus par appel.
    const scenario = { appelsParJour: 200, tokensEntree: 600, tokensSortie: 80 };
    console.log('Scénario : ' + scenario.appelsParJour + ' appels/jour, '
      + scenario.tokensEntree + ' tokens en entrée, ' + scenario.tokensSortie + ' en sortie.\n');
    console.log(enTableauTexte(comparerTousLesModeles(scenario)));
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);
