# MiniCRM — variante GitHub Copilot

Un carnet de contacts clients en HTML, CSS et JavaScript standard.
**Aucune dépendance, aucune compilation.** Double-cliquez `index.html`.

## L'état de départ

L'application **fonctionne**, mais quatre sections du tableau de bord sont
vides : quatre fonctions de `js/statistiques.js` sont laissées à compléter.

```bash
node run-tests.js
# 82 tests au vert, 8 en échec, 90 au total
```

Les 8 échecs sont votre cahier des charges. Ils décrivent précisément ce que
chaque fonction doit faire — plus précisément que n'importe quelle consigne.

C'est la situation où la **complétion en ligne** de Copilot est la plus forte :
un contrat écrit (JSDoc), des tests qui existent déjà, un fichier voisin
qui montre le style.

> **Première chose à faire :** ouvrez `_config_a_installer/A_LIRE_EN_PREMIER.md`
> et suivez les cinq lignes de copie. Une minute, une fois. Sans cela, les
> fichiers d'instructions ne sont pas lus — et c'est justement le sujet
> du module 3.

## Ce qui est déjà configuré pour vous

```
codebase_minicrm/
├── A_COMPLETER.md                        ← les quatre fonctions, dans l'ordre
├── .github/
│   ├── copilot-instructions.md           ← lu à CHAQUE demande, sans rien activer
│   ├── instructions/
│   │   ├── tests.instructions.md         ← ne s'applique qu'à tests/**
│   │   └── vue.instructions.md           ← ne s'applique qu'à js/vue.js
│   └── prompts/
│       ├── completer-fonction.prompt.md  ← /completer-fonction
│       └── relire.prompt.md              ← /relire
└── .vscode/
    ├── settings.json                     ← les réglages Copilot du projet
    └── mcp.json                          ← le serveur MCP du jour 3
```

Ouvrez `copilot-instructions.md` **avant** votre première demande. C'est ce
fichier qui fait la différence entre du code générique et du code qui
ressemble au vôtre.

## Les cinq minutes qui comptent

1. Ouvrez `js/statistiques.js`, placez le curseur dans `parSource()`.
2. Regardez la proposition en gris. `Tab` accepte, `Alt+]` propose autre chose.
3. `Ctrl+I` — chat en ligne — puis : *implémente cette fonction en suivant sa JSDoc*.
4. `node run-tests.js` : combien de tests sont passés au vert ?
5. `/relire` dans le chat, avant de valider quoi que ce soit.

## Le code

```
index.html            l'interface
css/style.css         la présentation
js/modele.js          valider, normaliser, formater
js/depot.js           ranger, retrouver, filtrer, trier
js/statistiques.js    ← 4 fonctions à compléter
js/vue.js             produire du HTML (tout passe par echapper())
js/app.js             relier le tout aux événements
tests/                90 tests, framework maison de 200 lignes
```

---

Formation animée par **Kuate Joël Parfait** — Digital House Company
hello@dhcompany.pro
