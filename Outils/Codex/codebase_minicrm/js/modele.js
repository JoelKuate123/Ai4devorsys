/**
 * modele.js — les règles métier de MiniCRM.
 * ---------------------------------------------------------------------------
 * Ce fichier ne connaît ni le navigateur, ni le stockage, ni l'affichage.
 * Il ne fait qu'une chose : dire ce qu'est un contact VALIDE.
 *
 * C'est le fichier le plus important à faire relire par un assistant IA :
 * une règle métier fausse coûte beaucoup plus cher qu'un bouton mal placé.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  /** Les seuls statuts autorisés. Une liste fermée : rien d'autre ne passe. */
  const STATUTS = ['prospect', 'client', 'inactif'];

  /** Les seules sources d'acquisition connues. */
  const SOURCES = ['site-web', 'salon', 'recommandation', 'prospection', 'inconnue'];

  /**
   * emailValide() — vérifie qu'une adresse a une forme plausible.
   *
   * Attention : « plausible » n'est pas « existante ». Aucune expression
   * régulière ne prouve qu'une adresse reçoit du courrier ; seule une
   * confirmation par courriel le fait. On refuse donc l'évidemment faux,
   * et on s'arrête là.
   *
   * @param {string} adresse
   * @returns {boolean}
   */
  function emailValide(adresse) {
    if (typeof adresse !== 'string') return false;

    const propre = adresse.trim();

    // Règles volontairement simples et lisibles :
    //  - quelque chose, puis @, puis quelque chose, puis un point, puis 2 lettres au moins
    //  - aucun espace, un seul @
    if (propre.indexOf(' ') !== -1) return false;
    if ((propre.match(/@/g) || []).length !== 1) return false;

    return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(propre);
  }

  /**
   * normaliserContact() — met un contact en forme canonique.
   *
   * Pourquoi normaliser AVANT de valider ? Parce que « Marie DUPONT » et
   * «  marie dupont  » désignent la même personne, et qu'une base qui
   * contient les deux est une base fausse.
   *
   * @param {Object} brut  Ce que l'utilisateur a saisi.
   * @returns {Object}     Un nouvel objet, l'entrée n'est pas modifiée.
   */
  function normaliserContact(brut) {
    const source = brut || {};

    return {
      id: source.id || genererId(),
      // trim() enlève les espaces autour ; on ne touche pas à la casse du nom,
      // parce que « van der Berg » et « McDonald » ne se mettent pas en Majuscule.
      nom: String(source.nom || '').trim().replace(/\s+/g, ' '),
      // L'e-mail, lui, est insensible à la casse par définition (RFC 5321).
      email: String(source.email || '').trim().toLowerCase(),
      entreprise: String(source.entreprise || '').trim(),
      statut: STATUTS.indexOf(source.statut) !== -1 ? source.statut : 'prospect',
      source: SOURCES.indexOf(source.source) !== -1 ? source.source : 'inconnue',
      // Number() sur une chaîne vide donne 0, ce qui est le comportement voulu.
      montant: arrondiCentimes(Number(source.montant) || 0),
      dateContact: normaliserDate(source.dateContact),
      notes: String(source.notes || '').trim()
    };
  }

  /**
   * validerContact() — dit si un contact peut entrer dans la base.
   *
   * On renvoie la LISTE des problèmes, pas un simple true/false :
   * l'utilisateur doit pouvoir corriger tout d'un coup, pas erreur par erreur.
   *
   * @param {Object} contact  De préférence déjà normalisé.
   * @returns {{valide:boolean, erreurs:Object}}  erreurs : { champ: message }
   */
  function validerContact(contact) {
    const c = contact || {};
    const erreurs = {};

    if (!c.nom || c.nom.length < 2) {
      erreurs.nom = 'Le nom doit contenir au moins deux caractères.';
    } else if (c.nom.length > 80) {
      erreurs.nom = 'Le nom ne peut pas dépasser 80 caractères.';
    }

    if (!c.email) {
      erreurs.email = 'L\'adresse e-mail est obligatoire.';
    } else if (!emailValide(c.email)) {
      erreurs.email = 'Cette adresse e-mail n\'a pas une forme valide.';
    }

    if (STATUTS.indexOf(c.statut) === -1) {
      erreurs.statut = 'Statut inconnu : ' + c.statut + '.';
    }

    if (typeof c.montant !== 'number' || isNaN(c.montant)) {
      erreurs.montant = 'Le montant doit être un nombre.';
    } else if (c.montant < 0) {
      erreurs.montant = 'Le montant ne peut pas être négatif.';
    }

    if (c.dateContact && !dateValide(c.dateContact)) {
      erreurs.dateContact = 'La date doit être au format AAAA-MM-JJ.';
    }

    return {
      valide: Object.keys(erreurs).length === 0,
      erreurs: erreurs
    };
  }

  /**
   * genererId() — un identifiant unique, sans dépendance.
   *
   * On combine l'horodatage et un tirage aléatoire : deux contacts créés
   * dans la même milliseconde n'auront pas le même identifiant.
   */
  function genererId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** Vérifie une date au format AAAA-MM-JJ, et son existence réelle. */
  function dateValide(texte) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(texte))) return false;

    // Le 31 février passe l'expression régulière mais n'existe pas :
    // on le vérifie en reconstruisant la date.
    const [a, m, j] = String(texte).split('-').map(Number);
    const d = new Date(a, m - 1, j);
    return d.getFullYear() === a && d.getMonth() === m - 1 && d.getDate() === j;
  }

  /** Ramène une date à AAAA-MM-JJ, ou renvoie la date du jour si elle est absente. */
  function normaliserDate(valeur) {
    if (dateValide(valeur)) return valeur;

    const d = new Date();
    // padStart(2, '0') transforme « 3 » en « 03 ».
    return d.getFullYear() + '-'
         + String(d.getMonth() + 1).padStart(2, '0') + '-'
         + String(d.getDate()).padStart(2, '0');
  }

  /**
   * arrondiCentimes() — évite les 19.999999999999998 de la virgule flottante.
   * Toute application qui manipule de l'argent a besoin de cette fonction.
   */
  function arrondiCentimes(valeur) {
    return Math.floor(valeur * 100) / 100;
  }

  /** Met un montant en forme française : 1 250,50 €. */
  function formaterMontant(valeur) {
    return new Intl.NumberFormat('fr-BE', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2
    }).format(Number(valeur) || 0);
  }

  /** Met une date AAAA-MM-JJ en forme française : 12/05/2026. */
  function formaterDate(texte) {
    if (!dateValide(texte)) return '—';
    const [a, m, j] = String(texte).split('-');
    return j + '/' + m + '/' + a;
  }

  const api = {
    STATUTS: STATUTS,
    SOURCES: SOURCES,
    emailValide: emailValide,
    normaliserContact: normaliserContact,
    validerContact: validerContact,
    genererId: genererId,
    dateValide: dateValide,
    normaliserDate: normaliserDate,
    arrondiCentimes: arrondiCentimes,
    formaterMontant: formaterMontant,
    formaterDate: formaterDate
  };

  racine.Modele = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
