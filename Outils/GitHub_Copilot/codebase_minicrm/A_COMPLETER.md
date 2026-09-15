# Les quatre fonctions à compléter

Elles sont toutes dans `js/statistiques.js`, marquées `// TODO`.
Leur JSDoc énonce les règles ; les tests de `tests/statistiques.test.js`
les énoncent plus précisément encore.

Faites-les **dans cet ordre** : la difficulté monte, et chacune prépare
la suivante.

---

## 1 · `meilleursClients(contacts, combien)`
*La plus simple : filtrer, trier, couper.*

Le piège : un prospect à 50 000 € ne doit **pas** apparaître dans le
classement des clients. C'est une estimation, pas un revenu.

**Testez la complétion en ligne.** Placez le curseur après le `// TODO`,
attendez la proposition grise, lisez-la avant d'appuyer sur `Tab`.
Puis `Alt+]` pour voir la proposition suivante : elles diffèrent.

---

## 2 · `contactsDormants(contacts, jours, aujourdhui)`
*La plus utile : c'est elle qui justifie l'existence d'un CRM.*

Trois pièges :

- un contact `inactif` est exclu — il a dit non, on n'insiste pas ;
- une date invalide est exclue, pas traitée comme « très ancienne » ;
- le paramètre `aujourdhui` existe pour rendre la fonction **testable**.
  Une fonction qui appelle `new Date()` sans échappatoire donne un résultat
  différent demain, et son test devient un test qui ment.

**Testez le chat en ligne** : `Ctrl+I`, puis
*implémente cette fonction en suivant sa JSDoc et les tests*.

---

## 3 · `parMois(contacts)`
*Le regroupement.*

Le mois se lit sur les sept premiers caractères de `dateContact` :
`'2026-05-12'.slice(0, 7)` donne `'2026-05'`.

Le format `AAAA-MM` se trie correctement **comme du texte** : c'est
exactement pour cela que les dates s'écrivent dans cet ordre.

**Testez le mode Edits** (`Ctrl+Shift+I`) : demandez la fonction *et* une
ligne dans `js/app.js` qui l'utilise. Deux fichiers, une seule demande.

---

## 4 · `parSource(contacts)`
*La plus complète : compter, sommer, calculer un taux, filtrer, trier.*

Quatre pièges :

- `chiffreAffaires` n'additionne que les montants des **clients** ;
- une source sans aucun contact ne doit **pas** apparaître ;
- `tauxConversion` est un pourcentage à **une décimale** ;
- le tri va du plus rentable au moins rentable.

**Testez le mode agent** : décrivez le besoin, laissez faire, puis relisez
tout le diff avant d'accepter. C'est la relecture qui compte, pas la génération.

---

## Après chaque fonction

```bash
node run-tests.js
```

À la fin : **90 tests au vert**, et le tableau de bord de `index.html`
affiche enfin ses quatre sections.

Puis, dans le chat : `/relire` — avant de considérer le travail terminé.
