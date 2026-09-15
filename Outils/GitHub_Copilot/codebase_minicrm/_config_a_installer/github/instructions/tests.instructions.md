---
applyTo: "tests/**/*.js"
---

# Écrire un test dans MiniCRM

Le framework est **maison** : `tests/test-runner.js`, deux cents lignes.
N'utilise ni Jest, ni Vitest, ni `assert` de Node.

## La syntaxe

```js
describe('nomDeLaFonction()', function () {
  test('décrit le comportement attendu, en français', function () {
    expect(resultat).aPourValeur(attendu);
  });
});
```

## Les vérifications disponibles

`aPourValeur` (===) · `ressembleA` (objets et tableaux) · `estVrai` · `estFaux`
`contient` · `aPourLongueur` · `lanceUneErreur` · `estPlusGrandQue` · `estProcheDe`

Il n'y en a pas d'autres. Si une vérification manque, ajoute-la au runner
plutôt que d'inventer une syntaxe.

## Ce qu'un bon test contient

Trois cas au minimum, et le nom du test dit le comportement, pas la mécanique.

- le cas **nominal** ;
- un cas **limite** : liste vide, valeur nulle, division par zéro, date invalide ;
- un cas **d'erreur** : ce qui doit être refusé, et pourquoi.

Un test nommé « test1 » ou « ça marche » est un test raté :
son nom doit se lire comme une phrase de spécification.
