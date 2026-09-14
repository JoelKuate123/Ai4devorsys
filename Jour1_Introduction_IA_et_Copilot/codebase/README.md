# Code base — Journée 1

Introduction à l'IA · VSCode et GitHub Copilot

**Tout est en HTML et en CSS. Aucun JavaScript.**
Vous double-cliquez un fichier, il s'ouvre dans votre navigateur, ça marche.
Pas de terminal, pas d'installation, pas de clé d'API.

---

## Démarrer en trente secondes

| Ce que vous voulez faire | Le fichier à ouvrir |
|---|---|
| Voir le sommaire de la journée | `index.html` |
| Exercice 1 — un assistant sans IA | `exercice_1_assistant_regles/index.html` |
| Exercice 2 — générer une page par prompt | `exercice_2_page_generee/index.html` |
| Voir une page qui obtient 7/7 | `exercice_2_page_generee/exemple_reussi.html` |

---

## Pourquoi pas de JavaScript aujourd'hui ?

C'est délibéré, et c'est pédagogique.

Aujourd'hui, vous apprenez à **faire produire du code par une IA, puis à le
relire**. Le langage qui compte pour cela, c'est celui du résultat : HTML et
CSS. Ce sont aussi les deux seuls langages qu'on peut lire à voix haute et
comprendre sans rien connaître à la programmation.

Ajouter JavaScript le premier jour, ce serait apprendre deux choses à la
fois : une syntaxe **et** une méthode de travail. On garde la méthode.

Le JavaScript arrive au jour 3, avec Python, quand il devient nécessaire —
c'est-à-dire quand il faut appeler un modèle depuis du code.

---

## Contenu du dossier

```
codebase/
├── index.html                          ← le sommaire de la journée
├── README.md                           ← ce fichier
├── css/
│   └── style.css                       ← la charte, commentée ligne à ligne
├── exercice_1_assistant_regles/
│   ├── index.html                      ← l'assistant : 9 règles, 0 JavaScript
│   └── assistant.css                   ← le « moteur » est en section 4
└── exercice_2_page_generee/
    ├── index.html                      ← l'énoncé et la grille sur 7
    ├── gabarit.html                    ← le squelette à remplir
    └── exemple_reussi.html             ← une page qui obtient 7/7
```

> **`css/style.css` est un cours à lui tout seul.** Douze sections, chacune
> commentée. Lisez-le entre deux exercices : c'est le fichier le plus
> rentable de la journée.

---

## Exercice 1 — un assistant sans IA

Une page qui répond à neuf questions. Aucune ligne de JavaScript.

Chaque question est un **lien** vers une ancre ; chaque réponse est un **bloc**
qui porte cet identifiant. Deux lignes de CSS font tout le travail :

```css
.reponse         { display: none; }
.reponse:target  { display: block; }
```

`:target` désigne l'élément dont l'identifiant se trouve dans l'adresse de la
page. Cliquer sur un lien change l'adresse ; le bloc correspondant apparaît.
C'est un « si… alors… », écrit à la main, une fois par question.

**Ce que ce programme a de plus qu'un LLM :**

- il est **prévisible** — la même question donne toujours la même réponse ;
- il est **explicable** — il affiche toujours quelle règle il a appliquée.

**Ce qu'il a de moins :** il ne comprend **que ce qui a été prévu**. Le champ
de saisie libre est volontairement inactif, et c'est tout le sujet de
l'exercice. Sur onze questions qu'un vrai visiteur poserait, quatre n'ont
aucune règle — et chacune demanderait un lien et un bloc de plus.

C'est exactement le mur qu'a rencontré l'IA symbolique dans les années 1990.

---

## Exercice 2 — générer une page par prompt

Vous n'écrivez pas de code : vous écrivez un **prompt**, vous le donnez à
Copilot ou à un assistant de chat, et vous récupérez du HTML et du CSS.

Puis vous faites le seul travail qui compte : **relire ce qui revient**,
avec une grille de sept contrôles.

| Contrôle | Ce qu'on vérifie |
|---|---|
| 1 | `<!DOCTYPE html>` est bien la première ligne |
| 2 | `lang="fr"` est présent |
| 3 | `<meta charset="utf-8">` est présent |
| 4 | La balise `viewport` est présente |
| 5 | Il y a un `<style>` et il n'est pas vide |
| 6 | Aucune ressource distante (cherchez `http` dans le code) |
| 7 | La page se termine bien par `</html>` |

**Ce score est le vrai livrable.** Il ne mesure pas la qualité du modèle : il
mesure l'écart entre ce que vous avez demandé et ce que vous avez reçu. C'est
la seule façon de savoir si un prompt s'améliore ou se dégrade.

---

## Pas d'assistant sous la main ?

Ouvrez `exercice_2_page_generee/exemple_reussi.html`. C'est une page qui
obtient 7/7, et chaque contrôle y est signalé par un commentaire dans le
code. Vous ferez l'exercice dessus, et vous ne perdrez rien de l'essentiel :
la relecture.

---

## Le conseil qui fait gagner la journée

Dans VS Code, installez l'extension **Live Preview** de Microsoft.
Clic droit sur un fichier HTML → *Show Preview*. La page se recharge toute
seule à chaque enregistrement, et vous n'avez plus à basculer vers le
navigateur.

---

Formation animée par **Kuate Joël Parfait** — Digital House Company
hello@dhcompany.pro
