# À installer avant l'exercice 1

Ce dossier contient la configuration Copilot du projet. Elle est livrée ici,
sous des noms neutres, parce que les dossiers commençant par un point ne
peuvent pas être transférés automatiquement.

**Une minute de manipulation, une fois, et c'est fini.**
Sans cela, les fichiers d'instructions ne sont pas lus — et c'est justement
le sujet du module 3.

---

## Ce qu'il faut faire

Depuis `Outils/GitHub_Copilot/codebase_minicrm/` :

### Windows — invite de commandes

```bat
cd Outils\GitHub_Copilot\codebase_minicrm

mkdir .github\instructions
mkdir .github\prompts
mkdir .vscode

copy _config_a_installer\github\copilot-instructions.md .github\copilot-instructions.md
copy _config_a_installer\github\instructions\*.md .github\instructions\
copy _config_a_installer\github\prompts\*.md .github\prompts\
copy _config_a_installer\vscode\settings.json .vscode\settings.json
copy _config_a_installer\vscode\mcp.json .vscode\mcp.json
```

### macOS / Linux

```bash
cd Outils/GitHub_Copilot/codebase_minicrm

mkdir -p .github/instructions .github/prompts .vscode

cp _config_a_installer/github/copilot-instructions.md .github/
cp _config_a_installer/github/instructions/*.md       .github/instructions/
cp _config_a_installer/github/prompts/*.md            .github/prompts/
cp _config_a_installer/vscode/settings.json           .vscode/
cp _config_a_installer/vscode/mcp.json                .vscode/
```

---

## Le réglage à vérifier ensuite

Ouvrez VS Code, puis `Ctrl+Shift+P` → **« Preferences: Open User Settings (JSON) »**.
Vérifiez que cette ligne est présente :

```json
"github.copilot.chat.codeGeneration.useInstructionFiles": true
```

> **C'est le réglage que tout le monde oublie.** Sans lui, vous écrivez des
> instructions de dépôt que personne ne lit — et vous concluez, à tort,
> qu'elles ne servent à rien.

## Vérifier que ça a marché

Dans le chat Copilot, tapez `/`. Vous devez voir apparaître
`/completer-fonction` et `/relire`.

---

## Ce que contient chaque fichier

| Fichier | Lu quand | Ce qu'il fait |
|---|---|---|
| `.github/copilot-instructions.md` | à **chaque** demande | La langue, l'architecture, les règles métier, les interdits |
| `.github/instructions/tests.instructions.md` | dans `tests/**` | Comment écrire un test dans ce projet |
| `.github/instructions/vue.instructions.md` | dans `js/vue.js` | La règle absolue de l'échappement |
| `.github/prompts/completer-fonction.prompt.md` | `/completer-fonction` | Compléter une fonction en partant des tests |
| `.github/prompts/relire.prompt.md` | `/relire` | Relire un diff comme un développeur senior |
| `.vscode/settings.json` | à l'ouverture du projet | Les réglages Copilot de l'équipe |
| `.vscode/mcp.json` | en mode agent | Le serveur MCP du jour 3 |

> **Ouvrez `copilot-instructions.md` avant votre première demande.** C'est ce
> fichier qui fait la différence entre du code générique et du code qui
> ressemble au vôtre.
