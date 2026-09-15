"""
commun/llm_client.py
--------------------
Notre petit client pour parler à un modèle de langage (LLM).

Pourquoi écrire notre propre client alors qu'il existe la bibliothèque `openai` ?
1. Pour comprendre ce qui se passe vraiment : une requête HTTP, rien de magique.
2. Pour n'installer qu'une seule bibliothèque (`requests`).
3. Pour avoir un « mode hors ligne » qui permet de suivre la formation
   même sans clé d'API et même sans internet.

Ce fichier est utilisé par TOUS les exercices de la formation.
"""

# ------------------------------------------------------------------
# 1. Les imports : les outils qu'on emprunte à d'autres bibliothèques
# ------------------------------------------------------------------

import os          # os = operating system ; sert à lire les variables d'environnement
import json        # json = format d'échange de données (du texte structuré)
import hashlib     # hashlib = pour transformer un texte en empreinte unique
from pathlib import Path   # Path = pour manipuler des chemins de fichiers proprement

import requests    # requests = pour envoyer des requêtes HTTP (parler à une API)


# ------------------------------------------------------------------
# 2. Charger le fichier .env
# ------------------------------------------------------------------

def charger_env():
    """Lit le fichier .env et met son contenu dans les variables d'environnement.

    On écrit nous-mêmes cette fonction (au lieu d'utiliser python-dotenv)
    pour que la code base fonctionne même si la bibliothèque n'est pas installée.
    """
    # Path(__file__) = le chemin de CE fichier (llm_client.py)
    # .parent = le dossier qui le contient (commun/)
    # .parent encore = le dossier au-dessus (codebase/)
    dossier_racine = Path(__file__).parent.parent

    # On construit le chemin vers le fichier .env
    fichier_env = dossier_racine / ".env"

    # Si le fichier n'existe pas, on ne fait rien : le mode hors ligne prendra le relais
    if not fichier_env.exists():
        return

    # On ouvre le fichier en lecture, en précisant l'encodage (accents français)
    with open(fichier_env, "r", encoding="utf-8") as f:
        # On parcourt le fichier ligne par ligne
        for ligne in f:
            # .strip() enlève les espaces et le retour à la ligne au début et à la fin
            ligne = ligne.strip()

            # On saute les lignes vides et les commentaires (qui commencent par #)
            if not ligne or ligne.startswith("#"):
                continue

            # On saute les lignes qui ne contiennent pas de signe =
            if "=" not in ligne:
                continue

            # split("=", 1) coupe la ligne au PREMIER signe = seulement
            # Exemple : "LLM_API_KEY=sk-abc=def" donne ["LLM_API_KEY", "sk-abc=def"]
            cle, valeur = ligne.split("=", 1)

            # setdefault : on écrit la valeur SEULEMENT si elle n'existe pas déjà.
            # Ainsi, une variable définie dans le terminal reste prioritaire.
            os.environ.setdefault(cle.strip(), valeur.strip())


# On appelle la fonction tout de suite, au moment où le fichier est importé
charger_env()


# ------------------------------------------------------------------
# 3. Le mode hors ligne : des réponses écrites à l'avance
# ------------------------------------------------------------------

# Le dossier où l'on range les réponses enregistrées
DOSSIER_CACHE = Path(__file__).parent / "reponses_hors_ligne"


def _empreinte(texte):
    """Transforme un texte en une petite empreinte de 16 caractères.

    Deux textes identiques donnent la même empreinte.
    Cela nous sert de nom de fichier pour ranger et retrouver une réponse.
    """
    # .encode("utf-8") transforme le texte en octets (obligatoire pour hashlib)
    octets = texte.encode("utf-8")

    # sha256 calcule une empreinte de 64 caractères
    empreinte_complete = hashlib.sha256(octets).hexdigest()

    # On ne garde que les 16 premiers caractères : c'est largement suffisant ici
    return empreinte_complete[:16]


def _reponse_rag_hors_ligne(prompt):
    """Fabrique une réponse RAG sans modèle, en recopiant le meilleur extrait.

    Un vrai modèle REFORMULE les extraits. Ici, on se contente de les CITER.
    C'est volontairement rustique : cela montre bien que le travail de
    recherche (le « R » de RAG) est déjà fait avant l'appel au modèle.
    """
    # On repère le premier extrait dans le prompt
    debut = prompt.find("--- Extrait 1")

    # Aucun extrait : on répond la phrase de refus prévue par la spécification
    if debut == -1:
        return "Je ne trouve pas cette information dans les documents fournis."

    # On isole le bloc du premier extrait
    bloc = prompt[debut:]

    # On coupe au deuxième extrait s'il existe
    fin = bloc.find("--- Extrait 2")
    if fin != -1:
        bloc = bloc[:fin]

    lignes = bloc.strip().split("\n")

    # La première ligne contient l'en-tête, avec le nom de la source
    entete = lignes[0]
    source = "document inconnu"
    if "source : " in entete:
        # On coupe après "source : " puis avant la virgule suivante
        source = entete.split("source : ")[1].split(",")[0].strip()

    # Le reste des lignes est le texte de l'extrait
    texte = " ".join(lignes[1:]).strip()

    # On ne garde que les 400 premiers caractères : une réponse doit être courte
    if len(texte) > 400:
        texte = texte[:400].rsplit(" ", 1)[0] + "..."

    return f"[MODE HORS LIGNE] D'après les documents : {texte} [{source}]"


def _reponse_hors_ligne(prompt):
    """Renvoie une réponse plausible sans appeler le réseau.

    On cherche d'abord une réponse enregistrée dans le dossier cache.
    Si on n'en trouve pas, on fabrique une réponse générique.
    """
    # On construit le nom du fichier attendu
    fichier = DOSSIER_CACHE / f"{_empreinte(prompt)}.txt"

    # Si le fichier existe, on renvoie son contenu
    if fichier.exists():
        return fichier.read_text(encoding="utf-8")

    # Sinon, on fabrique une réponse générique mais utilisable en formation.
    # On regarde des mots clés dans le prompt pour choisir la réponse.
    prompt_minuscules = prompt.lower()

    # Cas spécial RAG : le prompt contient un CONTEXTE et une QUESTION.
    # On fabrique une réponse « extractive » : on renvoie le premier extrait
    # et sa source. Ce n'est pas de la rédaction, mais cela permet de dérouler
    # la chaîne RAG complète en salle, même sans modèle installé.
    if "CONTEXTE" in prompt and "QUESTION" in prompt:
        return _reponse_rag_hors_ligne(prompt)

    if "json" in prompt_minuscules:
        # On renvoie un JSON valide : les exercices qui parsent du JSON fonctionneront
        return json.dumps(
            {"resultat": "mode hors ligne", "confiance": 0.5, "elements": []},
            ensure_ascii=False,   # garde les accents lisibles
        )

    if "html" in prompt_minuscules or "page web" in prompt_minuscules:
        # On renvoie une page HTML minimale mais valide
        return (
            "<!DOCTYPE html>\n<html lang=\"fr\">\n<head>\n"
            "<meta charset=\"utf-8\">\n<title>Page générée hors ligne</title>\n"
            "</head>\n<body>\n<h1>Page générée en mode hors ligne</h1>\n"
            "<p>Configurez LM Studio ou une clé d'API pour obtenir "
            "une vraie génération.</p>\n</body>\n</html>"
        )

    # Réponse par défaut
    return (
        "[MODE HORS LIGNE] Aucune réponse enregistrée pour ce prompt.\n"
        "Lancez LM Studio (http://localhost:1234) ou renseignez une clé d'API "
        "dans le fichier .env pour obtenir une vraie réponse du modèle."
    )


# ------------------------------------------------------------------
# 4. La fonction principale : demander(...)
# ------------------------------------------------------------------

def demander(prompt, systeme=None, temperature=0.7, format_json=False, modele=None):
    """Envoie un prompt au modèle et renvoie sa réponse sous forme de texte.

    Paramètres
    ----------
    prompt : str
        La question ou la consigne (ce qu'on appelle le message « user »).
    systeme : str ou None
        Le rôle donné au modèle (message « system »). Exemple :
        "Tu es un développeur Python senior."
    temperature : float
        Entre 0 et 2. Proche de 0 = réponses stables et prévisibles.
        Proche de 1 = réponses plus variées, plus créatives.
    format_json : bool
        Si True, on demande au modèle de répondre uniquement en JSON.
    modele : str ou None
        Nom du modèle. Si None, on prend celui du fichier .env.

    Retour
    ------
    str : le texte de la réponse.
    """
    # --- 4.1 On lit la configuration ---

    # os.environ.get("X", "valeur par défaut") lit une variable d'environnement
    base_url = os.environ.get("LLM_BASE_URL", "http://localhost:1234/v1")
    api_key = os.environ.get("LLM_API_KEY", "lm-studio")
    modele = modele or os.environ.get("LLM_MODEL", "local-model")

    # On regarde si le mode hors ligne est forcé dans le .env
    hors_ligne_force = os.environ.get("LLM_OFFLINE", "false").lower() == "true"

    if hors_ligne_force:
        return _reponse_hors_ligne(prompt)

    # --- 4.2 On construit la liste des messages ---

    # Une conversation avec un LLM est une LISTE de messages.
    # Chaque message est un dictionnaire avec un « role » et un « content ».
    messages = []

    # Le message system donne le rôle et les règles. Il est optionnel.
    if systeme:
        messages.append({"role": "system", "content": systeme})

    # Le message user contient notre demande
    messages.append({"role": "user", "content": prompt})

    # --- 4.3 On construit le corps de la requête ---

    corps = {
        "model": modele,              # quel modèle utiliser
        "messages": messages,         # la conversation
        "temperature": temperature,   # le niveau de créativité
    }

    # Si on veut du JSON, on l'indique au serveur.
    # Attention : tous les modèles locaux ne savent pas le faire.
    if format_json:
        corps["response_format"] = {"type": "json_object"}

    # --- 4.4 On envoie la requête HTTP ---

    # Les en-têtes (headers) transportent la clé d'API et le type de contenu
    entetes = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",   # format standard : "Bearer <clé>"
    }

    try:
        # requests.post envoie une requête HTTP de type POST
        reponse = requests.post(
            f"{base_url}/chat/completions",  # la route standard « chat »
            headers=entetes,                 # nos en-têtes
            json=corps,                      # le corps, converti en JSON automatiquement
            timeout=60,                      # on abandonne au bout de 60 secondes
        )

        # raise_for_status lève une erreur si le serveur a répondu 401, 404, 500...
        reponse.raise_for_status()

        # .json() transforme le texte de la réponse en dictionnaire Python
        donnees = reponse.json()

        # Le texte se trouve toujours au même endroit dans la réponse :
        # donnees["choices"][0]["message"]["content"]
        return donnees["choices"][0]["message"]["content"]

    except Exception as erreur:
        # Si quoi que ce soit échoue (pas de serveur, pas de réseau, mauvaise clé),
        # on bascule en mode hors ligne au lieu de faire planter l'exercice.
        print(f"[llm_client] Appel impossible ({erreur}) → bascule en mode hors ligne.")
        return _reponse_hors_ligne(prompt)


def demander_json(prompt, systeme=None, temperature=0.2):
    """Comme demander(), mais renvoie un dictionnaire Python au lieu d'un texte.

    Très utile quand on veut brancher la sortie du modèle dans du code.
    """
    # On demande explicitement du JSON, avec une température basse (réponses stables)
    texte = demander(prompt, systeme=systeme, temperature=temperature, format_json=True)

    # Les modèles ajoutent parfois des ``` autour du JSON. On les enlève.
    texte = texte.strip()
    if texte.startswith("```"):
        # On coupe le texte en lignes
        lignes = texte.split("\n")
        # On enlève la première ligne (```json) et la dernière (```)
        texte = "\n".join(lignes[1:-1])

    try:
        # json.loads transforme du texte JSON en dictionnaire Python
        return json.loads(texte)
    except json.JSONDecodeError:
        # Si le modèle a mal répondu, on renvoie un dictionnaire d'erreur
        # plutôt que de faire planter le programme.
        return {"erreur": "réponse non parsable", "texte_brut": texte}


# ------------------------------------------------------------------
# 5. Test rapide quand on lance le fichier directement
# ------------------------------------------------------------------

# La ligne ci-dessous est vraie SEULEMENT si on lance « python llm_client.py ».
# Elle est fausse si le fichier est importé par un autre fichier.
if __name__ == "__main__":
    print("Test du client LLM...")
    print(demander("Dis bonjour en une phrase.", systeme="Tu réponds en français."))
