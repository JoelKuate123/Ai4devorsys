# Brancher ce serveur MCP sur un assistant

Le serveur `serveur_mcp.py` expose votre base documentaire locale à
n'importe quel assistant compatible MCP. Aucun document ne quitte la machine :
l'assistant appelle un outil, le serveur lit les fichiers, et seul l'extrait
utile remonte dans la conversation.

Trois branchements, trois fichiers de configuration. Le principe est
toujours le même : on dit à l'assistant **quelle commande lancer**.

---

## 1. Claude Code

En ligne de commande, depuis le dossier `codebase/` :

```bash
claude mcp add rag-local -- python exercice_7_mcp/serveur_mcp.py
```

Vérifiez ensuite dans une session :

```
/mcp
```

Le serveur doit apparaître avec ses trois outils. S'il est en erreur,
`claude --debug=mcp` affiche les messages échangés.

Pour le partager avec l'équipe, écrivez plutôt un fichier
`.mcp.json` à la racine du dépôt :

```json
{
  "mcpServers": {
    "rag-local": {
      "command": "python",
      "args": ["exercice_7_mcp/serveur_mcp.py"]
    }
  }
}
```

---

## 2. Codex

Dans `~/.codex/config.toml` :

```toml
[mcp_servers.rag_local]
command = "python"
args = ["exercice_7_mcp/serveur_mcp.py"]
```

Dans une session, `/mcp` liste les serveurs configurés et leur état.

---

## 3. GitHub Copilot CLI

Depuis une session Copilot CLI :

```
/mcp add
```

puis renseignez la commande `python` et l'argument
`exercice_7_mcp/serveur_mcp.py`. `/mcp show` affiche la configuration
enregistrée.

---

## 4. VS Code (Copilot Chat, mode agent)

Fichier `.vscode/mcp.json` à la racine du projet :

```json
{
  "servers": {
    "rag-local": {
      "type": "stdio",
      "command": "python",
      "args": ["exercice_7_mcp/serveur_mcp.py"]
    }
  }
}
```

---

## Ce qui coince, et pourquoi

| Symptôme | Cause presque toujours | Correction |
|---|---|---|
| Le serveur n'apparaît pas | chemin relatif interprété depuis un autre dossier | mettez un chemin **absolu** dans `args` |
| Connexion qui tombe aussitôt | un `print()` de débogage dans le serveur | tout diagnostic va sur `stderr`, jamais `stdout` |
| L'assistant n'appelle jamais l'outil | description trop vague | réécrivez la description : quand l'utiliser, quand ne pas l'utiliser |
| Appel avec des arguments absurdes | schéma incomplet | ajoutez `description`, `default`, `minimum`, `maximum` |
| Réponse tronquée | l'outil renvoie 40 000 caractères | bornez la sortie : le résultat entre dans le contexte du modèle |
| Aucune réponse, aucun message | `flush()` oublié après l'écriture | `sys.stdout.flush()` après chaque message |

---

## La question à se poser avant d'exposer un outil

Un serveur MCP donne à un modèle la capacité d'**agir**. Avant d'ajouter
un outil, répondez à ces trois questions :

1. **Que se passe-t-il si le modèle l'appelle au mauvais moment ?**
   Un outil `lire_document` est sans danger. Un outil `supprimer_client`
   ne devrait pas exister sans confirmation humaine.
2. **Que voit le modèle en retour ?** Tout ce que l'outil renvoie entre
   dans le contexte, y compris ce que vous n'aviez pas prévu d'y mettre.
3. **Qui peut appeler ce serveur ?** En transport `stdio`, c'est le
   processus parent, donc l'utilisateur de la machine. Sur un transport
   réseau, c'est une autre affaire : authentification obligatoire.

> Règle simple pour commencer : **des outils en lecture seule**.
> On ouvre l'écriture plus tard, outil par outil, avec un test à chaque fois.
