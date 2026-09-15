# MiniCRM — mémoire de projet

Ce fichier est lu **automatiquement** par Claude Code au démarrage de chaque
session, dans ce dossier. C'est la mémoire du projet : ce que l'assistant sait
sans qu'on ait à le lui redire.

> Écrivez-le comme une note à un nouveau collègue compétent : ce qu'il ne peut
> pas deviner en lisant le code. Ni un tutoriel, ni un README.
> Un bon `CLAUDE.md` tient en une page. Passé deux, il n'est plus lu attentivement.

---

## Ce qu'est ce projet

MiniCRM : un carnet de contacts clients. HTML, CSS et JavaScript standard,
**aucune dépendance, aucune étape de compilation**. On ouvre `index.html`,
ça marche.

C'est un support de formation : la lisibilité prime sur la concision.

## Architecture

Quatre couches, dans cet ordre de dépendance. Une couche ne connaît jamais
celle du dessus.

| Fichier | Rôle | Ne doit jamais |
|---|---|---|
| `js/modele.js` | Valider, normaliser, formater | toucher au DOM ni au stockage |
| `js/depot.js` | Ranger, retrouver, filtrer, trier | contenir une règle métier |
| `js/statistiques.js` | Calculer les chiffres du tableau de bord | avoir d'effet de bord |
| `js/vue.js` | Produire du HTML | calculer quoi que ce soit |
| `js/app.js` | Relier le tout aux événements | contenir une règle métier |

**Si `app.js` se met à contenir une règle métier, elle est au mauvais endroit :
elle appartient à `modele.js`.**

## Conventions

- **Tout est en français** : noms de variables, de fonctions, commentaires,
  messages d'erreur, textes de test. C'est délibéré, ne « normalisez » pas
  vers l'anglais.
- Fonctions et variables en `camelCase`, constantes en `MAJUSCULES_AVEC_TIRETS_BAS`.
- Chaque fonction publique a un bloc JSDoc avec `@param` et `@returns`.
- Deux espaces d'indentation, guillemets simples, point-virgule à la fin.
- Chaque fichier est enveloppé dans une IIFE et expose son API à la fin,
  pour le navigateur (`racine.X`) **et** pour Node (`module.exports`).
  Gardez les deux : les tests tournent dans les deux environnements.

## Règles métier — à ne pas casser

Ce sont des décisions du métier, pas des choix techniques. Elles ne se
devinent pas en lisant le code.

1. Seul un contact au statut **`client`** compte dans le chiffre d'affaires.
   Un prospect peut porter un montant : c'est une **estimation**, pas un revenu.
2. Un contact au statut `client` **doit** avoir un montant supérieur à zéro.
   Un client à 0 € est une erreur de saisie.
3. Deux contacts ne peuvent pas partager la même adresse e-mail.
   La comparaison est insensible à la casse.
4. Un contact **`inactif`** n'apparaît jamais dans la liste « à rappeler » :
   il a dit non, on n'insiste pas.
5. Les indicateurs du haut de page portent sur **toute la base**, jamais sur
   le filtre en cours. Sinon le chiffre d'affaires change quand on tape dans
   la recherche, ce qui n'a aucun sens.

## Tests

```bash
node run-tests.js        # 90 tests, dans un terminal
```
ou ouvrez `tests.html` dans un navigateur — aucune installation.

**Toute modification de `js/` doit laisser les 90 tests au vert.**
Un test qui gêne se corrige en discutant la règle, pas en le supprimant.

## Sécurité

- Tout texte venu de l'utilisateur passe par `Vue.echapper()` avant d'entrer
  dans du HTML. C'est la protection contre l'injection de script (XSS).
  **Ne construisez jamais du HTML avec une valeur non échappée.**
- `localStorage` est toujours enveloppé dans un `try/catch` : le stockage
  peut être refusé (navigation privée, fichier local bridé) et la page doit
  continuer de fonctionner.

## Ce qu'il ne faut pas faire ici

- Ajouter une dépendance npm, un bundler, TypeScript ou un framework.
  Le projet doit rester ouvrable par double-clic.
- Renommer les fonctions publiques : `index.html` et les tests s'y réfèrent.
- Utiliser `innerHTML` avec une valeur non échappée.
- Écrire des commentaires qui répètent le code. Un commentaire explique
  **pourquoi**, pas **quoi**.
