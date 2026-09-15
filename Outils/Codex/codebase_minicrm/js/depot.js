/**
 * depot.js — le stockage des contacts.
 * ---------------------------------------------------------------------------
 * Un « dépôt » (repository) est la couche qui range et retrouve les données.
 * On l'isole pour une raison simple : le jour où l'on passe d'un tableau en
 * mémoire à une vraie base de données, SEUL ce fichier change.
 *
 * Ici, le stockage est un tableau en mémoire, sauvegardé dans le navigateur
 * quand c'est possible. Tout est enveloppé dans try/catch : la page doit
 * fonctionner même si le navigateur refuse le stockage.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const Modele = racine.Modele || require('./modele.js');

  /** La clé sous laquelle on range les données dans le navigateur. */
  const CLE_STOCKAGE = 'minicrm::contacts';

  class Depot {

    /**
     * @param {Array} [contactsInitiaux]  Des contacts pour démarrer.
     */
    constructor(contactsInitiaux) {
      // On normalise dès l'entrée : ainsi le reste du code n'a jamais
      // à se demander si un champ est absent ou mal formé.
      this.contacts = (contactsInitiaux || []).map(Modele.normaliserContact);
    }

    /** Renvoie une COPIE de la liste : personne ne modifie le dépôt de l'extérieur. */
    tous() {
      return this.contacts.slice();
    }

    /** @returns {number} le nombre de contacts. */
    compter() {
      return this.contacts.length;
    }

    /**
     * parId() — retrouve un contact.
     * @returns {Object|null} null si l'identifiant n'existe pas.
     */
    parId(id) {
      return this.contacts.find(function (c) { return c.id === id; }) || null;
    }

    /**
     * ajouter() — ajoute un contact après validation.
     *
     * @param {Object} brut
     * @returns {{succes:boolean, contact?:Object, erreurs?:Object}}
     */
    ajouter(brut) {
      const contact = Modele.normaliserContact(brut);
      const controle = Modele.validerContact(contact);

      if (!controle.valide) {
        return { succes: false, erreurs: controle.erreurs };
      }

      // Règle métier : deux contacts ne peuvent pas partager la même adresse.
      // Sans ce contrôle, la base se remplit de doublons en quelques semaines.
      if (this.parEmail(contact.email)) {
        return { succes: false, erreurs: { email: 'Cette adresse est déjà dans la base.' } };
      }

      this.contacts.push(contact);
      this.sauvegarder();

      return { succes: true, contact: contact };
    }

    /** Retrouve un contact par son adresse e-mail. */
    parEmail(email) {
      const cible = String(email || '').trim().toLowerCase();
      return this.contacts.find(function (c) { return c.email === cible; }) || null;
    }

    /**
     * modifier() — met à jour un contact existant.
     *
     * @param {string} id
     * @param {Object} changements  Seuls les champs fournis sont modifiés.
     * @returns {{succes:boolean, contact?:Object, erreurs?:Object}}
     */
    modifier(id, changements) {
      const index = this.contacts.findIndex(function (c) { return c.id === id; });
      if (index === -1) {
        return { succes: false, erreurs: { id: 'Contact introuvable : ' + id } };
      }

      // Object.assign fusionne : l'existant d'abord, les changements par-dessus.
      // On force l'id : personne ne doit pouvoir le changer par ce chemin.
      const fusion = Object.assign({}, this.contacts[index], changements, { id: id });
      const contact = Modele.normaliserContact(fusion);
      const controle = Modele.validerContact(contact);

      if (!controle.valide) {
        return { succes: false, erreurs: controle.erreurs };
      }

      const homonyme = this.parEmail(contact.email);
      if (homonyme) {
        return { succes: false, erreurs: { email: 'Cette adresse est déjà dans la base.' } };
      }

      this.contacts[index] = contact;
      this.sauvegarder();

      return { succes: true, contact: contact };
    }

    /**
     * supprimer() — retire un contact.
     * @returns {boolean} true si quelque chose a été supprimé.
     */
    supprimer(id) {
      const avant = this.contacts.length;
      this.contacts = this.contacts.filter(function (c) { return c.id !== id; });

      const aSupprime = this.contacts.length < avant;
      if (aSupprime) this.sauvegarder();

      return aSupprime;
    }

    /**
     * chercher() — recherche libre sur le nom, l'e-mail, l'entreprise et les notes.
     *
     * @param {string} texte
     * @returns {Array} la liste des contacts correspondants.
     */
    chercher(texte) {
      const terme = String(texte || '').trim().toLowerCase();
      if (!terme) return this.tous();

      return this.contacts.filter(function (c) {
        return c.nom.toLowerCase().indexOf(terme) !== -1
            || c.email.indexOf(terme) !== -1
            || c.entreprise.toLowerCase().indexOf(terme) !== -1
            || c.notes.toLowerCase().indexOf(terme) !== -1;
      });
    }

    /**
     * filtrer() — applique plusieurs critères d'un coup.
     *
     * @param {Object} criteres
     * @param {string} [criteres.statut]
     * @param {string} [criteres.source]
     * @param {number} [criteres.montantMinimum]
     * @param {string} [criteres.recherche]
     * @returns {Array}
     */
    filtrer(criteres) {
      const f = criteres || {};
      let resultat = f.recherche ? this.chercher(f.recherche) : this.tous();

      if (f.statut) {
        resultat = resultat.filter(function (c) { return c.statut === f.statut; });
      }
      if (f.source) {
        resultat = resultat.filter(function (c) { return c.source === f.source; });
      }
      if (typeof f.montantMinimum === 'number') {
        resultat = resultat.filter(function (c) { return c.montant >= f.montantMinimum; });
      }

      return resultat;
    }

    /**
     * trier() — renvoie une liste triée, sans modifier l'originale.
     *
     * @param {Array} liste
     * @param {string} champ       'nom', 'entreprise', 'montant', 'dateContact'
     * @param {boolean} [croissant=true]
     * @returns {Array}
     */
    trier(liste, champ, croissant) {
      const sens = croissant === false ? -1 : 1;

      // slice() copie la liste : trier sur place surprendrait l'appelant.
      return liste.slice().sort(function (a, b) {
        const va = a[champ];
        const vb = b[champ];

        return String(va).localeCompare(String(vb), 'fr') * sens;
      });
    }

    /**
     * sauvegarder() — écrit dans le stockage du navigateur, si possible.
     *
     * Tout est dans un try/catch : le stockage peut être indisponible
     * (navigation privée, données de site bloquées, fichier local bridé).
     * Une application qui plante dans ce cas est une application mal écrite.
     */
    sauvegarder() {
      try {
        if (typeof localStorage === 'undefined') return false;
        localStorage.setItem(CLE_STOCKAGE, JSON.stringify(this.contacts));
        return true;
      } catch (erreur) {
        return false;
      }
    }

    /**
     * charger() — relit le stockage du navigateur.
     * @returns {boolean} true si des données ont été retrouvées.
     */
    charger() {
      try {
        if (typeof localStorage === 'undefined') return false;

        const brut = localStorage.getItem(CLE_STOCKAGE);
        if (!brut) return false;

        const liste = JSON.parse(brut);
        if (!Array.isArray(liste)) return false;

        this.contacts = liste.map(Modele.normaliserContact);
        return true;
      } catch (erreur) {
        // Données corrompues : on repart d'une base propre plutôt que de planter.
        return false;
      }
    }

    /** Vide le dépôt et le stockage. */
    vider() {
      this.contacts = [];
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(CLE_STOCKAGE);
      } catch (erreur) { /* stockage indisponible : sans importance ici */ }
    }

    /** Exporte en CSV, avec l'échappement qui va bien. */
    exporterCsv() {
      const colonnes = ['nom', 'email', 'entreprise', 'statut', 'source', 'montant', 'dateContact'];
      const lignes = [colonnes.join(',')];

      this.contacts.forEach(function (c) {
        lignes.push(colonnes.map(function (col) {
          const valeur = String(c[col]);
          // Un champ qui contient une virgule, un guillemet ou un saut de ligne
          // doit être entouré de guillemets, et ses guillemets doublés.
          // Oublier cette règle est LE bug classique de l'export CSV.
          return /[",\n]/.test(valeur) ? '"' + valeur + '"' : valeur;
        }).join(','));
      });

      return lignes.join('\n');
    }
  }

  const api = { Depot: Depot, CLE_STOCKAGE: CLE_STOCKAGE };

  racine.DepotModule = api;
  racine.Depot = Depot;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
