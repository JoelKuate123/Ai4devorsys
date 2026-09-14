/**
 * specification-bonnes-nouvelles.js — Exercice 3 · Le TP du programme.
 * ---------------------------------------------------------------------------
 * Énoncé officiel : « Faire un prompt de spécification d'une application web
 * qui donne les nouvelles positives du jour. »
 *
 * On ne code pas l'application : on écrit le PROMPT qui produira sa
 * spécification, et on vérifie que la spécification obtenue est utilisable.
 *
 * Ce fichier combine trois techniques du fichier voisin :
 *   - le rôle (technique 1),
 *   - le format imposé en JSON (technique 4),
 *   - la vérification systématique de la réponse (bon sens).
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const LLM = racine.LLM || require('../../../_commun/llm-client.js');
  const Techniques = racine.Techniques || require('./techniques-de-prompt.js');

  /**
   * Le squelette de la spécification attendue.
   * On le déclare comme une donnée, pas comme du texte : il sert
   * à la fois à construire le prompt ET à vérifier la réponse.
   * Une seule source de vérité, donc pas de dérive possible entre les deux.
   */
  const SCHEMA_SPECIFICATION = {
    titre: 'Nom de l\'application',
    probleme: 'Le problème résolu, en une phrase',
    utilisateurs: ['profil 1', 'profil 2'],
    fonctionnalites: [
      { nom: 'Nom court', description: 'Ce que ça fait', priorite: 'indispensable' }
    ],
    sources_de_donnees: ['nom de la source et pourquoi elle est fiable'],
    criteres_qualite: ['comment on saura que l\'application marche'],
    contraintes: {
      budget_mensuel_euros: 0,
      donnees_personnelles: 'aucune | minimales | sensibles',
      hebergement: 'où et pourquoi'
    },
    risques: [{ risque: 'lequel', parade: 'quoi faire' }]
  };

  /**
   * MESSAGE_SYSTEME — le rôle, construit avec la technique 1.
   * On ne l'écrit pas à la main : on réutilise la fonction, ce qui garantit
   * que toutes les spécifications du projet auront la même forme.
   */
  const MESSAGE_SYSTEME = Techniques.rolePrompting(
    'un analyste fonctionnel',
    'la rédaction de spécifications d\'applications web légères',
    [
      'qu\'une fonctionnalité annoncée est réalisable avec le budget indiqué',
      'qu\'aucune donnée personnelle n\'est collectée sans raison',
      'qu\'un critère de qualité est mesurable, pas une intention',
      'qu\'une source de données est nommée et vérifiable'
    ]
  );

  /**
   * construirePromptSpecification() — le prompt complet, en six blocs.
   *
   * @param {string} idee            L'idée d'application, en une phrase.
   * @param {Object} [cadre]
   * @param {number} [cadre.budgetMensuel=10]
   * @param {string} [cadre.public='grand public francophone']
   * @param {string[]} [cadre.interdits]  Ce que l'application ne doit PAS faire.
   * @returns {string}
   */
  function construirePromptSpecification(idee, cadre) {
    const c = cadre || {};

    const contraintes = [
      'Budget d\'exploitation : ' + (c.budgetMensuel === undefined ? 10 : c.budgetMensuel) + ' euros par mois maximum.',
      'Public visé : ' + (c.public || 'grand public francophone') + '.',
      'Aucune inscription obligatoire pour consulter le contenu.',
      'Lisible sur mobile en priorité.'
    ];
    (c.interdits || []).forEach(function (i) { contraintes.push('Interdit : ' + i + '.'); });

    // On assemble avec le canevas en six blocs. Le bloc FORMAT réutilise
    // la technique 4 : on montre le JSON attendu au lieu de le décrire.
    return Techniques.promptStructure({
      role: MESSAGE_SYSTEME,
      contexte: 'Une petite équipe de deux développeurs veut lancer cette application '
              + 'en trois semaines, sans financement.',
      tache: 'Rédige la spécification fonctionnelle de l\'application suivante : ' + idee,
      contraintes: contraintes,
      format: 'Réponds UNIQUEMENT par un objet JSON de cette forme exacte :\n'
            + JSON.stringify(SCHEMA_SPECIFICATION, null, 2)
            + '\n\nAucun texte avant ni après. Si une information manque, mets null.'
    });
  }

  /**
   * verifierSpecification() — le contrôle qualité de la réponse.
   *
   * Règle absolue : ne JAMAIS faire confiance au type de la réponse d'un
   * modèle. Un champ annoncé « tableau » arrive parfois sous forme de chaîne,
   * et votre code plante en production, pas en démonstration.
   *
   * @param {Object} spec
   * @returns {{valide:boolean, problemes:string[], score:number}}
   */
  function verifierSpecification(spec) {
    const problemes = [];

    // Contrôle 0 : est-ce seulement un objet ?
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
      return { valide: false, problemes: ['La réponse n\'est pas un objet JSON.'], score: 0 };
    }

    // Contrôle 1 : les champs texte obligatoires.
    ['titre', 'probleme'].forEach(function (champ) {
      if (typeof spec[champ] !== 'string' || spec[champ].trim().length < 3) {
        problemes.push('Le champ « ' + champ + ' » est absent ou vide.');
      }
    });

    // Contrôle 2 : les champs qui DOIVENT être des tableaux.
    ['utilisateurs', 'fonctionnalites', 'sources_de_donnees', 'criteres_qualite', 'risques']
      .forEach(function (champ) {
        if (!Array.isArray(spec[champ])) {
          problemes.push('Le champ « ' + champ + ' » devrait être un tableau.');
        } else if (spec[champ].length === 0) {
          problemes.push('Le champ « ' + champ + ' » est vide.');
        }
      });

    // Contrôle 3 : la structure interne des fonctionnalités.
    if (Array.isArray(spec.fonctionnalites)) {
      spec.fonctionnalites.forEach(function (f, i) {
        if (!f || typeof f !== 'object' || !f.nom || !f.description) {
          problemes.push('La fonctionnalité n°' + (i + 1) + ' n\'a pas de nom ou pas de description.');
        }
      });
    }

    // Contrôle 4 : le budget est-il un nombre ? Le modèle écrit souvent « 10 € ».
    const budget = spec.contraintes && spec.contraintes.budget_mensuel_euros;
    if (typeof budget !== 'number') {
      problemes.push('Le budget devrait être un nombre, pas « ' + budget + ' ».');
    }

    // Contrôle 5 : les critères de qualité sont-ils mesurables ?
    // Heuristique volontairement simple : on cherche un chiffre ou une unité.
    if (Array.isArray(spec.criteres_qualite)) {
      const mesurables = spec.criteres_qualite.filter(function (c) {
        return /\d/.test(String(c));
      });
      if (mesurables.length === 0) {
        problemes.push('Aucun critère de qualité ne contient de valeur chiffrée : '
                     + 'ce sont des intentions, pas des critères.');
      }
    }

    // Onze contrôles environ ; le score est une fraction de 10.
    const score = Math.max(0, 10 - problemes.length);

    return { valide: problemes.length === 0, problemes: problemes, score: score };
  }

  /**
   * genererSpecification() — le tout, de bout en bout.
   *
   * @param {string} idee
   * @param {Object} [cadre]
   * @returns {Promise<{succes:boolean, specification:Object|null, controle:Object, prompt:string, erreur?:string}>}
   */
  async function genererSpecification(idee, cadre) {
    const prompt = construirePromptSpecification(idee, cadre);

    try {
      // Température 0 : pour une spécification, on veut de la stabilité,
      // pas de la créativité. Deux exécutions doivent donner à peu près
      // le même document.
      const spec = await LLM.demanderJson(prompt, { temperature: 0 });

      return {
        succes: true,
        specification: spec,
        controle: verifierSpecification(spec),
        prompt: prompt
      };
    } catch (erreur) {
      return {
        succes: false,
        specification: null,
        controle: { valide: false, problemes: [erreur.message], score: 0 },
        prompt: prompt,
        erreur: erreur.message
      };
    }
  }

  /**
   * enMarkdown() — convertit la spécification JSON en document lisible.
   *
   * Pourquoi ne pas demander directement du Markdown au modèle ?
   * Parce qu'un JSON se VÉRIFIE, alors qu'un texte libre ne se vérifie pas.
   * On demande une donnée, on la contrôle, puis on la met en forme nous-mêmes.
   * C'est le schéma standard de toute application IA sérieuse.
   *
   * @param {Object} spec
   * @returns {string}
   */
  function enMarkdown(spec) {
    if (!spec) return '';
    const l = [];

    l.push('# ' + (spec.titre || 'Sans titre'));
    l.push('');
    l.push('> ' + (spec.probleme || ''));
    l.push('');

    l.push('## Utilisateurs');
    (spec.utilisateurs || []).forEach(function (u) { l.push('- ' + u); });
    l.push('');

    l.push('## Fonctionnalités');
    (spec.fonctionnalites || []).forEach(function (f) {
      l.push('- **' + f.nom + '** — ' + f.description
           + (f.priorite ? ' _(' + f.priorite + ')_' : ''));
    });
    l.push('');

    l.push('## Sources de données');
    (spec.sources_de_donnees || []).forEach(function (s) { l.push('- ' + s); });
    l.push('');

    l.push('## Critères de qualité');
    (spec.criteres_qualite || []).forEach(function (c) { l.push('- ' + c); });
    l.push('');

    if (spec.contraintes) {
      l.push('## Contraintes');
      l.push('- Budget : ' + spec.contraintes.budget_mensuel_euros + ' €/mois');
      l.push('- Données personnelles : ' + spec.contraintes.donnees_personnelles);
      l.push('- Hébergement : ' + spec.contraintes.hebergement);
      l.push('');
    }

    l.push('## Risques');
    (spec.risques || []).forEach(function (r) {
      l.push('- **' + r.risque + '** → ' + r.parade);
    });

    return l.join('\n');
  }

  const api = {
    SCHEMA_SPECIFICATION: SCHEMA_SPECIFICATION,
    MESSAGE_SYSTEME: MESSAGE_SYSTEME,
    construirePromptSpecification: construirePromptSpecification,
    verifierSpecification: verifierSpecification,
    genererSpecification: genererSpecification,
    enMarkdown: enMarkdown
  };

  racine.Specification = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
