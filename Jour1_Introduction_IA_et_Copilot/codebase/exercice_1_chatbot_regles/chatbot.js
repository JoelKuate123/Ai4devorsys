/**
 * chatbot.js — Exercice 1 · Un « chatbot » qui ne contient aucune IA.
 * ---------------------------------------------------------------------------
 * Objectif : comprendre ce qu'est une IA SYMBOLIQUE avant de parler de LLM.
 *
 * Ce programme répond à des questions. Il n'a jamais rien appris.
 * Il ne contient que des RÈGLES écrites à la main : « si le message contient
 * tel mot, alors réponds telle phrase ». C'est tout.
 *
 * Pendant vingt ans, les « assistants » des sites web ont fonctionné comme ça.
 * Beaucoup fonctionnent encore comme ça aujourd'hui.
 *
 * Niveau : débutant. Aucune boucle compliquée, aucune récursivité.
 * Lancement navigateur : ouvrez index.html
 * Lancement Node       : node chatbot.js
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  /**
   * LES RÈGLES.
   *
   * Chaque règle est un objet avec deux champs :
   *   - motsCles : la liste des mots qui déclenchent la règle ;
   *   - reponse  : ce que le programme répond.
   *
   * L'ordre compte : la PREMIÈRE règle qui correspond gagne.
   * On met donc les règles les plus précises en haut, les plus générales en bas.
   */
  const REGLES = [

    // --- Les salutations ---
    {
      nom: 'salutation',
      motsCles: ['bonjour', 'salut', 'bonsoir', 'hello', 'coucou'],
      reponse: 'Bonjour ! Posez-moi une question sur nos horaires, nos tarifs ou nos formations.'
    },

    // --- Les horaires ---
    {
      nom: 'horaires',
      motsCles: ['horaire', 'heure', 'ouvert', 'ouverture', 'ferme', 'fermeture'],
      reponse: 'Nous sommes ouverts du lundi au vendredi, de 9 h à 18 h. Fermé le week-end.'
    },

    // --- Les tarifs ---
    {
      nom: 'tarifs',
      motsCles: ['prix', 'tarif', 'coute', 'cout', 'combien', 'euros'],
      reponse: 'Une journée de formation coûte 450 € hors taxes, repas compris.'
    },

    // --- Le catalogue ---
    {
      nom: 'formations',
      motsCles: ['formation', 'cours', 'catalogue', 'programme', 'apprendre'],
      reponse: 'Nous proposons trois parcours : intelligence artificielle, développement web, et données.'
    },

    // --- Le lieu ---
    {
      nom: 'adresse',
      motsCles: ['adresse', 'ou', 'lieu', 'venir', 'acces', 'parking'],
      reponse: 'Nous sommes avenue de la Basilique 385, à 1081 Koekelberg. Métro Simonis, dix minutes à pied.'
    },

    // --- Le contact ---
    {
      nom: 'contact',
      motsCles: ['contact', 'telephone', 'mail', 'email', 'joindre', 'appeler'],
      reponse: 'Écrivez-nous à hello@dhcompany.pro, nous répondons sous 24 heures ouvrées.'
    },

    // --- L'inscription ---
    {
      nom: 'inscription',
      motsCles: ['inscription', 'inscrire', 'reserver', 'reservation', 'place'],
      reponse: 'Les inscriptions se font par e-mail. Il reste des places sur les sessions de novembre.'
    },

    // --- Les remerciements ---
    {
      nom: 'remerciement',
      motsCles: ['merci', 'super', 'parfait', 'nickel'],
      reponse: 'Avec plaisir ! Autre chose ?'
    },

    // --- L'au revoir ---
    {
      nom: 'aurevoir',
      motsCles: ['revoir', 'bye', 'ciao', 'adieu'],
      reponse: 'Bonne journée, et à bientôt !'
    }
  ];

  /** La réponse quand aucune règle ne correspond. */
  const REPONSE_PAR_DEFAUT =
    "Je n'ai pas de règle pour cette question. Essayez avec : horaires, tarifs, "
    + "formations, adresse, contact ou inscription.";

  /**
   * normaliser() — met un texte sous une forme comparable.
   *
   * Pourquoi ? Parce que « HORAIRES ? », « Horaires » et « horaires »
   * doivent déclencher la même règle. Et parce que « où » ne se compare pas
   * facilement à « ou » tant qu'on n'a pas retiré l'accent.
   *
   * @param {string} texte
   * @returns {string} en minuscules, sans accent, sans ponctuation.
   */
  function normaliser(texte) {
    return String(texte || '')
      .toLowerCase()
      // normalize('NFD') sépare la lettre de son accent : « é » devient « e » + « ´ ».
      // Le remplacement suivant enlève tous les accents ainsi isolés.
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      // On remplace toute ponctuation par un espace : « horaires ? » -> « horaires  »
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /**
   * regleCorrespondante() — cherche la première règle qui s'applique.
   *
   * @param {string} message  Ce que l'utilisateur a écrit.
   * @returns {Object|null}   La règle trouvée, ou null.
   */
  function regleCorrespondante(message) {
    const texte = normaliser(message);

    // Un message vide ne déclenche aucune règle.
    if (!texte) return null;

    // On découpe le message en mots, une bonne fois pour toutes.
    const mots = texte.split(' ');

    // On parcourt les règles DANS L'ORDRE. La première qui correspond gagne.
    for (const regle of REGLES) {

      // .some() renvoie true dès qu'un mot-clé est trouvé.
      const correspond = regle.motsCles.some(function (motCle) {
        return mots.some(function (mot) {

          // Un mot-clé COURT doit correspondre exactement. Sans cette règle,
          // « ou » se déclencherait sur « bonjour », « oui » ou « pourquoi ».
          if (motCle.length < 5) {
            return mot === motCle;
          }

          // Un mot-clé LONG peut correspondre au début du mot. Cela gère
          // les pluriels et les conjugaisons sans effort : « horaire »
          // trouve « horaires », « formation » trouve « formations ».
          return mot === motCle || mot.startsWith(motCle);
        });
      });

      if (correspond) return regle;
    }

    return null;
  }

  /**
   * repondre() — la fonction principale.
   *
   * @param {string} message
   * @returns {{reponse:string, regle:string|null, comprise:boolean}}
   *
   * On renvoie AUSSI le nom de la règle utilisée. C'est ce qui rend le
   * programme explicable : on peut toujours dire POURQUOI il a répondu ça.
   * Un LLM, lui, ne saura jamais vous le dire.
   */
  function repondre(message) {
    const regle = regleCorrespondante(message);

    if (!regle) {
      return { reponse: REPONSE_PAR_DEFAUT, regle: null, comprise: false };
    }

    return { reponse: regle.reponse, regle: regle.nom, comprise: true };
  }

  /**
   * ajouterRegle() — ajoute une règle en fin de liste.
   *
   * @param {string} nom
   * @param {string[]} motsCles
   * @param {string} reponse
   * @returns {number} le nombre de règles après ajout.
   */
  function ajouterRegle(nom, motsCles, reponse) {
    // On normalise les mots-clés à l'ajout : ainsi, « Horaires » saisi par
    // l'utilisateur devient « horaires », comparable au message normalisé.
    const cles = (motsCles || []).map(normaliser).filter(function (m) { return m.length > 0; });

    REGLES.push({ nom: nom, motsCles: cles, reponse: reponse });
    return REGLES.length;
  }

  /**
   * tauxDeComprehension() — sur une liste de questions, combien sont comprises ?
   *
   * C'est LA mesure qui compte pour un système à règles, et c'est aussi
   * sa limite : chaque point de pourcentage supplémentaire demande
   * d'écrire de nouvelles règles à la main.
   *
   * @param {string[]} questions
   * @returns {{total:number, comprises:number, pourcentage:number, ratees:string[]}}
   */
  function tauxDeComprehension(questions) {
    const liste = Array.isArray(questions) ? questions : [];
    const ratees = [];

    liste.forEach(function (q) {
      if (!repondre(q).comprise) ratees.push(q);
    });

    const comprises = liste.length - ratees.length;

    return {
      total: liste.length,
      comprises: comprises,
      // Math.round(x * 10) / 10 garde une décimale.
      pourcentage: liste.length > 0 ? Math.round((comprises / liste.length) * 1000) / 10 : 0,
      ratees: ratees
    };
  }

  /** Des questions de test, dont certaines sont volontairement mal formulées. */
  const QUESTIONS_EXEMPLE = [
    'Bonjour !',
    'Quels sont vos horaires ?',
    'Combien ça coûte ?',
    'Vous êtes où exactement ?',
    'Je voudrais m\'inscrire',
    'Vous faites quoi comme formations ?',
    'Merci beaucoup',
    // Les quatre suivantes échouent : c'est le but de l'exercice.
    'Est-ce que je peux payer en plusieurs fois ?',
    'Y a-t-il un certificat à la fin ?',
    'Auriez-vous une session en soirée ?',
    'Mon employeur peut-il financer ma participation ?'
  ];

  const api = {
    REGLES: REGLES,
    REPONSE_PAR_DEFAUT: REPONSE_PAR_DEFAUT,
    QUESTIONS_EXEMPLE: QUESTIONS_EXEMPLE,
    normaliser: normaliser,
    regleCorrespondante: regleCorrespondante,
    repondre: repondre,
    ajouterRegle: ajouterRegle,
    tauxDeComprehension: tauxDeComprehension
  };

  racine.Chatbot = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  // Exécution directe : node chatbot.js
  if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    console.log('Chatbot à règles — ' + REGLES.length + ' règles écrites à la main.\n');

    QUESTIONS_EXEMPLE.forEach(function (question) {
      const r = repondre(question);
      console.log('  Q : ' + question);
      console.log('  R : ' + r.reponse);
      console.log('      (règle : ' + (r.regle || 'aucune') + ')\n');
    });

    const bilan = tauxDeComprehension(QUESTIONS_EXEMPLE);
    console.log('Taux de compréhension : ' + bilan.pourcentage + ' % ('
      + bilan.comprises + ' sur ' + bilan.total + ').');
    console.log('\nLes questions ratées demanderaient chacune une nouvelle règle,');
    console.log('écrite à la main. C\'est exactement le mur qu\'a rencontré l\'IA symbolique.');
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);
