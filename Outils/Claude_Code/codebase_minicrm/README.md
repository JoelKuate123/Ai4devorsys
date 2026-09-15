# MiniCRM — variante Claude Code

Un carnet de contacts clients en HTML, CSS et JavaScript standard.
**Aucune dépendance, aucune compilation.** Double-cliquez `index.html`.

## Démarrer

| Action | Comment |
|---|---|
| Lancer l'application | ouvrir `index.html` |
| Lancer les tests | ouvrir `tests.html`, ou `node run-tests.js` |
| Démarrer l'assistant | `claude` dans ce dossier |

Les **90 tests passent**. Rien n'est cassé ici : c'est un projet sain,
avec de la dette technique et des fonctionnalités manquantes. C'est
exactement la situation où un assistant agentique est le plus utile.

> **Première chose à faire :** ouvrez `_config_a_installer/A_LIRE_EN_PREMIER.md`
> et suivez les cinq lignes de copie. Une minute, une fois. Sans cela, la
> commande `/verifier`, le sous-agent `@relecteur` et le hook des tests
> n'existent pas.

## Ce qui est déjà configuré pour vous

```
codebase_minicrm/
├── CLAUDE.md                     ← la mémoire du projet, lue à chaque session
├── DETTE_TECHNIQUE.md            ← les 9 sujets des exercices
├── .mcp.json                     ← le serveur MCP du jour 3, partagé avec l'équipe
└── .claude/
    ├── settings.json             ← permissions + un hook qui relance les tests
    ├── skills/
    │   ├── verifier/SKILL.md     ← /verifier : état des tests, du diff, verdict
    │   └── nouvelle-fonction/SKILL.md
    └── agents/
        └── relecteur.md          ← @relecteur : relecture par un sous-agent
```

Ouvrez chacun de ces fichiers **avant** de lancer votre première commande.
Ce sont eux qui expliquent la différence entre un assistant qui devine
et un assistant qui sait.

## Les cinq minutes qui comptent

```bash
claude                 # démarrer
/context               # voir ce que l'assistant a déjà en mémoire
/plan                  # décrire A1 sans écrire une ligne
                       # …lire le plan, le corriger, l'approuver…
/verifier              # la compétence du projet donne son verdict
```

## Le code

```
index.html            l'interface
css/style.css         la présentation
js/modele.js          valider, normaliser, formater
js/depot.js           ranger, retrouver, filtrer, trier
js/statistiques.js    calculer les chiffres du tableau de bord
js/vue.js             produire du HTML (tout passe par echapper())
js/app.js             relier le tout aux événements
tests/                90 tests, framework maison de 200 lignes
```

---

Formation animée par **Kuate Joël Parfait** — Digital House Company
hello@dhcompany.pro
