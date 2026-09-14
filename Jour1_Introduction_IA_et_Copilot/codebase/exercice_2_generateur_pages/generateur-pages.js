/**
 * generateur-pages.js — Exercice 2 · Générer une page web à partir d'un prompt.
 * ---------------------------------------------------------------------------
 * C'est le premier exercice où l'on appelle réellement un modèle.
 * Il démontre trois choses que l'on retrouvera dans TOUS les projets IA :
 *
 *   1. le message système fait 80 % du travail de cadrage ;
 *   2. le modèle bavarde toujours : il faut nettoyer sa sortie ;
 *   3. il faut valider ce qu'on reçoit avant de s'en servir.
 *
 * Niveau : débutant. Aucune bibliothèque externe.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  // Le client LLM. Dans le navigateur il est déjà chargé (window.LLM),
  // sous Node on va le chercher dans le dossier commun.
  const LLM = racine.LLM || require('../../../_commun/llm-client.js');

  /**
   * MESSAGE_SYSTEME — le cadrage du modèle.
   *
   * C'est ici que se joue la qualité du résultat. Notez trois choses :
   *   - on donne un RÔLE (« intégrateur web ») ;
   *   - on impose un FORMAT (un seul fichier, pas de dépendance) ;
   *   - on interdit explicitement les comportements indésirables.
   *
   * En TP, modifiez cette constante et relancez : c'est l'expérience la plus
   * parlante de la journée.
   */
  const MESSAGE_SYSTEME = [
    'Tu es un intégrateur web expérimenté.',
    '',
    'Tu produis UNE page HTML complète et autonome :',
    '- un seul fichier, du <!DOCTYPE html> à la balise </html> ;',
    '- le CSS dans une balise <style> à l\'intérieur du <head> ;',
    '- aucune dépendance externe : pas de CDN, pas de police distante, pas d\'image distante ;',
    '- le texte est en français, l\'attribut lang vaut "fr" ;',
    '- la page est lisible sur mobile (une seule colonne sous 700 pixels) ;',
    '- contraste suffisant, taille de texte d\'au moins 16 pixels.',
    '',
    'Tu réponds UNIQUEMENT par le code de la page.',
    'Aucune phrase avant, aucune phrase après, aucun commentaire d\'accompagnement.'
  ].join('\n');

  /**
   * construirePrompt() — assemble la demande envoyée au modèle.
   *
   * On sépare volontairement le message système (stable, réutilisable)
   * de la demande (variable). C'est la structure qu'on retrouve dans
   * toutes les applications sérieuses.
   *
   * @param {string} description  Ce que l'utilisateur veut, en langage courant.
   * @param {Object} [contraintes]
   * @param {string} [contraintes.couleur]  Couleur dominante souhaitée.
   * @param {string} [contraintes.ton]      Ton du texte (« sobre », « joyeux »…).
   * @param {string[]} [contraintes.sections] Les sections attendues.
   * @returns {string}
   */
  function construirePrompt(description, contraintes) {
    const c = contraintes || {};
    const morceaux = ['Crée une page web pour : ' + description];

    if (c.couleur) morceaux.push('Couleur dominante : ' + c.couleur + '.');
    if (c.ton) morceaux.push('Ton du texte : ' + c.ton + '.');
    if (c.sections && c.sections.length) {
      morceaux.push('Sections attendues, dans cet ordre : ' + c.sections.join(', ') + '.');
    }

    // Cette dernière ligne réduit beaucoup les réponses hors sujet :
    // on rappelle le format juste avant que le modèle ne commence à écrire.
    morceaux.push('Réponds uniquement par le code HTML complet de la page.');

    return morceaux.join('\n');
  }

  /**
   * extraireHtml() — nettoie la réponse du modèle.
   *
   * Le modèle répond souvent : « Voici votre page : ```html ... ``` Bonne journée ! »
   * Cette fonction jette tout ce qui n'est pas la page.
   *
   * Ce genre de fonction représente une part énorme du code « IA » réel :
   * nettoyer, vérifier, cadrer une sortie qui n'est jamais tout à fait
   * celle qu'on a demandée.
   *
   * @param {string} reponseDuModele
   * @returns {string} du HTML, ou une chaîne vide si rien d'exploitable.
   */
  function extraireHtml(reponseDuModele) {
    let texte = String(reponseDuModele || '').trim();

    // Cas 1 : le code est entouré de trois accents graves.
    // [\s\S] veut dire « n'importe quel caractère, saut de ligne compris ».
    const bloc = texte.match(/```(?:html)?\s*([\s\S]*?)```/);
    if (bloc) {
      texte = bloc[1].trim();
    }

    // Cas 2 : une phrase traîne avant le <!DOCTYPE.
    const position = texte.toLowerCase().indexOf('<!doctype');
    if (position > 0) {
      texte = texte.slice(position);
    }

    // Cas 3 : rien ne ressemble à du HTML. On préfère renvoyer une chaîne vide
    // plutôt qu'un texte quelconque que l'appelant écrirait dans un fichier .html.
    if (texte.toLowerCase().indexOf('<html') === -1) {
      return '';
    }

    return texte;
  }

  /**
   * verifierPage() — contrôle qualité de la page reçue.
   *
   * Pourquoi vérifier ? Parce que le modèle « oublie » régulièrement une
   * contrainte, même écrite en majuscules. Mesurer les oublis, c'est
   * la seule façon de savoir si un prompt s'améliore ou se dégrade.
   *
   * @param {string} html
   * @returns {{valide:boolean, problemes:string[], points:number}}
   */
  function verifierPage(html) {
    const problemes = [];
    const bas = String(html || '').toLowerCase();

    if (bas.indexOf('<!doctype') === -1) problemes.push('Il manque la déclaration <!DOCTYPE html>.');
    if (bas.indexOf('lang="fr"') === -1) problemes.push('L\'attribut lang="fr" est absent.');
    if (bas.indexOf('<meta charset') === -1) problemes.push('L\'encodage <meta charset> n\'est pas déclaré.');
    if (bas.indexOf('viewport') === -1) problemes.push('La balise viewport manque : la page ne s\'adaptera pas au mobile.');
    if (bas.indexOf('<style') === -1) problemes.push('Aucun CSS intégré : la page sera nue.');
    if (bas.indexOf('http://') !== -1 || bas.indexOf('https://') !== -1) {
      problemes.push('La page appelle une ressource distante alors qu\'on l\'a interdit.');
    }
    if (bas.indexOf('</html>') === -1) problemes.push('La page est tronquée : </html> est absent.');

    // Sept contrôles au total : le score est le nombre de contrôles réussis.
    const total = 7;
    return {
      valide: problemes.length === 0,
      problemes: problemes,
      points: total - problemes.length
    };
  }

  /**
   * genererPage() — la fonction principale.
   *
   * @param {string} description
   * @param {Object} [contraintes]
   * @returns {Promise<{succes:boolean, html:string, controle:Object, prompt:string, erreur?:string}>}
   *
   * Elle ne lance JAMAIS d'erreur : elle renvoie un objet qui décrit ce qui
   * s'est passé. Une interface peut alors afficher un message propre au lieu
   * de planter. C'est un choix de conception, pas une règle absolue.
   */
  async function genererPage(description, contraintes) {
    const prompt = construirePrompt(description, contraintes);

    try {
      const reponse = await LLM.demander(prompt, {
        systeme: MESSAGE_SYSTEME,
        // Une température basse : on veut du code correct, pas de la poésie.
        temperature: 0.4
      });

      const html = extraireHtml(reponse);

      if (!html) {
        return {
          succes: false,
          html: '',
          prompt: prompt,
          controle: { valide: false, problemes: ['Aucun HTML trouvé dans la réponse.'], points: 0 },
          erreur: 'Le modèle n\'a pas renvoyé de page. Réponse brute : ' + reponse.slice(0, 200)
        };
      }

      return {
        succes: true,
        html: html,
        prompt: prompt,
        controle: verifierPage(html)
      };

    } catch (erreur) {
      // Une panne réseau, une clé invalide, un quota dépassé…
      return {
        succes: false,
        html: '',
        prompt: prompt,
        controle: { valide: false, problemes: [], points: 0 },
        erreur: erreur.message
      };
    }
  }

  /**
   * genererPlusieursVariantes() — produit N pages pour la même demande.
   *
   * Deux façons de faire :
   *   - en série : simple, lent (N appels l'un après l'autre) ;
   *   - en parallèle : rapide, mais N appels simultanés peuvent déclencher
   *     une limite de débit chez le fournisseur.
   * On choisit le parallèle avec Promise.all(), en gardant la remarque en tête.
   *
   * @param {string} description
   * @param {number} nombre
   * @param {Object} [contraintes]
   * @returns {Promise<Array>}
   */
  async function genererPlusieursVariantes(description, nombre, contraintes) {
    const combien = Math.max(1, Math.min(nombre || 3, 5));   // garde-fou : 5 maximum

    const travaux = [];
    for (let i = 0; i < combien; i++) {
      // On fait varier légèrement le prompt pour ne pas obtenir trois fois
      // la même page : c'est le rôle du numéro de variante.
      travaux.push(genererPage(description + ' (variante ' + (i + 1) + ', style différent)', contraintes));
    }

    // Promise.all attend que TOUS les appels soient terminés.
    return Promise.all(travaux);
  }

  const api = {
    MESSAGE_SYSTEME: MESSAGE_SYSTEME,
    construirePrompt: construirePrompt,
    extraireHtml: extraireHtml,
    verifierPage: verifierPage,
    genererPage: genererPage,
    genererPlusieursVariantes: genererPlusieursVariantes
  };

  racine.GenerateurPages = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
