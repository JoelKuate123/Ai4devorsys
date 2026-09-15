"""
exercice_6_rag_local/rag.py
----------------------------
Jour 3 · Module 6 · Travaux pratiques

ÉNONCÉ ORSYS
« Faire un "ChatGPT" local qui explore une base documentaire confidentielle
  avec une architecture RAG. »

C'est l'exercice de synthèse de la formation. Il réunit :
  - l'appel à un modèle (exercice 2) ;
  - la rédaction de prompt et le format imposé (exercice 3) ;
  - le choix d'un modèle local plutôt que cloud (exercice 4) ;
  - les embeddings et la similarité cosinus (exercice 5).

Aucun document ne quitte la machine : c'est tout l'intérêt.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from commun.llm_client import demander
from exercice_5_embeddings.embeddings_maison import BaseVectorielle


# Le dossier qui contient les documents à indexer
DOSSIER_DOCUMENTS = Path(__file__).parent / "documents"


# ------------------------------------------------------------------
# 1. Découper les documents en morceaux
# ------------------------------------------------------------------

def decouper(texte, taille=600, chevauchement=100):
    """Coupe un long texte en morceaux (« chunks ») qui se chevauchent.

    Pourquoi découper ?
      - un document entier ne tient pas dans le prompt ;
      - un morceau ciblé donne une réponse plus précise qu'un document entier.

    Pourquoi un chevauchement ?
      - pour ne pas couper une phrase importante en deux.
        Le début de chaque morceau reprend la fin du précédent.

    Réglages usuels : 400 à 1000 caractères, chevauchement de 10 à 20 %.
    """
    # Si le texte est court, inutile de le découper
    if len(texte) <= taille:
        return [texte.strip()] if texte.strip() else []

    morceaux = []      # la liste des morceaux produits
    debut = 0          # position de lecture dans le texte

    # On avance dans le texte tant qu'il reste quelque chose à lire
    while debut < len(texte):

        # On prend une tranche de `taille` caractères
        fin = debut + taille
        morceau = texte[debut:fin]

        # Si on n'est pas à la fin du texte, on essaie de couper proprement,
        # à la fin d'une phrase plutôt qu'au milieu d'un mot.
        if fin < len(texte):
            # rfind cherche la DERNIÈRE occurrence dans le morceau
            position_point = morceau.rfind(". ")

            # On ne coupe à la phrase que si le point est dans la seconde moitié,
            # sinon on obtiendrait des morceaux beaucoup trop courts.
            if position_point > taille // 2:
                morceau = morceau[:position_point + 1]
                fin = debut + position_point + 1

        # .strip() enlève les espaces et retours à la ligne aux extrémités
        morceau_propre = morceau.strip()

        # On ignore les morceaux vides
        if morceau_propre:
            morceaux.append(morceau_propre)

        # On avance, en revenant en arrière de `chevauchement` caractères.
        # max(..., debut + 1) garantit qu'on avance toujours : sans cela,
        # une boucle infinie serait possible.
        debut = max(fin - chevauchement, debut + 1)

    return morceaux


# ------------------------------------------------------------------
# 2. Indexer les documents
# ------------------------------------------------------------------

def indexer(dossier=None):
    """Lit tous les fichiers .txt d'un dossier et construit la base vectorielle.

    C'est la PHASE 1 du RAG : elle se fait une fois, à l'avance.
    En production, on la relance chaque nuit ou à chaque nouveau document.
    """
    # Si aucun dossier n'est précisé, on prend celui par défaut
    dossier = Path(dossier) if dossier else DOSSIER_DOCUMENTS

    base = BaseVectorielle()

    # Si le dossier n'existe pas, on renvoie une base vide plutôt que de planter
    if not dossier.exists():
        print(f"[rag] Dossier introuvable : {dossier}")
        return base

    # sorted(...) garantit un ordre stable d'une exécution à l'autre
    # glob("*.txt") liste tous les fichiers .txt du dossier
    for fichier in sorted(dossier.glob("*.txt")):

        # On lit tout le contenu du fichier
        contenu = fichier.read_text(encoding="utf-8")

        # On le découpe en morceaux
        morceaux = decouper(contenu)

        # On range chaque morceau dans la base, avec ses métadonnées.
        # Les métadonnées sont indispensables : sans elles, impossible de citer
        # la source, donc impossible de vérifier la réponse.
        for numero, morceau in enumerate(morceaux):
            base.ajouter(morceau, metadonnees={
                "source": fichier.name,      # nom du fichier
                "morceau": numero,           # position dans le document
            })

    return base


# ------------------------------------------------------------------
# 3. Construire le prompt à partir des extraits trouvés
# ------------------------------------------------------------------

# L'instruction système la plus importante de tout le RAG.
# C'est elle qui empêche le modèle d'inventer.
INSTRUCTION_SYSTEME = """Tu es l'assistant documentaire interne de l'organisation.

RÈGLES ABSOLUES
1. Tu réponds UNIQUEMENT à partir du CONTEXTE fourni ci-dessous.
2. Si le contexte ne contient pas l'information, tu réponds exactement :
   « Je ne trouve pas cette information dans les documents fournis. »
3. Tu n'utilises jamais tes connaissances générales pour compléter.
4. Après chaque affirmation, tu cites le document source entre crochets.
   Exemple : Le congé parental dure quatre mois. [reglement_conges.txt]
5. Tu réponds en français, en cinq phrases au maximum.
6. Si le contexte contient deux informations contradictoires, tu le signales."""


def construire_prompt(question, extraits):
    """Assemble le contexte et la question en un seul prompt.

    C'est le « A » de RAG : Augmented. On augmente la question
    avec les extraits pertinents.
    """
    # Cas particulier : rien n'a été trouvé
    if not extraits:
        return f"CONTEXTE\n(aucun extrait pertinent trouvé)\n\nQUESTION\n{question}"

    blocs = []   # un bloc de texte par extrait

    for numero, extrait in enumerate(extraits, 1):
        source = extrait["metadonnees"].get("source", "source inconnue")

        blocs.append(
            f"--- Extrait {numero} (source : {source}, "
            f"pertinence : {extrait['score']}) ---\n{extrait['texte']}"
        )

    # On colle tous les blocs avec une ligne vide entre chacun
    contexte = "\n\n".join(blocs)

    return f"""CONTEXTE

{contexte}

QUESTION
{question}

Réponds en respectant strictement les règles données."""


# ------------------------------------------------------------------
# 4. La fonction principale : poser une question
# ------------------------------------------------------------------

def repondre(question, base, nombre_dextraits=3, seuil=0.05):
    """Répond à une question à partir de la base documentaire.

    Paramètres
    ----------
    seuil : float
        Score minimum pour qu'un extrait soit considéré comme pertinent.
        En dessous, on préfère répondre « je ne sais pas » plutôt que
        de donner au modèle du contexte hors sujet, qui le ferait dériver.

    Retour
    ------
    Un dictionnaire contenant la réponse, les sources et les extraits utilisés.
    On renvoie TOUT cela pour que l'utilisateur puisse vérifier.
    """
    # --- Étape 1 : la recherche (le « R » de RAG) ---
    resultats = base.rechercher(question, nombre_de_resultats=nombre_dextraits)

    # --- Étape 2 : on écarte les extraits trop peu pertinents ---
    extraits = [ligne for ligne in resultats if ligne["score"] >= seuil]

    # --- Étape 3 : si rien ne passe le seuil, on n'appelle même pas le modèle ---
    # C'est un choix d'architecture : on économise un appel ET on évite
    # une réponse inventée.
    if not extraits:
        return {
            "reponse": "Je ne trouve pas cette information dans les documents fournis.",
            "sources": [],
            "extraits": [],
            "modele_appele": False,
        }

    # --- Étape 4 : on construit le prompt (le « A ») ---
    prompt = construire_prompt(question, extraits)

    # --- Étape 5 : on appelle le modèle (le « G » de Generation) ---
    # temperature=0.1 : sur une base documentaire, on veut de la fidélité,
    # surtout pas de la créativité.
    reponse = demander(prompt, systeme=INSTRUCTION_SYSTEME, temperature=0.1)

    # --- Étape 6 : on rassemble la liste des sources, sans doublon ---
    sources = []
    for extrait in extraits:
        source = extrait["metadonnees"].get("source")

        # « not in » évite de citer deux fois le même fichier
        if source and source not in sources:
            sources.append(source)

    return {
        "reponse": reponse,
        "sources": sources,
        "extraits": extraits,
        "modele_appele": True,
    }


# ------------------------------------------------------------------
# 5. La boucle de conversation
# ------------------------------------------------------------------

def conversation():
    """Petite interface en ligne de commande, comme un ChatGPT local."""
    print("Indexation des documents en cours...")

    base = indexer()

    print(f"{len(base)} morceaux indexés depuis {DOSSIER_DOCUMENTS.name}/")
    print("Posez vos questions. Tapez « quitter » pour sortir.\n")

    # while True = boucle infinie, dont on sort avec break
    while True:
        # input() attend que l'utilisateur tape quelque chose
        question = input("Vous > ").strip()

        # On sort si l'utilisateur le demande ou s'il ne tape rien
        if question.lower() in {"quitter", "exit", "quit", ""}:
            print("Au revoir.")
            break

        resultat = repondre(question, base)

        print(f"\nAssistant > {resultat['reponse']}")

        if resultat["sources"]:
            print(f"Sources : {', '.join(resultat['sources'])}")

        print()   # une ligne vide pour aérer


# ------------------------------------------------------------------
# 6. Programme principal
# ------------------------------------------------------------------

if __name__ == "__main__":
    # Si l'utilisateur a tapé une question dans le terminal, on y répond
    # directement. Sinon, on lance la conversation.
    if len(sys.argv) > 1:
        base = indexer()
        resultat = repondre(" ".join(sys.argv[1:]), base)

        print(resultat["reponse"])
        print(f"\nSources : {', '.join(resultat['sources']) or 'aucune'}")
    else:
        conversation()
