# MiniCRM — variante Codex

Un carnet de contacts clients en HTML, CSS et JavaScript standard.
**Aucune dépendance, aucune compilation.** Double-cliquez `index.html`.

## L'état de départ : les tests sont au rouge

```bash
node run-tests.js
# 81 tests au vert, 9 en échec, 90 au total
```

**Six défauts** ont été semés volontairement dans `js/`. Ils sont décrits,
par leurs symptômes, dans `BOGUES.md`. Aucun test n'est faux.

C'est le terrain de jeu idéal pour Codex : une boucle courte
*lancer → lire l'échec → comprendre → corriger → relancer*, dans un bac à
sable où l'agent ne peut rien casser d'autre.

## Ce qui est déjà configuré pour vous

```
codebase_minicrm/
├── AGENTS.md                        ← consignes lues automatiquement par Codex
├── BOGUES.md                        ← les six symptômes, sans les réponses
└── .codex/
    ├── config.toml                  ← modèle, approbations, bac à sable, MCP
    └── prompts/
        ├── corriger-un-bogue.md     ← /corriger-un-bogue <sujet>
        └── relire.md                ← /relire
```

Ouvrez `AGENTS.md` **avant** votre première commande. C'est une convention
ouverte : le même fichier sert à plusieurs agents, contrairement à un
fichier propriétaire.

## Les cinq minutes qui comptent

```bash
codex                       # démarrer dans ce dossier
/status                     # modèle, approbations, bac à sable, tokens
/plan                       # faire décrire le plan sans écrire une ligne
/corriger-un-bogue le tri par montant
/diff                       # relire ce qui a VRAIMENT changé
/review                     # la revue automatique du travail en cours
```

## La règle du jeu

**Un défaut à la fois.** Ne demandez jamais « corrige tous les bogues » :
vous obtiendrez un diff de deux cents lignes, un test modifié au passage,
et vous n'aurez rien appris.

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
