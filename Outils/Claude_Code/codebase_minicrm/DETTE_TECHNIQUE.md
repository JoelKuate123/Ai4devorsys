# Dette technique et travail restant

Ce fichier est le **carnet de commandes** des exercices Claude Code.
Rien n'est cassé ici : les 90 tests passent. Ce qui suit, ce sont des choses
qui fonctionnent mais qui sont mal faites, et des fonctionnalités manquantes.

C'est exactement la situation où un assistant agentique est le plus utile :
un projet qui marche, qu'il faut faire évoluer sans rien casser.

---

## A · Dette technique

### A1 — Le tri ne mémorise pas la colonne active
`js/vue.js` · `tableauContacts()`

L'en-tête ne montre pas quelle colonne sert au tri, ni dans quel sens.
L'utilisateur clique, quelque chose bouge, il ne sait pas quoi.

**Attendu :** une flèche ▲ / ▼ sur la colonne active. L'état est déjà dans
`etat.tri` (`js/app.js`) — il suffit de le passer à la vue.

---

### A2 — La recherche parcourt la base à chaque frappe
`js/app.js` · l'écouteur `input` de `#filtre-recherche`

Avec douze contacts, personne ne le voit. Avec cinq mille, la saisie devient
saccadée. Il manque un **anti-rebond** (debounce) de 200 ms.

**Attendu :** une fonction `antiRebond(fonction, delai)` réutilisable, testée.
Pas de bibliothèque : cinq lignes suffisent.

---

### A3 — `exporterCsv()` ne gère pas le retour à la ligne dans les notes
`js/depot.js` · `exporterCsv()`

Les virgules et les guillemets sont bien traités. Un saut de ligne dans le
champ `notes`, lui, casse le fichier — la ligne suivante devient une fausse
entrée. Le champ `notes` n'est d'ailleurs pas exporté du tout.

**Attendu :** exporter les notes, gérer les sauts de ligne, ajouter le test.

---

### A4 — Aucun message quand le stockage est refusé
`js/depot.js` · `sauvegarder()`

La méthode renvoie `false` quand le navigateur refuse le stockage, et
**personne ne lit ce `false`**. L'utilisateur travaille une heure, ferme
l'onglet, et tout est perdu sans avertissement.

**Attendu :** `app.js` vérifie le retour et affiche un avertissement, une
seule fois par session.

---

### A5 — Le formulaire n'est pas utilisable au clavier
`index.html` · le panneau `.voile`

La touche `Échap` ne ferme rien. Le focus n'est pas piégé dans le formulaire :
en tabulant, on sort derrière le voile. Il n'y a ni `role="dialog"`
ni `aria-modal`.

**Attendu :** `Échap` ferme, le focus reste à l'intérieur, les attributs ARIA
sont posés.

---

### A6 — Les commentaires de `vue.js` répètent le code
`js/vue.js`

Plusieurs commentaires disent ce que fait la ligne suivante, ce qui est
inutile — on le lit dans le code. Un commentaire doit expliquer **pourquoi**.

**Attendu :** relire le fichier, supprimer les commentaires redondants,
enrichir ceux qui expliquent une décision.

---

## B · Fonctionnalités manquantes

### B1 — L'historique des échanges
Chaque contact devrait porter une liste d'échanges datés
(`{ date, canal, resume }`), affichée dans une fiche dépliable.

Touche : `modele.js` (validation), `depot.js` (`ajouterEchange`),
`vue.js` (affichage), `app.js` (formulaire).

### B2 — L'import CSV
On sait exporter, pas importer. Il faut : lire un fichier, valider chaque
ligne, refuser les doublons, et surtout **rendre compte** — combien importés,
combien refusés, et pourquoi.

### B3 — Le graphique d'évolution mensuelle
`Statistiques.parMois()` existe et est testée, mais rien ne l'affiche.
Un histogramme en SVG pur, sans bibliothèque, sous le tableau des sources.

---

## Comment travailler ces sujets

Prenez-les **un par un**. Pour chacun :

1. `/plan` — faites décrire le plan avant qu'une ligne ne soit écrite ;
2. lisez le plan, corrigez-le, puis validez ;
3. laissez l'assistant coder ;
4. `node run-tests.js` — les 90 tests doivent rester au vert ;
5. `/verifier` — la compétence du projet donne son verdict ;
6. `@relecteur` — le sous-agent relit avec un œil neuf ;
7. commit.

> Ne demandez jamais « corrige toute la dette technique ». Vous obtiendrez
> un diff de six cents lignes que personne ne relira, et c'est ainsi qu'on
> perd le contrôle d'une base de code.
