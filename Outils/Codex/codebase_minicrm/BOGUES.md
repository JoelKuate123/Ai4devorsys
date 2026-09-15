# Les défauts à corriger

`node run-tests.js` affiche **9 échecs sur 90 tests**. Ils viennent de
**six défauts** semés dans `js/`. Aucun test n'est faux : chaque échec
signale un vrai problème.

Ce fichier décrit les symptômes. Il ne dit **pas** où se trouve le code
fautif — c'est le travail de l'exercice, et c'est ce que Codex fait bien.

---

## 1 · Les montants perdent des centimes

`19,999 €` devient `19,99 €` au lieu de `20,00 €`. Sur un contact, personne
ne le voit. Sur trois mille lignes de facturation, l'écart se compte en
centaines d'euros, toujours dans le même sens.

*Indice : deux fonctions de `Math` se ressemblent beaucoup.*

---

## 2 · Un client à zéro euro est accepté

Le métier est formel : un contact au statut `client` a forcément un montant.
Un client à 0 €, c'est une saisie inachevée — et un chiffre d'affaires faux.

Le formulaire l'accepte pourtant sans broncher.

---

## 3 · On ne peut plus modifier un contact

Ouvrez un contact, changez seulement son montant, enregistrez : refus, au
motif que l'adresse e-mail existe déjà. Elle existe, en effet : c'est la sienne.

*C'est le défaut le plus visible en démonstration, et l'un des plus fréquents
en production.*

---

## 4 · Le tri par montant est absurde

Cliquez sur la colonne « Montant ». L'ordre obtenu :
`0`, `12750.5`, `8400`, `3000`.

Ce n'est pas un tri au hasard : c'est un tri parfaitement correct,
mais pas de nombres.

---

## 5 · L'export CSV casse sur certains noms

Un contact nommé `Marie "MD" Dupont` produit un fichier que le tableur
n'ouvre pas correctement : les colonnes se décalent à partir de cette ligne.

Les virgules, elles, sont bien gérées. Le problème est ailleurs.

---

## 6 · Le chiffre d'affaires est trop beau

Le tableau de bord annonce un chiffre d'affaires supérieur à la somme réelle
des contrats signés. Les prospects portent des montants — ce sont des
**estimations**, pas des revenus. Le tableau de bord les additionne quand même.

C'est le défaut le plus dangereux des six : il ne fait rien planter,
il rend une décision fausse.

---

## La méthode

Un défaut à la fois. Pour chacun :

```
/corriger-un-bogue le tri par montant
```

ou, en langage courant :

> Le test « trie les nombres, pas leur écriture » échoue. Explique-moi la
> cause avant de corriger, puis fais la modification la plus petite possible.

Puis, à chaque fois :

1. `node run-tests.js` — ce test passe, aucun autre ne casse ;
2. `/diff` — relisez ce qui a réellement changé ;
3. commit, une ligne, en français.

> **Ne demandez jamais « corrige tous les bogues ».** Vous obtiendrez un diff
> de deux cents lignes, un test modifié au passage, et vous n'aurez rien appris.
