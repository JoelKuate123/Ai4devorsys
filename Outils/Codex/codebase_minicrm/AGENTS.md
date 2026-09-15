# AGENTS.md — MiniCRM

`AGENTS.md` est le fichier de consignes lu automatiquement par Codex, et par
plusieurs autres agents de code. C'est une convention ouverte : le même fichier
sert à plusieurs outils, contrairement à un fichier propriétaire.

---

## Le projet

MiniCRM : un carnet de contacts clients. HTML, CSS et JavaScript standard.
**Aucune dépendance, aucune compilation.** On ouvre `index.html`, ça marche.

## L'état actuel : les tests sont au rouge

```bash
node run-tests.js
```

**9 tests échouent sur 90.** Ce n'est pas un accident : six défauts ont été
semés volontairement dans `js/`. Ils sont décrits dans `BOGUES.md`, sans
indiquer où ils se trouvent.

Aucun test n'est faux. Chaque échec signale un vrai défaut du code.

## Comment lancer les choses

```bash
node run-tests.js          # les 90 tests
node -e "require('./js/modele.js')"   # vérifier qu'un fichier se charge
```

Il n'y a rien d'autre à lancer : ni build, ni lint, ni serveur.

## La langue

Tout est en **français** : noms de variables, de fonctions, commentaires,
messages d'erreur, textes de test. Ne traduis pas vers l'anglais.

## L'architecture

Quatre couches. Une couche ne connaît jamais celle du dessus.

| Fichier | Rôle | Ne doit jamais |
|---|---|---|
| `js/modele.js` | Valider, normaliser, formater | toucher au DOM ni au stockage |
| `js/depot.js` | Ranger, retrouver, filtrer, trier | contenir une règle métier |
| `js/statistiques.js` | Calculer | avoir d'effet de bord |
| `js/vue.js` | Produire du HTML | calculer quoi que ce soit |
| `js/app.js` | Relier aux événements | contenir une règle métier |

## Les règles métier

Elles ne se devinent pas en lisant le code. Plusieurs des défauts semés
consistent justement à les avoir enfreintes.

1. Seul un contact au statut `client` compte dans le chiffre d'affaires.
   Un prospect peut porter un montant : c'est une estimation, pas un revenu.
2. Un `client` doit avoir un montant supérieur à zéro.
3. Deux contacts ne peuvent pas partager la même adresse e-mail (casse ignorée).
   Un contact qu'on modifie garde évidemment le droit à sa propre adresse.
4. Un contact `inactif` n'apparaît jamais dans la liste « à rappeler ».
5. Les indicateurs du haut de page portent sur toute la base, pas sur le filtre.

## Le style

- `camelCase` pour les fonctions et variables, `MAJUSCULES_AVEC_TIRETS_BAS` pour les constantes.
- Bloc JSDoc avec `@param` et `@returns` sur chaque fonction publique.
- Deux espaces d'indentation, guillemets simples, point-virgule final.
- Les commentaires expliquent **pourquoi**, jamais **quoi**.

## Interdits

- Ajouter une dépendance, TypeScript, un bundler ou un framework.
- **Modifier un test pour le faire passer.** C'est le raccourci qui rend
  une suite de tests inutile. Si un test te semble faux, dis-le, ne le corrige pas.
- Écrire dans du HTML une valeur non passée par `Vue.echapper()`.
- Corriger plusieurs défauts dans le même commit.

## La méthode attendue

Un défaut à la fois :

1. lance les tests, choisis **un** échec ;
2. explique la cause avant de toucher au code ;
3. corrige, avec la modification la plus petite possible ;
4. relance : ce test passe, aucun autre ne casse ;
5. commit, message en français, une ligne.
