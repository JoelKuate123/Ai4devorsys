"""
exercice_6_rag_local/test_rag.py
---------------------------------
Tests de l'exercice 6 : la chaîne RAG complète.

Les tests vérifient les trois propriétés qui font un RAG fiable :
  1. la recherche remonte le bon document ;
  2. le modèle reçoit un prompt qui contient le contexte ET les règles ;
  3. quand rien n'est trouvé, on ne fabrique pas de réponse.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from exercice_6_rag_local import rag as module_rag
from exercice_6_rag_local.rag import (
    decouper,
    indexer,
    construire_prompt,
    repondre,
    INSTRUCTION_SYSTEME,
    DOSSIER_DOCUMENTS,
)


# ---------- Le découpage ----------

def test_un_texte_court_reste_en_un_seul_morceau():
    morceaux = decouper("Une phrase courte.", taille=600)

    assert len(morceaux) == 1


def test_un_texte_long_est_decoupe_en_plusieurs_morceaux():
    texte = "Phrase de test numéro un. " * 100   # environ 2600 caractères

    morceaux = decouper(texte, taille=500, chevauchement=50)

    assert len(morceaux) > 1


def test_aucun_morceau_ne_depasse_la_taille_demandee():
    texte = "Mot " * 500

    for morceau in decouper(texte, taille=300, chevauchement=50):
        assert len(morceau) <= 300


def test_le_decoupage_ne_perd_pas_le_debut_du_texte():
    texte = "PREMIER MOT du document. " + ("suite " * 300)

    morceaux = decouper(texte, taille=200, chevauchement=40)

    assert morceaux[0].startswith("PREMIER MOT")


def test_un_texte_vide_ne_donne_aucun_morceau():
    assert decouper("") == []
    assert decouper("   \n  ") == []


def test_le_decoupage_termine_toujours():
    """Garde-fou anti-boucle-infinie : chevauchement plus grand que la taille."""
    morceaux = decouper("a" * 1000, taille=100, chevauchement=200)

    assert len(morceaux) > 0   # si le test se termine, c'est déjà gagné


# ---------- L'indexation ----------

@pytest.fixture
def base():
    """Indexe les vrais documents d'exemple une fois pour tous les tests."""
    return indexer()


def test_les_documents_dexemple_existent():
    fichiers = list(DOSSIER_DOCUMENTS.glob("*.txt"))

    assert len(fichiers) >= 4


def test_lindexation_produit_des_morceaux(base):
    assert len(base) > 0


def test_chaque_morceau_connait_sa_source(base):
    """Sans source, pas de citation possible : c'est éliminatoire."""
    for document in base.documents:
        assert "source" in document["metadonnees"]
        assert document["metadonnees"]["source"].endswith(".txt")


def test_un_dossier_inexistant_donne_une_base_vide():
    base_vide = indexer("/chemin/qui/nexiste/pas")

    assert len(base_vide) == 0


# ---------- La recherche ----------

def test_la_recherche_trouve_le_bon_document_pour_les_conges(base):
    resultats = base.rechercher("durée du congé parental", nombre_de_resultats=1)

    assert resultats[0]["metadonnees"]["source"] == "reglement_conges.txt"


def test_la_recherche_trouve_le_bon_document_pour_le_teletravail(base):
    resultats = base.rechercher("combien de jours de télétravail par semaine", 1)

    assert resultats[0]["metadonnees"]["source"] == "procedure_teletravail.txt"


def test_la_recherche_trouve_le_bon_document_pour_les_frais(base):
    resultats = base.rechercher("remboursement kilométrique véhicule personnel", 1)

    assert resultats[0]["metadonnees"]["source"] == "note_frais.txt"


def test_la_recherche_trouve_le_bon_document_pour_la_charte_ia(base):
    resultats = base.rechercher("puis-je envoyer des données confidentielles à une IA", 1)

    assert resultats[0]["metadonnees"]["source"] == "charte_ia.txt"


# ---------- Le prompt ----------

def test_le_prompt_contient_la_question_et_les_extraits():
    extraits = [{
        "texte": "Le congé parental dure quatre mois.",
        "score": 0.8,
        "metadonnees": {"source": "reglement_conges.txt"},
    }]

    prompt = construire_prompt("Quelle est la durée du congé parental ?", extraits)

    assert "Quelle est la durée du congé parental ?" in prompt
    assert "Le congé parental dure quatre mois." in prompt
    assert "reglement_conges.txt" in prompt   # la source est visible du modèle


def test_le_prompt_signale_labsence_dextraits():
    prompt = construire_prompt("Une question sans réponse", [])

    assert "aucun extrait pertinent" in prompt


def test_linstruction_systeme_interdit_les_connaissances_generales():
    """La règle qui empêche l'hallucination doit être présente, mot pour mot."""
    assert "UNIQUEMENT à partir du CONTEXTE" in INSTRUCTION_SYSTEME
    assert "Je ne trouve pas cette information" in INSTRUCTION_SYSTEME
    assert "cites le document source" in INSTRUCTION_SYSTEME


# ---------- La réponse complète ----------

def test_repondre_appelle_le_modele_et_cite_les_sources(base, monkeypatch):
    """Chaîne complète, avec un faux modèle."""
    prompts_recus = []   # on enregistrera ce qui est envoyé au modèle

    def faux_demander(prompt, systeme=None, temperature=0.7, format_json=False, modele=None):
        prompts_recus.append({"prompt": prompt, "systeme": systeme})
        return "Le congé parental dure quatre mois. [reglement_conges.txt]"

    monkeypatch.setattr(module_rag, "demander", faux_demander)

    resultat = repondre("Quelle est la durée du congé parental ?", base)

    # Le modèle a bien été appelé une fois
    assert resultat["modele_appele"] is True
    assert len(prompts_recus) == 1

    # Le prompt envoyé contenait bien le contexte
    assert "CONTEXTE" in prompts_recus[0]["prompt"]

    # L'instruction anti-hallucination était bien en place
    assert "UNIQUEMENT" in prompts_recus[0]["systeme"]

    # Les sources sont remontées à l'utilisateur
    assert "reglement_conges.txt" in resultat["sources"]


def test_repondre_nappelle_pas_le_modele_si_rien_nest_trouve(base, monkeypatch):
    """Économie d'appel ET protection contre l'invention."""
    appels = []

    def faux_demander(*args, **kwargs):
        appels.append(1)
        return "une réponse inventée"

    monkeypatch.setattr(module_rag, "demander", faux_demander)

    # Un seuil de 0,99 est impossible à atteindre : rien ne passera
    resultat = repondre("question hors sujet", base, seuil=0.99)

    assert resultat["modele_appele"] is False
    assert len(appels) == 0          # aucun appel, donc aucun coût
    assert resultat["sources"] == []
    assert "Je ne trouve pas" in resultat["reponse"]


def test_les_sources_ne_sont_jamais_dupliquees(base, monkeypatch):
    """Si trois extraits viennent du même fichier, on ne le cite qu'une fois."""
    monkeypatch.setattr(module_rag, "demander", lambda *a, **k: "réponse")

    resultat = repondre("congé parental durée demande formulaire", base,
                        nombre_dextraits=5)

    assert len(resultat["sources"]) == len(set(resultat["sources"]))
