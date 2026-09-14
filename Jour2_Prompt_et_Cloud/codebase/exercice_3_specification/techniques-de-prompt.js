/**
 * techniques-de-prompt.js — Exercice 3 · Les six techniques, sous forme de code.
 * ---------------------------------------------------------------------------
 * Une technique de prompt n'est pas une astuce à retenir par cœur :
 * c'est un bout de texte réutilisable. Écrite comme une FONCTION, elle
 * devient testable, versionnable et partageable dans une équipe.
 *
 * C'est tout l'objet de ce fichier : transformer six recettes floues
 * en six fonctions que l'on peut relire, tester et améliorer.
 *
 * Niveau : débutant. Chaque fonction est indépendante des autres.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const LLM = racine.LLM || require('../../../_commun/llm-client.js');

  /* =========================================================================
   * TECHNIQUE 1 — Le role prompting : donner un métier au modèle.
   * =======================================================================*/

  /**
   * rolePrompting() — fabrique un message système qui donne un rôle précis.
   *
   * Pourquoi ça marche : un modèle produit le texte le plus probable.
   * En posant « tu es un expert en X », on déplace la zone de probabilité
   * vers le vocabulaire, les réflexes et les objections de ce métier.
   *
   * Mauvais rôle : « tu es un expert ». (Expert de quoi ? Pour qui ?)
   * Bon rôle : métier + spécialité + contexte + ce à quoi il fait attention.
   *
   * @param {string} metier      « développeur JavaScript », « juriste RGPD »…
   * @param {string} specialite  Le domaine précis.
   * @param {string[]} [reflexes] Ce que ce professionnel vérifie systématiquement.
   * @returns {string} un message système prêt à l'emploi.
   */
  function rolePrompting(metier, specialite, reflexes) {
    const lignes = ['Tu es ' + metier + ', spécialisé en ' + specialite + '.'];

    if (reflexes && reflexes.length) {
      lignes.push('');
      lignes.push('Tu vérifies systématiquement :');
      reflexes.forEach(function (r) { lignes.push('- ' + r); });
    }

    // Cette dernière phrase évite le travers principal du role prompting :
    // le modèle joue le rôle au lieu de faire le travail.
    lignes.push('');
    lignes.push('Tu réponds de façon concise et technique, sans préambule ni flatterie.');

    return lignes.join('\n');
  }

  /* =========================================================================
   * TECHNIQUE 2 — Le few-shot prompting : montrer plutôt qu'expliquer.
   * =======================================================================*/

  /**
   * fewShot() — construit un prompt à partir d'exemples.
   *
   * Quand utiliser : dès que le FORMAT compte plus que le raisonnement.
   * Deux ou trois exemples valent mieux qu'un paragraphe de consignes,
   * parce qu'un exemple ne laisse aucune place à l'interprétation.
   *
   * @param {string} consigne
   * @param {Array<{entree:string, sortie:string}>} exemples
   * @param {string} nouvelleEntree
   * @returns {string}
   */
  function fewShot(consigne, exemples, nouvelleEntree) {
    const morceaux = [consigne, ''];

    // Les exemples sont numérotés : cela aide le modèle à percevoir
    // qu'il s'agit d'une série, et non d'un bloc de texte quelconque.
    exemples.forEach(function (ex, i) {
      morceaux.push('Exemple ' + (i + 1) + ' —');
      morceaux.push('Entrée : ' + ex.entree);
      morceaux.push('Sortie : ' + ex.sortie);
      morceaux.push('');
    });

    // La dernière ligne est volontairement laissée en suspens : le modèle
    // complète naturellement le motif qu'il vient de voir trois fois.
    morceaux.push('Entrée : ' + nouvelleEntree);
    morceaux.push('Sortie :');

    return morceaux.join('\n');
  }

  /* =========================================================================
   * TECHNIQUE 3 — Le chain-of-thought : demander à raisonner par étapes.
   * =======================================================================*/

  /**
   * chainOfThought() — impose un cheminement avant la conclusion.
   *
   * Utile pour : les calculs, les diagnostics, les choix d'architecture.
   * Inutile, voire nuisible, pour : une reformulation, une traduction,
   * une extraction de données — on paie des tokens pour rien.
   *
   * @param {string} probleme
   * @param {string[]} [etapes]  Les étapes imposées. Sinon, un canevas générique.
   * @returns {string}
   */
  function chainOfThought(probleme, etapes) {
    const parcours = etapes && etapes.length ? etapes : [
      'Reformule le problème en une phrase.',
      'Liste les informations dont tu disposes, et celles qui manquent.',
      'Envisage au moins deux approches possibles.',
      'Compare-les sur le coût, le risque et le délai.',
      'Conclus par une recommandation unique.'
    ];

    const morceaux = [probleme, '', 'Procède dans cet ordre :'];
    parcours.forEach(function (e, i) { morceaux.push((i + 1) + '. ' + e); });

    morceaux.push('');
    // On sépare le raisonnement de la conclusion : sans cette consigne,
    // la réponse utile est noyée dans le cheminement.
    morceaux.push('Termine par une section « CONCLUSION » de trois lignes maximum.');

    return morceaux.join('\n');
  }

  /* =========================================================================
   * TECHNIQUE 4 — Imposer le format de sortie.
   * =======================================================================*/

  /**
   * formatJson() — décrit la structure attendue à partir d'un exemple.
   *
   * La meilleure façon de décrire un format n'est pas de l'expliquer,
   * c'est de le MONTRER. Un exemple de JSON vaut trois paragraphes.
   *
   * @param {string} consigne
   * @param {Object} schemaExemple  Un objet qui montre la forme attendue.
   * @returns {string}
   */
  function formatJson(consigne, schemaExemple) {
    return [
      consigne,
      '',
      'Réponds UNIQUEMENT par un objet JSON de cette forme exacte :',
      JSON.stringify(schemaExemple, null, 2),
      '',
      'Aucun texte avant. Aucun texte après. Pas de bloc de code.',
      'Si une information est absente, mets null — n\'invente jamais de valeur.'
    ].join('\n');
  }

  /* =========================================================================
   * TECHNIQUE 5 — La self-consistency : voter plutôt que croire.
   * =======================================================================*/

  /**
   * voteMajoritaire() — pose N fois la même question et garde la réponse
   * la plus fréquente.
   *
   * Principe : un modèle à température non nulle se trompe de façon
   * ALÉATOIRE. Il est donc peu probable qu'il se trompe trois fois de la
   * même manière. Le vote élimine une partie du bruit.
   *
   * Le prix : N appels au lieu d'un. Réservez cette technique aux décisions
   * qui comptent (classification, extraction de champ critique).
   *
   * @param {string} prompt
   * @param {number} [nombreDeVotes=3]  Toujours un nombre IMPAIR.
   * @param {Object} [options]
   * @returns {Promise<{reponse:string, voix:number, total:number, toutes:string[]}>}
   */
  async function voteMajoritaire(prompt, nombreDeVotes, options) {
    const n = nombreDeVotes || 3;
    const opts = Object.assign({ temperature: 0.7 }, options || {});

    // On lance les N appels en parallèle : trois appels séquentiels
    // prendraient trois fois plus de temps pour le même résultat.
    const appels = [];
    for (let i = 0; i < n; i++) appels.push(LLM.demander(prompt, opts));
    const reponses = await Promise.all(appels);

    // On compte les occurrences. Le .trim() évite de compter comme
    // différentes deux réponses qui ne diffèrent que par un espace.
    const comptes = new Map();
    reponses.forEach(function (r) {
      const cle = String(r).trim();
      comptes.set(cle, (comptes.get(cle) || 0) + 1);
    });

    // On trie par nombre de voix décroissant et on garde la première.
    let gagnante = '';
    let meilleures = 0;
    comptes.forEach(function (voix, texte) {
      if (voix > meilleures) { meilleures = voix; gagnante = texte; }
    });

    return {
      reponse: gagnante,
      voix: meilleures,
      total: n,
      toutes: reponses,
      // Un signal utile : si le vote est serré, la réponse est fragile.
      fiable: meilleures > n / 2
    };
  }

  /* =========================================================================
   * TECHNIQUE 6 — Le prompt de modification.
   * =======================================================================*/

  /**
   * promptDeModification() — demander un changement sans tout casser.
   *
   * L'erreur de débutant : « améliore ce code ». Le modèle réécrit tout,
   * change des noms, supprime des cas, et vous ne savez plus ce qui a bougé.
   *
   * La bonne façon : dire ce qui change, ET ce qui ne doit PAS changer.
   *
   * @param {string} codeExistant
   * @param {string} changementVoulu
   * @param {string[]} [invariants]  Ce qui doit rester identique.
   * @returns {string}
   */
  function promptDeModification(codeExistant, changementVoulu, invariants) {
    const garde = invariants && invariants.length ? invariants : [
      'les noms des fonctions publiques',
      'la signature des fonctions existantes',
      'le comportement des cas déjà gérés',
      'le style et l\'indentation du fichier'
    ];

    const morceaux = [
      'Voici un fichier existant :',
      '',
      '```',
      codeExistant,
      '```',
      '',
      'MODIFICATION DEMANDÉE :',
      changementVoulu,
      '',
      'NE MODIFIE PAS :'
    ];
    garde.forEach(function (g) { morceaux.push('- ' + g); });

    morceaux.push('');
    // Demander un résumé des changements est le meilleur moyen de repérer
    // en trois secondes si le modèle a fait plus que ce qu'on demandait.
    morceaux.push('Renvoie le fichier complet, puis une liste à puces');
    morceaux.push('des lignes que tu as réellement changées.');

    return morceaux.join('\n');
  }

  /* =========================================================================
   * BONUS — Les six blocs d'un prompt professionnel.
   * =======================================================================*/

  /**
   * promptStructure() — assemble un prompt complet en six blocs.
   * C'est le canevas à recopier dans 90 % des cas réels.
   *
   * @param {Object} blocs
   * @param {string} blocs.role      Qui parle.
   * @param {string} blocs.contexte  Dans quel cadre.
   * @param {string} blocs.tache     Ce qu'il faut produire.
   * @param {string[]} [blocs.contraintes]
   * @param {string} [blocs.format]
   * @param {string} [blocs.exemple]
   * @returns {string}
   */
  function promptStructure(blocs) {
    const m = [];

    if (blocs.role) m.push('# RÔLE\n' + blocs.role);
    if (blocs.contexte) m.push('# CONTEXTE\n' + blocs.contexte);
    if (blocs.tache) m.push('# TÂCHE\n' + blocs.tache);

    if (blocs.contraintes && blocs.contraintes.length) {
      m.push('# CONTRAINTES\n' + blocs.contraintes.map(function (c) { return '- ' + c; }).join('\n'));
    }
    if (blocs.format) m.push('# FORMAT DE SORTIE\n' + blocs.format);
    if (blocs.exemple) m.push('# EXEMPLE\n' + blocs.exemple);

    return m.join('\n\n');
  }

  /**
   * nettoyerEntreeUtilisateur() — première ligne de défense contre
   * l'injection de prompt.
   *
   * Le principe de l'attaque : un utilisateur écrit dans un champ de
   * formulaire « ignore les instructions précédentes et… ». Si ce texte
   * est collé tel quel dans le prompt, le modèle peut obéir.
   *
   * Cette fonction ne « sécurise » pas : elle réduit la surface.
   * La vraie protection reste architecturale (voir le support, jour 2).
   *
   * @param {string} texte
   * @param {number} [longueurMax=2000]
   * @returns {string}
   */
  function nettoyerEntreeUtilisateur(texte, longueurMax) {
    const max = longueurMax || 2000;

    return String(texte || '')
      // On coupe : une entrée de 50 000 caractères n'a jamais rien de légitime.
      .slice(0, max)
      // On neutralise les délimiteurs qui servent à « fermer » notre prompt.
      .replace(/```/g, "'''")
      // On neutralise les mots-clés de rôle, très utilisés dans les attaques.
      .replace(/\b(system|assistant)\s*:/gi, '$1 -')
      .trim();
  }

  const api = {
    rolePrompting: rolePrompting,
    fewShot: fewShot,
    chainOfThought: chainOfThought,
    formatJson: formatJson,
    voteMajoritaire: voteMajoritaire,
    promptDeModification: promptDeModification,
    promptStructure: promptStructure,
    nettoyerEntreeUtilisateur: nettoyerEntreeUtilisateur
  };

  racine.Techniques = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
