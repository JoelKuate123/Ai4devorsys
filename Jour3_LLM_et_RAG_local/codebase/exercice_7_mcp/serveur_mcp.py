"""
exercice_7_mcp/serveur_mcp.py
------------------------------
Jour 3 · Module 6 bis · Travaux pratiques

MCP — Model Context Protocol : brancher un assistant sur VOS systèmes.

CE QUE FAIT CE FICHIER
Il expose la base documentaire de l'exercice 6 sous forme d'OUTILS que
n'importe quel assistant compatible MCP (Claude Code, Codex, Copilot CLI,
l'application Claude…) peut appeler tout seul.

Concrètement : au lieu de copier-coller vos procédures internes dans un chat,
l'assistant interroge directement votre base, chez vous, sans que le document
ne parte nulle part.

POURQUOI C'EST EN PYTHON
Comme le RAG dont il dépend. MCP n'impose aucun langage : il existe des
implémentations en TypeScript, en Go, en Rust. Le protocole est le même.

LE PROTOCOLE, EN TROIS PHRASES
1. Le client (l'assistant) et le serveur (ce fichier) échangent des messages
   JSON-RPC 2.0, une ligne de JSON par message, sur l'entrée et la sortie
   standard du processus.
2. Le client demande d'abord « initialize », puis « tools/list » pour savoir
   ce que le serveur sait faire.
3. Quand le modèle décide d'utiliser un outil, le client envoie
   « tools/call » avec les arguments, et le serveur renvoie le résultat.

Il n'y a rien de plus. Pas de magie, pas de dépendance obligatoire :
ce fichier n'utilise que la bibliothèque standard de Python.

LANCEMENT MANUEL (pour comprendre)
    python exercice_7_mcp/serveur_mcp.py --demo

BRANCHEMENT SUR UN ASSISTANT
    voir le fichier voisin  configuration_mcp.md
"""

import json
import sys
from pathlib import Path

# On rend le dossier parent importable : les exercices précédents sont
# des voisins, pas des paquets installés.
sys.path.insert(0, str(Path(__file__).parent.parent))

from exercice_6_rag_local import rag                       # noqa: E402
from exercice_5_embeddings.embeddings_maison import BaseVectorielle  # noqa: E402


# ==================================================================
# 1. L'état du serveur
# ==================================================================

# La base vectorielle est construite UNE fois, au premier besoin.
# Réindexer à chaque appel serait correct mais lent : sur une vraie base,
# l'indexation prend des minutes, pas des millisecondes.
_base = None


def base_documentaire():
    """Renvoie la base vectorielle, en l'indexant au premier appel.

    Ce motif s'appelle « initialisation paresseuse » (lazy loading).
    Il évite de payer le coût de l'indexation si personne n'appelle d'outil.
    """
    global _base
    if _base is None:
        _base = rag.indexer()
    return _base


# ==================================================================
# 2. La description des outils
# ==================================================================

# C'est LE point important du protocole : le modèle ne voit que ceci.
# Il choisit d'appeler un outil à partir de sa DESCRIPTION et de son schéma.
#
# Règle d'or : une description floue produit des appels d'outils absurdes.
# Écrivez-la comme vous écririez une consigne à un stagiaire : ce que fait
# l'outil, quand l'utiliser, et surtout quand NE PAS l'utiliser.

OUTILS = [
    {
        "name": "rechercher_documents",
        "description": (
            "Cherche les passages les plus proches d'une question dans la base "
            "documentaire interne de l'entreprise (règlement des congés, note de "
            "frais, procédure de télétravail, charte d'usage de l'IA). "
            "Renvoie les extraits bruts avec leur source et leur score de "
            "similarité, SANS les reformuler. "
            "Utilise cet outil quand tu as besoin de citer un texte interne. "
            "N'utilise pas cet outil pour des questions générales sans rapport "
            "avec le fonctionnement interne de l'entreprise."
        ),
        # Le schéma décrit les arguments. C'est du JSON Schema, la même norme
        # que celle utilisée pour valider des API. Le modèle s'en sert pour
        # fabriquer un appel valide du premier coup.
        "inputSchema": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "La question, formulée en langage courant."
                },
                "nombre_extraits": {
                    "type": "integer",
                    "description": "Combien d'extraits renvoyer. Entre 1 et 10.",
                    "default": 3,
                    "minimum": 1,
                    "maximum": 10
                }
            },
            "required": ["question"]
        }
    },
    {
        "name": "repondre_avec_sources",
        "description": (
            "Répond à une question sur les procédures internes en s'appuyant "
            "UNIQUEMENT sur la base documentaire, et cite ses sources. "
            "Si la base ne contient pas la réponse, l'outil le dit explicitement "
            "au lieu d'inventer. "
            "Préfère cet outil à 'rechercher_documents' quand l'utilisateur veut "
            "une réponse rédigée plutôt que des extraits."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "question": {"type": "string", "description": "La question posée."}
            },
            "required": ["question"]
        }
    },
    {
        "name": "lister_documents",
        "description": (
            "Liste les documents présents dans la base, avec leur taille et le "
            "nombre de morceaux indexés. Utile pour savoir ce que la base "
            "contient AVANT de poser une question."
        ),
        "inputSchema": {"type": "object", "properties": {}}
    }
]


# ==================================================================
# 3. L'exécution des outils
# ==================================================================

def outil_rechercher_documents(arguments):
    """Implémentation de l'outil « rechercher_documents »."""
    question = arguments.get("question", "").strip()

    # On valide TOUJOURS les arguments. Le modèle envoie parfois une chaîne
    # vide, un nombre à la place d'un texte, ou un champ manquant.
    if not question:
        return "Erreur : la question est vide."

    # min/max : on borne, même si le schéma l'annonce déjà. Le schéma est
    # une indication pour le modèle, pas une garantie d'exécution.
    nombre = max(1, min(int(arguments.get("nombre_extraits", 3)), 10))

    resultats = base_documentaire().rechercher(question, nombre_de_resultats=nombre)

    if not resultats:
        return "Aucun extrait trouvé pour cette question."

    lignes = []
    for i, extrait in enumerate(resultats, start=1):
        source = extrait.get("metadonnees", {}).get("source", "source inconnue")
        score = extrait.get("score", 0)
        texte = extrait.get("texte", "")
        lignes.append(
            f"--- Extrait {i} | source : {source} | proximité : {score:.3f} ---\n{texte}"
        )

    return "\n\n".join(lignes)


def outil_repondre_avec_sources(arguments):
    """Implémentation de l'outil « repondre_avec_sources »."""
    question = arguments.get("question", "").strip()
    if not question:
        return "Erreur : la question est vide."

    # On réutilise la fonction de l'exercice 6 : le serveur MCP n'est
    # qu'une façade. Toute la logique reste dans rag.py, testée à part.
    resultat = rag.repondre(question, base_documentaire())

    sources = ", ".join(resultat.get("sources", [])) or "aucune"
    return f"{resultat.get('reponse', '')}\n\nSources : {sources}"


def outil_lister_documents(arguments):
    """Implémentation de l'outil « lister_documents »."""
    dossier = rag.DOSSIER_DOCUMENTS

    if not dossier.exists():
        return f"Le dossier {dossier} n'existe pas."

    base = base_documentaire()

    # On compte les morceaux par fichier source.
    # base.documents est la liste interne de la BaseVectorielle de l'exercice 5.
    compte_par_source = {}
    for entree in base.documents:
        source = entree.get("metadonnees", {}).get("source", "?")
        compte_par_source[source] = compte_par_source.get(source, 0) + 1

    lignes = [f"{len(base)} morceaux indexés au total.", ""]
    for fichier in sorted(dossier.glob("*.txt")):
        taille = fichier.stat().st_size
        morceaux = compte_par_source.get(fichier.name, 0)
        lignes.append(f"- {fichier.name} : {taille} octets, {morceaux} morceau(x)")

    return "\n".join(lignes)


# Le routeur : nom d'outil -> fonction. Un dictionnaire vaut mieux qu'une
# cascade de « if » : ajouter un outil ne demande de toucher qu'à deux endroits
# (la liste OUTILS et ce dictionnaire).
IMPLEMENTATIONS = {
    "rechercher_documents": outil_rechercher_documents,
    "repondre_avec_sources": outil_repondre_avec_sources,
    "lister_documents": outil_lister_documents,
}


# ==================================================================
# 4. La couche protocole (JSON-RPC 2.0)
# ==================================================================

def reponse_ok(identifiant, resultat):
    """Fabrique une réponse JSON-RPC de succès."""
    return {"jsonrpc": "2.0", "id": identifiant, "result": resultat}


def reponse_erreur(identifiant, code, message):
    """Fabrique une réponse JSON-RPC d'erreur.

    Les codes sont normalisés :
      -32700 JSON illisible, -32600 requête invalide,
      -32601 méthode inconnue, -32602 paramètres invalides,
      -32603 erreur interne.
    """
    return {"jsonrpc": "2.0", "id": identifiant, "error": {"code": code, "message": message}}


def traiter_message(message):
    """Traite un message entrant et renvoie la réponse, ou None.

    Renvoyer None est normal : les « notifications » (messages sans « id »)
    n'attendent aucune réponse. C'est le cas de « notifications/initialized ».
    """
    methode = message.get("method")
    identifiant = message.get("id")
    parametres = message.get("params") or {}

    # ---- initialize : la poignée de main ----------------------------------
    if methode == "initialize":
        return reponse_ok(identifiant, {
            # La version du protocole. Le client vérifie qu'il sait la parler.
            "protocolVersion": "2024-11-05",
            # On annonce ce que l'on sait faire. Ici : des outils, rien d'autre.
            # Un serveur peut aussi exposer des « resources » (des documents)
            # et des « prompts » (des modèles de requête).
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "rag-documentaire-local", "version": "1.0.0"}
        })

    # ---- notifications/initialized : le client confirme, sans attendre -----
    if methode == "notifications/initialized":
        return None

    # ---- tools/list : le catalogue ----------------------------------------
    if methode == "tools/list":
        return reponse_ok(identifiant, {"tools": OUTILS})

    # ---- tools/call : l'exécution -----------------------------------------
    if methode == "tools/call":
        nom = parametres.get("name")
        arguments = parametres.get("arguments") or {}

        if nom not in IMPLEMENTATIONS:
            return reponse_erreur(identifiant, -32602, f"Outil inconnu : {nom}")

        try:
            texte = IMPLEMENTATIONS[nom](arguments)

            # Le résultat est TOUJOURS une liste de blocs de contenu.
            # C'est ce qui permet de renvoyer du texte, une image ou un
            # document avec la même structure.
            return reponse_ok(identifiant, {
                "content": [{"type": "text", "text": texte}],
                "isError": False
            })

        except Exception as erreur:  # noqa: BLE001
            # On ne laisse JAMAIS une exception remonter : elle tuerait le
            # serveur et l'assistant perdrait la connexion. On renvoie
            # l'erreur comme un résultat, le modèle peut alors s'adapter.
            return reponse_ok(identifiant, {
                "content": [{"type": "text", "text": f"L'outil a échoué : {erreur}"}],
                "isError": True
            })

    # ---- toute autre méthode ----------------------------------------------
    if identifiant is None:
        return None                       # notification inconnue : on ignore
    return reponse_erreur(identifiant, -32601, f"Méthode non gérée : {methode}")


def boucle_principale():
    """Lit l'entrée standard ligne par ligne et répond sur la sortie standard.

    Un message = une ligne de JSON. C'est le transport « stdio » du protocole,
    le plus simple et le plus courant pour un serveur local.

    ATTENTION : sur ce transport, la sortie standard est RÉSERVÉE au protocole.
    Un simple print() de débogage casse la communication. Les messages de
    diagnostic doivent partir sur la sortie d'erreur (sys.stderr).
    """
    for ligne in sys.stdin:
        ligne = ligne.strip()
        if not ligne:
            continue

        try:
            message = json.loads(ligne)
        except json.JSONDecodeError:
            ecrire(reponse_erreur(None, -32700, "JSON illisible"))
            continue

        reponse = traiter_message(message)

        # None = notification : on ne répond pas, c'est voulu.
        if reponse is not None:
            ecrire(reponse)


def ecrire(objet):
    """Écrit un message JSON sur la sortie standard, suivi d'un saut de ligne."""
    sys.stdout.write(json.dumps(objet, ensure_ascii=False) + "\n")
    # flush() force l'envoi immédiat. Sans lui, Python garde le texte en
    # mémoire tampon et le client attend une réponse qui ne vient jamais.
    sys.stdout.flush()


def journal(message):
    """Écrit un message de diagnostic sur la sortie d'erreur."""
    sys.stderr.write(f"[serveur-mcp] {message}\n")
    sys.stderr.flush()


# ==================================================================
# 5. Le mode démonstration
# ==================================================================

def demonstration():
    """Rejoue une session complète, sans client, pour comprendre le protocole.

    C'est l'exercice à faire en premier : voir les quatre messages passer
    vaut mieux que dix pages d'explication.
    """
    echanges = [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize",
         "params": {"protocolVersion": "2024-11-05", "capabilities": {},
                    "clientInfo": {"name": "demo", "version": "1.0"}}},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
        {"jsonrpc": "2.0", "id": 3, "method": "tools/call",
         "params": {"name": "lister_documents", "arguments": {}}},
        {"jsonrpc": "2.0", "id": 4, "method": "tools/call",
         "params": {"name": "rechercher_documents",
                    "arguments": {"question": "combien de jours de congés",
                                  "nombre_extraits": 2}}},
        {"jsonrpc": "2.0", "id": 5, "method": "tools/call",
         "params": {"name": "repondre_avec_sources",
                    "arguments": {"question": "Puis-je télétravailler le lundi ?"}}},
    ]

    for envoi in echanges:
        print("\n" + "=" * 70)
        print("CLIENT  ->  " + json.dumps(envoi, ensure_ascii=False)[:160])
        reponse = traiter_message(envoi)
        brut = json.dumps(reponse, ensure_ascii=False, indent=2)
        print("SERVEUR <-  " + (brut[:900] + " […]" if len(brut) > 900 else brut))

    print("\n" + "=" * 70)
    print("C'est tout le protocole. Cinq messages, du JSON, une entrée standard.")


if __name__ == "__main__":
    if "--demo" in sys.argv:
        demonstration()
    else:
        journal("serveur MCP démarré, en attente de messages sur l'entrée standard")
        boucle_principale()
