# Instructions Copilot — MiniCRM

Ce fichier est lu automatiquement par GitHub Copilot dans ce dépôt,
pour **chaque** demande de chat et pour la complétion. Il n'y a rien à activer.

Gardez-le court. Des instructions longues sont diluées ; des instructions
contradictoires sont ignorées.

## Le projet

MiniCRM : un carnet de contacts clients. HTML, CSS et JavaScript standard.
**Aucune dépendance, aucune compilation.** On ouvre `index.html`, ça marche.

## La langue

Tout est en **français** : noms de variables, de fonctions, commentaires,
messages d'erreur, textes de test. C'est délibéré. Ne traduis pas vers
l'anglais, ne renomme pas `depot` en `repository`.

## L'architecture

Quatre couches. Une couche ne connaît jamais celle du dessus.

- `js/modele.js` — valider, normaliser, formater. Ne touche ni au DOM ni au stockage.
- `js/depot.js` — ranger, retrouver, filtrer, trier. Aucune règle métier.
- `js/statistiques.js` — calculer. Fonctions pures, aucun effet de bord.
- `js/vue.js` — produire du HTML. Ne calcule rien.
- `js/app.js` — relier le tout aux événements. Aucune règle métier.

## Le style

- `camelCase` pour les fonctions et variables, `MAJUSCULES_AVEC_TIRETS_BAS` pour les constantes.
- Bloc JSDoc avec `@param` et `@returns` sur chaque fonction publique.
- Deux espaces d'indentation, guillemets simples, point-virgule final.
- Les commentaires expliquent **pourquoi**, jamais **quoi**.

## Les règles métier

1. Seul un contact au statut `client` compte dans le chiffre d'affaires.
   Un prospect peut porter un montant : c'est une estimation, pas un revenu.
2. Un `client` doit avoir un montant supérieur à zéro.
3. Deux contacts ne peuvent pas partager la même adresse e-mail (casse ignorée).
4. Un contact `inactif` n'apparaît jamais dans la liste « à rappeler ».
5. Les indicateurs du haut de page portent sur toute la base, pas sur le filtre.

## Interdits

- Ajouter une dépendance npm, TypeScript, un bundler ou un framework.
- Écrire dans du HTML une valeur qui n'est pas passée par `Vue.echapper()`.
- Modifier un test pour le faire passer.
- Renommer une fonction publique : `index.html` et les tests s'y réfèrent.
