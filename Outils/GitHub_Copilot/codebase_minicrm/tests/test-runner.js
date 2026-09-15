/**
 * test-runner.js — un mini framework de test, écrit à la main.
 * ---------------------------------------------------------------------------
 * Pourquoi ne pas utiliser Jest ou Vitest ?
 * Parce qu'ils demandent Node, npm, une installation, un fichier de config...
 * Ici, tout tient dans un fichier. Vous pouvez lancer vos tests :
 *   - dans le navigateur : ouvrez tests/index.html (double-clic, rien à installer) ;
 *   - dans un terminal   : node run-tests.js (si Node est présent).
 *
 * Un framework de test, dans le fond, ce n'est que ça : une liste de fonctions
 * qu'on exécute, et un compteur de réussites. Lire ce fichier vous évitera
 * de considérer les tests comme une boîte noire magique.
 * ---------------------------------------------------------------------------
 */

// « globalThis » désigne l'objet global, quel que soit l'environnement :
// window dans un navigateur, global dans Node. On évite ainsi d'écrire
// deux versions du même fichier.
(function (racine) {
  'use strict';

  // La liste des tests enregistrés. Chaque entrée : { nom, fonction, groupe }
  const testsEnregistres = [];

  // Le groupe courant, alimenté par describe(). Sert uniquement à l'affichage.
  let groupeCourant = '(sans groupe)';

  /**
   * describe() — regroupe des tests qui parlent du même sujet.
   * @param {string} nom      Le titre du groupe, par exemple "validerContact".
   * @param {Function} corps  Une fonction qui contient les appels à test().
   */
  function describe(nom, corps) {
    const precedent = groupeCourant;   // on mémorise pour pouvoir imbriquer
    groupeCourant = nom;
    corps();                            // on exécute : cela remplit testsEnregistres
    groupeCourant = precedent;          // on restaure l'état d'avant
  }

  /**
   * test() — enregistre UN cas de test. Rien n'est exécuté à cet instant :
   * on se contente de mettre la fonction de côté pour plus tard.
   * @param {string} nom       Ce que le test vérifie, écrit en français.
   * @param {Function} corps   Le code du test. Il doit lancer une erreur s'il échoue.
   */
  function test(nom, corps) {
    testsEnregistres.push({ nom: nom, fonction: corps, groupe: groupeCourant });
  }

  /**
   * ErreurAssertion — notre type d'erreur maison.
   * Avoir un type dédié permet de distinguer « le test a échoué »
   * de « le code a planté pour une autre raison ».
   */
  class ErreurAssertion extends Error {
    constructor(message) {
      super(message);
      this.name = 'ErreurAssertion';
    }
  }

  /**
   * expect() — la fonction de vérification.
   * On l'écrit sous forme « fluide » : expect(x).aPourValeur(y).
   * @param {*} valeurObtenue  Ce que le code a réellement produit.
   */
  function expect(valeurObtenue) {
    return {

      /** Égalité stricte (===) : pour les nombres, chaînes, booléens. */
      aPourValeur(valeurAttendue) {
        if (valeurObtenue !== valeurAttendue) {
          throw new ErreurAssertion(
            'attendu ' + afficher(valeurAttendue) + ', obtenu ' + afficher(valeurObtenue)
          );
        }
      },

      /** Égalité de contenu : pour les objets et les tableaux. */
      ressembleA(valeurAttendue) {
        const a = JSON.stringify(valeurObtenue);
        const b = JSON.stringify(valeurAttendue);
        if (a !== b) {
          throw new ErreurAssertion('attendu ' + b + ', obtenu ' + a);
        }
      },

      /** Vérifie qu'une valeur est « vraie » au sens JavaScript. */
      estVrai() {
        if (!valeurObtenue) {
          throw new ErreurAssertion('attendu une valeur vraie, obtenu ' + afficher(valeurObtenue));
        }
      },

      /** Vérifie qu'une valeur est « fausse » (false, 0, '', null, undefined). */
      estFaux() {
        if (valeurObtenue) {
          throw new ErreurAssertion('attendu une valeur fausse, obtenu ' + afficher(valeurObtenue));
        }
      },

      /** Vérifie qu'un tableau ou une chaîne contient un élément. */
      contient(element) {
        const ok = typeof valeurObtenue === 'string'
          ? valeurObtenue.indexOf(element) !== -1
          : Array.isArray(valeurObtenue) && valeurObtenue.indexOf(element) !== -1;
        if (!ok) {
          throw new ErreurAssertion(afficher(valeurObtenue) + ' ne contient pas ' + afficher(element));
        }
      },

      /** Vérifie que la longueur d'un tableau ou d'une chaîne est celle attendue. */
      aPourLongueur(n) {
        const longueur = valeurObtenue == null ? -1 : valeurObtenue.length;
        if (longueur !== n) {
          throw new ErreurAssertion('attendu une longueur de ' + n + ', obtenu ' + longueur);
        }
      },

      /**
       * Vérifie qu'un appel lance bien une erreur.
       * Ici valeurObtenue doit être une FONCTION, pas son résultat :
       *   expect(() => diviser(1, 0)).lanceUneErreur();
       */
      lanceUneErreur(fragmentAttendu) {
        let aLance = false;
        let messageObtenu = '';
        try {
          valeurObtenue();
        } catch (erreur) {
          aLance = true;
          messageObtenu = String(erreur.message || erreur);
        }
        if (!aLance) {
          throw new ErreurAssertion('aucune erreur lancée alors qu\'on en attendait une');
        }
        if (fragmentAttendu && messageObtenu.indexOf(fragmentAttendu) === -1) {
          throw new ErreurAssertion(
            'le message "' + messageObtenu + '" ne contient pas "' + fragmentAttendu + '"'
          );
        }
      },

      /** Comparaison numérique, utile pour les scores de similarité. */
      estPlusGrandQue(seuil) {
        if (!(valeurObtenue > seuil)) {
          throw new ErreurAssertion(afficher(valeurObtenue) + ' n\'est pas > ' + seuil);
        }
      },

      /** Comparaison numérique tolérante, pour les calculs à virgule. */
      estProcheDe(valeurAttendue, tolerance) {
        const marge = tolerance === undefined ? 0.0001 : tolerance;
        if (Math.abs(valeurObtenue - valeurAttendue) > marge) {
          throw new ErreurAssertion(
            afficher(valeurObtenue) + ' n\'est pas proche de ' + valeurAttendue + ' (±' + marge + ')'
          );
        }
      }
    };
  }

  /** Petit utilitaire d'affichage : évite d'écrire [object Object] partout. */
  function afficher(valeur) {
    if (typeof valeur === 'string') return '"' + valeur + '"';
    try { return JSON.stringify(valeur); } catch (e) { return String(valeur); }
  }

  /**
   * lancerLesTests() — exécute tous les tests enregistrés et renvoie le bilan.
   *
   * La fonction est « async » parce qu'un test peut lui-même être asynchrone
   * (un appel à un modèle, par exemple). Le « await » ci-dessous attend la
   * fin d'un test asynchrone ; sur un test classique il ne coûte rien.
   *
   * @param {Function} ecrire  Fonction d'affichage (console.log ou écriture dans la page).
   * @returns {Promise<{total:number, reussis:number, echoues:number, details:Array}>}
   */
  async function lancerLesTests(ecrire) {
    const journal = ecrire || function (ligne) { console.log(ligne); };
    const details = [];
    let reussis = 0;
    let echoues = 0;
    let dernierGroupe = null;

    for (const cas of testsEnregistres) {
      // On n'affiche le titre du groupe qu'une fois, quand il change.
      if (cas.groupe !== dernierGroupe) {
        journal('\n' + cas.groupe);
        dernierGroupe = cas.groupe;
      }
      try {
        await cas.fonction();           // <-- le test s'exécute ici
        reussis++;
        journal('  OK   ' + cas.nom);
        details.push({ nom: cas.nom, groupe: cas.groupe, ok: true, message: '' });
      } catch (erreur) {
        echoues++;
        journal('  ECHEC ' + cas.nom + '\n         ' + erreur.message);
        details.push({ nom: cas.nom, groupe: cas.groupe, ok: false, message: erreur.message });
      }
    }

    journal('\n' + reussis + ' test(s) au vert, ' + echoues + ' en échec, ' +
            testsEnregistres.length + ' au total.');

    return {
      total: testsEnregistres.length,
      reussis: reussis,
      echoues: echoues,
      details: details
    };
  }

  /** Vide la liste : utile si l'on relance les tests sans recharger la page. */
  function reinitialiser() {
    testsEnregistres.length = 0;
  }

  // On expose les fonctions publiques. Deux systèmes de modules cohabitent
  // aujourd'hui en JavaScript ; on gère les deux pour que le fichier serve
  // dans le navigateur comme dans Node.
  const api = {
    describe: describe,
    test: test,
    expect: expect,
    lancerLesTests: lancerLesTests,
    reinitialiser: reinitialiser,
    ErreurAssertion: ErreurAssertion
  };

  racine.TestRunner = api;                                  // navigateur : window.TestRunner
  if (typeof module !== 'undefined' && module.exports) {    // Node : require('./test-runner.js')
    module.exports = api;
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);
