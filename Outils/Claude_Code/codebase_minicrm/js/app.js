/**
 * app.js — le chef d'orchestre.
 * ---------------------------------------------------------------------------
 * Il relie l'interface (index.html) aux trois couches métier :
 *   modele.js         valider et normaliser
 *   depot.js          ranger et retrouver
 *   statistiques.js   compter
 *   vue.js            afficher
 *
 * Ce fichier ne calcule rien lui-même. S'il se met à contenir des règles
 * métier, c'est le signal qu'il faut les déplacer dans modele.js.
 * ---------------------------------------------------------------------------
 */

(function () {
  'use strict';

  // L'état de l'application, en un seul endroit. Quand l'état est éparpillé
  // dans le DOM, on ne sait plus jamais ce qui est vrai.
  const etat = {
    depot: new Depot([]),
    filtres: { recherche: '', statut: '', source: '' },
    tri: { champ: 'nom', croissant: true },
    idEnEdition: null
  };

  const el = function (id) { return document.getElementById(id); };

  /* ====================================================================
   * Démarrage
   * ==================================================================*/

  function demarrer() {
    // On tente de recharger les données de la session précédente.
    // Si rien n'est stocké, on part du jeu de démonstration.
    if (!etat.depot.charger() || etat.depot.compter() === 0) {
      CONTACTS_DEMO.forEach(function (c) { etat.depot.ajouter(c); });
    }

    remplirListesDeroulantes();
    brancherLesEvenements();
    rafraichir();
  }

  /** Remplit les <select> à partir des constantes du modèle : une seule source de vérité. */
  function remplirListesDeroulantes() {
    const ajouter = function (select, valeurs, libelleVide) {
      select.innerHTML = '<option value="">' + libelleVide + '</option>'
        + valeurs.map(function (v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
    };

    ajouter(el('filtre-statut'), Modele.STATUTS, 'Tous les statuts');
    ajouter(el('filtre-source'), Modele.SOURCES, 'Toutes les sources');

    // Dans le formulaire, pas d'option vide : un contact a toujours un statut.
    el('champ-statut').innerHTML = Modele.STATUTS
      .map(function (v) { return '<option value="' + v + '">' + Vue.LIBELLES_STATUT[v] + '</option>'; })
      .join('');
    el('champ-source').innerHTML = Modele.SOURCES
      .map(function (v) { return '<option value="' + v + '">' + v + '</option>'; }).join('');
  }

  /* ====================================================================
   * Affichage
   * ==================================================================*/

  /** Recalcule tout et redessine la page. */
  function rafraichir() {
    const tous = etat.depot.tous();
    const filtres = etat.depot.filtrer(etat.filtres);
    const tries = etat.depot.trier(filtres, etat.tri.champ, etat.tri.croissant);

    // Les indicateurs portent sur TOUTE la base, pas sur le filtre en cours :
    // sinon le chiffre d'affaires changerait quand on tape dans la recherche,
    // ce qui n'a aucun sens.
    el('resume').innerHTML = Vue.cartesResume(Statistiques.resume(tous));
    el('liste').innerHTML = Vue.tableauContacts(tries);
    el('sources').innerHTML = Vue.tableauSources(Statistiques.parSource(tous));
    el('dormants').innerHTML = Vue.listeDormants(Statistiques.contactsDormants(tous, 90));

    el('compteur').textContent = tries.length + ' contact(s) affiché(s) sur ' + tous.length;
  }

  /* ====================================================================
   * Événements
   * ==================================================================*/

  function brancherLesEvenements() {

    // --- Les filtres ---
    el('filtre-recherche').addEventListener('input', function () {
      etat.filtres.recherche = this.value;
      rafraichir();
    });
    el('filtre-statut').addEventListener('change', function () {
      etat.filtres.statut = this.value;
      rafraichir();
    });
    el('filtre-source').addEventListener('change', function () {
      etat.filtres.source = this.value;
      rafraichir();
    });

    // --- Le tri, et les actions du tableau ---
    // On écoute UN seul clic sur le conteneur plutôt que sur chaque bouton :
    // c'est la « délégation d'événements ». Sans elle, il faudrait rebrancher
    // tous les écouteurs à chaque redessin du tableau.
    el('liste').addEventListener('click', function (evenement) {

      const enTete = evenement.target.closest('th[data-tri]');
      if (enTete) {
        const champ = enTete.dataset.tri;
        // Recliquer sur la même colonne inverse le sens : comportement attendu partout.
        etat.tri.croissant = (etat.tri.champ === champ) ? !etat.tri.croissant : true;
        etat.tri.champ = champ;
        return rafraichir();
      }

      const bouton = evenement.target.closest('button[data-action]');
      if (!bouton) return;

      const id = bouton.closest('tr').dataset.id;

      if (bouton.dataset.action === 'modifier') return ouvrirFormulaire(id);
      if (bouton.dataset.action === 'supprimer') return supprimerContact(id);
    });

    // --- Le formulaire ---
    el('btn-nouveau').addEventListener('click', function () { ouvrirFormulaire(null); });
    el('btn-annuler').addEventListener('click', fermerFormulaire);
    el('formulaire').addEventListener('submit', enregistrerContact);

    // --- L'export ---
    el('btn-export').addEventListener('click', exporterCsv);
  }

  /* ====================================================================
   * Actions
   * ==================================================================*/

  /**
   * ouvrirFormulaire() — en création (id null) ou en modification.
   * @param {string|null} id
   */
  function ouvrirFormulaire(id) {
    etat.idEnEdition = id;

    const contact = id ? etat.depot.parId(id) : null;

    el('titre-formulaire').textContent = contact ? 'Modifier le contact' : 'Nouveau contact';
    el('champ-nom').value = contact ? contact.nom : '';
    el('champ-email').value = contact ? contact.email : '';
    el('champ-entreprise').value = contact ? contact.entreprise : '';
    el('champ-statut').value = contact ? contact.statut : 'prospect';
    el('champ-source').value = contact ? contact.source : 'inconnue';
    el('champ-montant').value = contact ? contact.montant : '';
    el('champ-dateContact').value = contact ? contact.dateContact : Modele.normaliserDate(null);
    el('champ-notes').value = contact ? contact.notes : '';

    Vue.afficherErreurs({});          // on repart d'un formulaire propre
    el('panneau-formulaire').hidden = false;
    el('champ-nom').focus();
  }

  function fermerFormulaire() {
    el('panneau-formulaire').hidden = true;
    etat.idEnEdition = null;
  }

  /**
   * enregistrerContact() — création ou mise à jour.
   * @param {Event} evenement
   */
  function enregistrerContact(evenement) {
    // Sans cette ligne, le navigateur recharge la page et tout est perdu.
    evenement.preventDefault();

    const saisie = {
      nom: el('champ-nom').value,
      email: el('champ-email').value,
      entreprise: el('champ-entreprise').value,
      statut: el('champ-statut').value,
      source: el('champ-source').value,
      montant: el('champ-montant').value,
      dateContact: el('champ-dateContact').value,
      notes: el('champ-notes').value
    };

    const resultat = etat.idEnEdition
      ? etat.depot.modifier(etat.idEnEdition, saisie)
      : etat.depot.ajouter(saisie);

    if (!resultat.succes) {
      // On reste sur le formulaire et on montre TOUTES les erreurs d'un coup.
      return Vue.afficherErreurs(resultat.erreurs);
    }

    fermerFormulaire();
    rafraichir();
    annoncer(etat.idEnEdition ? 'Contact modifié.' : 'Contact ajouté.');
  }

  /** Supprime un contact, après confirmation. */
  function supprimerContact(id) {
    const contact = etat.depot.parId(id);
    if (!contact) return;

    // Une suppression est irréversible : on demande toujours.
    if (!confirm('Supprimer définitivement « ' + contact.nom + ' » ?')) return;

    etat.depot.supprimer(id);
    rafraichir();
    annoncer('Contact supprimé.');
  }

  /** Télécharge la base au format CSV. */
  function exporterCsv() {
    const csv = etat.depot.exporterCsv();

    // On fabrique un fichier en mémoire, puis un lien vers ce fichier,
    // et on clique dessus à la place de l'utilisateur.
    // Le BOM ﻿ en tête est ce qui évite les accents cassés dans Excel.
    const fichier = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const lien = document.createElement('a');

    lien.href = URL.createObjectURL(fichier);
    lien.download = 'contacts-' + Modele.normaliserDate(null) + '.csv';
    lien.click();

    // On libère la mémoire : sans cela, le fichier reste en RAM
    // jusqu'à la fermeture de l'onglet.
    URL.revokeObjectURL(lien.href);
    annoncer('Export CSV téléchargé.');
  }

  /** Affiche un message temporaire en bas de page. */
  function annoncer(message) {
    const zone = el('annonce');
    zone.textContent = message;
    zone.hidden = false;
    // clearTimeout évite que deux messages successifs se marchent dessus.
    clearTimeout(annoncer.minuteur);
    annoncer.minuteur = setTimeout(function () { zone.hidden = true; }, 2600);
  }

  // On attend que le HTML soit lu avant de chercher des éléments dedans.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', demarrer);
  } else {
    demarrer();
  }

})();
