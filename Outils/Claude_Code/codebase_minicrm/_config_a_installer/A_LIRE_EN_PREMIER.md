# À installer avant l'exercice 1

Ce dossier contient la configuration Claude Code du projet. Elle est livrée
ici, sous des noms neutres, parce que les dossiers commençant par un point
ne peuvent pas être transférés automatiquement.

**Une minute de manipulation, une fois, et c'est fini.**

---

## Ce qu'il faut faire

Depuis `Outils/Claude_Code/codebase_minicrm/`, copiez les fichiers en
ajoutant le point devant les noms.

### Windows — invite de commandes

```bat
cd Outils\Claude_Code\codebase_minicrm

mkdir .claude\agents
mkdir .claude\skills\verifier
mkdir .claude\skills\nouvelle-fonction

copy _config_a_installer\claude\settings.json .claude\settings.json
copy _config_a_installer\claude\agents\relecteur.md .claude\agents\relecteur.md
copy _config_a_installer\claude\skills\verifier\SKILL.md .claude\skills\verifier\SKILL.md
copy _config_a_installer\claude\skills\nouvelle-fonction\SKILL.md .claude\skills\nouvelle-fonction\SKILL.md
copy _config_a_installer\mcp.json .mcp.json
```

### macOS / Linux

```bash
cd Outils/Claude_Code/codebase_minicrm

mkdir -p .claude/agents .claude/skills/verifier .claude/skills/nouvelle-fonction

cp _config_a_installer/claude/settings.json          .claude/settings.json
cp _config_a_installer/claude/agents/relecteur.md    .claude/agents/relecteur.md
cp _config_a_installer/claude/skills/verifier/SKILL.md            .claude/skills/verifier/SKILL.md
cp _config_a_installer/claude/skills/nouvelle-fonction/SKILL.md   .claude/skills/nouvelle-fonction/SKILL.md
cp _config_a_installer/mcp.json                      .mcp.json
```

---

## Vérifier que ça a marché

Lancez `claude` dans ce dossier, puis :

```
/verifier
```

Si la commande apparaît dans le menu `/`, tout est en place.
`/hooks` doit également afficher un hook `PostToolUse`.

---

## Ce que contient chaque fichier

| Fichier | Ce qu'il fait |
|---|---|
| `.claude/settings.json` | Les permissions (`allow` / `deny`) et un hook qui relance les tests après chaque écriture |
| `.claude/agents/relecteur.md` | Un sous-agent qui relit le code — **sans droit de le modifier** |
| `.claude/skills/verifier/SKILL.md` | La commande `/verifier` : état des tests, du diff, et un verdict |
| `.claude/skills/nouvelle-fonction/SKILL.md` | La commande `/nouvelle-fonction` : tests d'abord, puis code |
| `.mcp.json` | Le serveur MCP construit au jour 3, partagé avec l'équipe |

> **Ouvrez ces cinq fichiers avant de commencer l'exercice 1.** Ce sont eux
> qui expliquent la différence entre un assistant qui devine et un assistant
> qui sait.

---

## Et le chemin du serveur MCP ?

Dans `.mcp.json`, le chemin vers `serveur_mcp.py` est relatif. Selon l'endroit
où vous avez décompressé le dossier, il faudra peut-être le remplacer par un
**chemin absolu**. C'est l'objet de l'étape 3.3 des exercices guidés.
