# Code base — Journée 2

La programmation par prompt · Les outils du cloud

**Toujours aucun JavaScript.** Six modèles de prompt à copier, deux grilles
de contrôle, et une page web à construire puis à mettre en ligne.

---

## Démarrer en trente secondes

| Ce que vous voulez faire | Le fichier à ouvrir |
|---|---|
| Voir le sommaire de la journée | `index.html` |
| Les six techniques de prompt | `exercice_3_prompts/index.html` |
| Le TP et sa grille sur 10 | `exercice_3_prompts/grille_de_controle.html` |
| Construire et déployer une page | `exercice_4_page_web/index.html` |

---

## Contenu du dossier

```
codebase/
├── index.html                          ← le sommaire de la journée
├── README.md                           ← ce fichier
├── css/
│   └── style.css                       ← la charte, commentée ligne à ligne
├── exercice_3_prompts/
│   ├── index.html                      ← les 6 techniques, modèles à copier
│   └── grille_de_controle.html         ← le TP : le prompt de spécification
└── exercice_4_page_web/
    └── index.html                      ← construire, modifier, déployer, chiffrer
```

Vos productions du jour — les pages HTML que le modèle écrira — se rangent
dans `exercice_4_page_web/`, à côté de l'énoncé.

---

## Les six techniques, et quand les utiliser

Une technique de prompt n'est pas une astuce à retenir par cœur : c'est un
**texte réutilisable**. Écrit une fois, relu, corrigé, partagé dans l'équipe.

| Technique | Quand l'utiliser | Quand surtout pas |
|---|---|---|
| **Role prompting** | Presque toujours, en première ligne | — |
| **Few-shot** | Quand le *format* compte plus que le raisonnement | Quand il n'y a pas de format |
| **Chain-of-thought** | Calcul, diagnostic, choix d'architecture | Traduction, reformulation, extraction |
| **Format imposé** | Dès que la réponse sera relue systématiquement | Un texte libre assumé |
| **Self-consistency** | Une décision qui compte, un modèle qui hésite | Tout le reste : ça triple le coût |
| **Prompt de modification** | Faire évoluer un fichier existant | Une création de zéro |

Chacune a son modèle prêt à copier dans `exercice_3_prompts/index.html`.

---

## La règle de la journée

> **Un prompt ne s'écrit pas, il se corrige.**

La première version n'est jamais la bonne, et ce n'est pas un problème :
c'est la méthode. La grille sur 10 sert exactement à ça — chaque case non
cochée désigne une consigne manquante ou trop vague **dans votre prompt**,
pas un défaut de la réponse.

Le tableau « si ce contrôle échoue, renforcez cette ligne » est en bas de
`grille_de_controle.html`.

---

## Self-consistency : la précaution qu'on oublie

Trois conversations **séparées**, pas trois messages à la suite.

Dans une même conversation, le modèle voit ses réponses précédentes et se
répète : le vote ne vaut plus rien, et on croit avoir vérifié quelque chose
alors qu'on a simplement demandé trois fois la même chose à quelqu'un qui se
souvient de sa réponse.

---

## Le chiffre de la journée

Scénario : 200 titres d'actualité classés par jour, environ 600 tokens
envoyés et 20 reçus par appel.

| Modèle | Coût mensuel | Décision |
|---|---|---|
| Modèle local (LM Studio) | **0,00 $** | Gratuit au token, mais il faut une machine |
| Petit modèle rapide | **≈ 1,30 $** | **Le bon choix pour cette tâche** |
| Modèle économique | ≈ 6,00 $ | Acceptable |
| Modèle généraliste | ≈ 12,00 $ | Sur-dimensionné |
| Modèle de rédaction | ≈ 24,00 $ | Injustifiable ici |
| Modèle de raisonnement | ≈ 60,00 $ | Quarante-six fois le nécessaire |

La formule tient en une ligne :
`coût = (tokens ÷ 1 000 000) × prix du million`.

**Le piège que tout le monde oublie :** le message système est envoyé à
*chaque* appel. Sur une tâche courte, c'est lui qui pèse le plus lourd dans
la facture — trois phrases de plus multiplient le coût.

Le tableau à remplir avec **vos** chiffres est dans votre fiche participant.

---

## Où va la clé d'API

| Architecture | Où vit la clé | Verdict |
|---|---|---|
| Page statique qui appelle le modèle elle-même | Dans le code, **visible par tous** | **Jamais.** Une clé publiée est une clé compromise |
| Page statique + modèle local | Nulle part | Convient à un usage interne ou une démonstration |
| Page statique + **votre serveur** + le modèle | Sur votre serveur | La seule architecture acceptable en production |

L'architecture tient en une ligne :
**navigateur → votre serveur → le modèle**. La clé s'arrête au milieu.

On construit ce serveur demain, en Python, autour du RAG.

---

Formation animée par **Kuate Joël Parfait** — Digital House Company
hello@dhcompany.pro
