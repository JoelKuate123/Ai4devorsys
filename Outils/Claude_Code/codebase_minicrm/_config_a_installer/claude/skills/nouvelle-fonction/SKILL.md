---
name: nouvelle-fonction
description: Ajoute une fonction a MiniCRM en respectant l'architecture en couches et en ecrivant les tests d'abord. Utiliser quand on demande une nouvelle fonctionnalite metier.
argument-hint: [description de la fonctionnalite]
allowed-tools: Read Grep Glob Edit Write Bash(node run-tests.js)
---

Fonctionnalite demandee : $ARGUMENTS

## Methode imposee

Procede dans cet ordre, sans sauter d'etape.

1. **Choisis la couche.** Une regle metier va dans `js/modele.js`.
   Un acces aux donnees va dans `js/depot.js`. Un calcul va dans
   `js/statistiques.js`. Un affichage va dans `js/vue.js`.
   Annonce ton choix en une phrase avant de coder.

2. **Ecris les tests d'abord**, dans le fichier `tests/` correspondant.
   Au minimum : un cas nominal, un cas limite, un cas d'erreur.
   Lance `node run-tests.js` : ils doivent echouer, pour la bonne raison.

3. **Ecris la fonction.** Bloc JSDoc complet, commentaires en francais
   qui expliquent le POURQUOI. Deux espaces d'indentation.

4. **Relance les tests.** Les nouveaux passent, les 90 autres restent au vert.

5. **Branche l'interface** seulement si la demande le prevoit.

6. **Resume** en trois lignes : le fichier touche, la fonction ajoutee,
   le nombre de tests.

## Interdits

- Ajouter une dependance, un bundler ou un framework.
- Modifier un test existant pour le faire passer.
- Ecrire du HTML sans passer par `Vue.echapper()`.
