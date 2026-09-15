# 🌤️ Démo MCP — Assistant Météo avec Claude
**AI4Africa Ignition · Jeudi 07 mai 2026**

> **Objectif :** demander à Claude *"Quelle est la météo à Yaoundé ?"* et Claude répond avec des données en temps réel.

---

## ⚡ Installation rapide

```bash
# 1. Vérifiez que Python 3.10+ est installé
python --version

# 2. Installez les dépendances
pip install -r requirements.txt

# 3. Lancez le serveur (test manuel, optionnel)
python server.py
```

---

## 🗂️ Structure du projet

```
MCP2/
├── README.md                    ← Ce fichier
├── requirements.txt             ← Dépendances à installer
├── server.py                    ← Serveur MCP (4 outils météo)
└── inspector-config.json        ← Config pour MCP Inspector
```

---

## 🔌 Connecter à Claude Desktop

Ajoutez ceci dans la configuration de Claude Desktop
(`Paramètres → Développeur → Modifier la configuration`) :

```json
{
  "mcpServers": {
    "meteo-africa": {
      "command": "python",
      "args": ["CHEMIN_COMPLET/server.py"]
    }
  }
}
```

Remplacez `CHEMIN_COMPLET` par le chemin réel vers ce dossier
(ex : `C:/Users/axiat/Desktop/MCP2/server.py`), puis redémarrez Claude Desktop.

---

## 💬 Phrases à tester dans Claude

```
Quelle est la météo à Yaoundé en ce moment ?
Compare la météo entre Dakar, Abidjan et Paris.
Qu'est-ce que je dois mettre pour aller à Douala aujourd'hui ?
Il fait quel temps à Antananarivo ?
```

---

## 🛠️ En cas de problème

| Problème | Solution |
|----------|----------|
| `ModuleNotFoundError: requests` | `pip install requests` |
| `ModuleNotFoundError: mcp` | `pip install mcp` |
| Serveur MCP absent dans Claude | Redémarrer Claude Desktop |
| Ville introuvable | Essayer un nom plus simple (ex: "Abidjan" plutôt que "Abidjan CI") |

---

**API utilisée :** [Open-Meteo](https://open-meteo.com) — Gratuite, sans inscription, sans clé API
