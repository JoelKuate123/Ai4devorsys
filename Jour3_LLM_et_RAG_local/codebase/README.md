# Code base — Journée 3

Les LLM · RAG local · MCP

**Cette journée est en Python.** C'est le seul endroit de la formation où
JavaScript ne suffit pas, et il y a trois raisons précises à cela :

1. le RAG **lit des fichiers sur votre disque** et calcule des vecteurs :
   c'est du travail de serveur, pas de navigateur ;
2. le serveur MCP communique par **l'entrée et la sortie standard** d'un
   processus — un navigateur n'a pas accès à cela ;
3. c'est l'écosystème réel de l'IA : `transformers`, `datasets`, `langchain`
   sont en Python.

L'**interface**, elle, reste en HTML/CSS/JS : voir `interface_web/`.

---

## 1. Installer Python

```bash
python --version     # il faut 3.10 ou plus récent
```

Si la commande ne répond pas, téléchargez Python sur
<https://www.python.org/downloads/>
Sur Windows, cochez bien **« Add Python to PATH »** pendant l'installation.

## 2. Créer l'environnement virtuel

Un environnement virtuel est un dossier qui contient les bibliothèques d'un
seul projet. Cela évite de mélanger les projets entre eux.

```bash
cd codebase
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

Quand l'environnement est actif, `(.venv)` apparaît devant votre invite.

## 3. Installer les bibliothèques

```bash
pip install -r requirements.txt
```

## 4. Configurer l'accès au modèle

```bash
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux
```

| Situation | À mettre dans `.env` |
|---|---|
| **LM Studio** (gratuit, local) | `LLM_BASE_URL=http://localhost:1234/v1` et `LLM_API_KEY=lm-studio` |
| **Un service cloud** | l'adresse du service et votre vraie clé |
| **Ni l'un ni l'autre** | ne touchez à rien : le mode hors ligne se déclenche seul |

## 5. Lancer les tests

```bash
pytest -v
```

Tout doit passer au vert, **même sans clé d'API**.

---

## Contenu du dossier

```
codebase/
├── index.html                      ← le sommaire de la journée
├── README.md
├── requirements.txt
├── .env.example
├── conftest.py                     ← configuration de pytest
├── commun/
│   └── llm_client.py               ← le client LLM, version Python
├── exercice_5_embeddings/
│   ├── embeddings_maison.py        ← embeddings, cosinus, base vectorielle
│   ├── specification_rag.md        ← le livrable du TP 5
│   └── test_embeddings.py
├── exercice_6_rag_local/
│   ├── rag.py                      ← découper, indexer, chercher, répondre
│   ├── test_rag.py
│   └── documents/                  ← la base documentaire confidentielle
├── exercice_7_mcp/                 ← NOUVEAU
│   ├── serveur_mcp.py              ← un serveur MCP complet, sans dépendance
│   ├── client_mcp_minimal.py       ← le client, pour voir les deux côtés
│   ├── configuration_mcp.md        ← le branchement sur les 4 assistants
│   └── test_serveur_mcp.py         ← 17 tests de la couche protocole
└── interface_web/                  ← NOUVEAU
    ├── index.html                  ← la conversation, en HTML/CSS/JS
    └── serveur_rag.py              ← le pont entre le RAG et le navigateur
```

---

## Les commandes de la journée

```bash
# Exercice 5 — les embeddings
python exercice_5_embeddings/embeddings_maison.py
pytest exercice_5_embeddings/ -v

# Exercice 6 — le RAG, en terminal
python exercice_6_rag_local/rag.py
pytest exercice_6_rag_local/ -v

# Exercice 6 — le RAG, dans le navigateur
python interface_web/serveur_rag.py       # puis http://localhost:8000

# Exercice 7 — le protocole MCP, en cinq messages
python exercice_7_mcp/serveur_mcp.py --demo

# Exercice 7 — le client et le serveur, ensemble
python exercice_7_mcp/client_mcp_minimal.py

# Exercice 7 — les tests du protocole
pytest exercice_7_mcp/ -v
```

---

## Exercice 7 · MCP, en trois phrases

**MCP** (Model Context Protocol) permet à un assistant d'appeler **vos**
outils. Au lieu de copier-coller vos procédures internes dans un chat,
l'assistant interroge directement votre base, chez vous.

Le protocole tient en trois idées :

1. le client et le serveur échangent des messages **JSON-RPC 2.0**, une ligne
   de JSON par message, sur l'entrée et la sortie standard ;
2. le client demande `initialize`, puis `tools/list` pour connaître le catalogue ;
3. quand le modèle décide d'utiliser un outil, le client envoie `tools/call`.

Il n'y a rien de plus. `python exercice_7_mcp/serveur_mcp.py --demo` vous
montre les cinq messages passer.

> **Le piège le plus fréquent :** un `print()` de débogage dans le serveur.
> Sur ce transport, la sortie standard est réservée au protocole ; un seul
> `print()` casse la communication, sans message d'erreur. Tout diagnostic
> part sur `sys.stderr`.

Le branchement sur Claude Code, Codex, Copilot CLI et VS Code est décrit dans
`exercice_7_mcp/configuration_mcp.md`.

---

## La règle qui résume les trois jours

> Le RAG ne rend pas le modèle intelligent. Il lui donne **le bon extrait
> au bon moment**, et l'oblige à citer d'où il vient.

Regardez `rag.repondre()` : si aucun extrait ne dépasse le seuil de
pertinence, le modèle **n'est même pas appelé**. On économise un appel,
et surtout on évite une réponse inventée.

---

Formation animée par **Kuate Joël Parfait** — Digital House Company
hello@dhcompany.pro
