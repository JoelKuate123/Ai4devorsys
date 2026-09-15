"""
exercice_5_embeddings/test_embeddings.py
-----------------------------------------
Tests de l'exercice 5. Tout est calculé en local : ni réseau ni clé d'API.
"""

import sys
import math
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest

from exercice_5_embeddings.embeddings_maison import (
    DIMENSION,
    enlever_accents,
    decouper_en_mots,
    embedding,
    normaliser,
    similarite_cosinus,
    produit_scalaire,
    BaseVectorielle,
    reduire_a_deux_dimensions,
)


# ---------- Préparation du texte ----------

def test_enlever_accents():
    assert enlever_accents("déjà vu à Noël") == "deja vu a Noel"


def test_decouper_retire_les_mots_vides():
    mots = decouper_en_mots("le congé parental et la demande")

    assert "conge" in mots      # accent enlevé
    assert "le" not in mots     # mot vide retiré
    assert "et" not in mots


def test_decouper_retire_la_ponctuation():
    mots = decouper_en_mots("congé, parental ! (quatre mois)")

    assert mots == ["conge", "parental", "quatre", "mois"]


def test_decouper_ignore_la_casse():
    assert decouper_en_mots("CONGÉ Parental") == decouper_en_mots("congé parental")


# ---------- L'embedding ----------

def test_embedding_a_la_bonne_taille():
    vecteur = embedding("un texte quelconque")

    assert len(vecteur) == DIMENSION


def test_embedding_est_normalise():
    """La longueur du vecteur doit valoir 1."""
    vecteur = embedding("le congé parental dure quatre mois")

    longueur = math.sqrt(sum(v * v for v in vecteur))

    # approx compare des nombres à virgule sans exiger l'égalité parfaite
    assert longueur == pytest.approx(1.0)


def test_embedding_est_reproductible():
    """Le même texte doit toujours donner le même vecteur.

    C'est indispensable : sinon, une base indexée hier
    ne serait plus interrogeable aujourd'hui.
    """
    assert embedding("congé parental") == embedding("congé parental")


def test_embedding_dun_texte_vide_ne_plante_pas():
    vecteur = embedding("")

    assert len(vecteur) == DIMENSION
    assert all(valeur == 0.0 for valeur in vecteur)


# ---------- La similarité cosinus ----------

def test_similarite_dun_vecteur_avec_lui_meme_vaut_un():
    vecteur = embedding("le télétravail est autorisé deux jours par semaine")

    assert similarite_cosinus(vecteur, vecteur) == pytest.approx(1.0)


def test_deux_textes_proches_sont_plus_similaires_que_deux_textes_eloignes():
    """C'est LA propriété qui rend le RAG possible."""
    question = embedding("comment demander un congé parental")
    proche = embedding("procédure de demande de congé parental")
    eloigne = embedding("le prix des imprimantes laser a baissé")

    assert similarite_cosinus(question, proche) > similarite_cosinus(question, eloigne)


def test_similarite_avec_un_vecteur_nul_vaut_zero():
    assert similarite_cosinus([0, 0, 0], [1, 2, 3]) == 0.0


def test_similarite_refuse_des_tailles_differentes():
    with pytest.raises(ValueError):
        similarite_cosinus([1, 2], [1, 2, 3])


def test_produit_scalaire():
    # 1×4 + 2×5 + 3×6 = 4 + 10 + 18 = 32
    assert produit_scalaire([1, 2, 3], [4, 5, 6]) == 32


def test_normaliser_ramene_la_longueur_a_un():
    resultat = normaliser([3, 4])   # longueur 5 (triangle 3-4-5)

    assert resultat == pytest.approx([0.6, 0.8])


def test_normaliser_gere_le_vecteur_nul():
    assert normaliser([0, 0, 0]) == [0, 0, 0]


# ---------- La base vectorielle ----------

@pytest.fixture
def base_remplie():
    """Une petite base documentaire d'entreprise, pour les tests."""
    base = BaseVectorielle()
    base.ajouter_plusieurs([
        "Le congé parental dure quatre mois par enfant.",
        "La demande de télétravail se fait auprès du responsable hiérarchique.",
        "Les notes de frais sont remboursées le 15 de chaque mois.",
        "Le congé de paternité est de vingt jours ouvrables.",
        "Le parc informatique est renouvelé tous les quatre ans.",
    ])
    return base


def test_la_base_compte_ses_documents(base_remplie):
    assert len(base_remplie) == 5


def test_la_recherche_renvoie_le_bon_nombre_de_resultats(base_remplie):
    resultats = base_remplie.rechercher("congé", nombre_de_resultats=2)

    assert len(resultats) == 2


def test_la_recherche_remonte_le_document_pertinent(base_remplie):
    """Le premier résultat doit parler de congé parental."""
    resultats = base_remplie.rechercher("combien de temps dure le congé parental", 1)

    assert "congé parental" in resultats[0]["texte"]


def test_les_resultats_sont_tries_du_meilleur_au_moins_bon(base_remplie):
    resultats = base_remplie.rechercher("télétravail", nombre_de_resultats=5)

    scores = [ligne["score"] for ligne in resultats]

    # reverse=True car on attend un ordre décroissant
    assert scores == sorted(scores, reverse=True)


def test_la_base_stocke_les_metadonnees():
    base = BaseVectorielle()
    base.ajouter("Le congé parental dure quatre mois.",
                 metadonnees={"source": "reglement.pdf", "page": 12})

    resultat = base.rechercher("congé parental", 1)[0]

    assert resultat["metadonnees"]["source"] == "reglement.pdf"
    assert resultat["metadonnees"]["page"] == 12


def test_une_base_vide_ne_plante_pas():
    base = BaseVectorielle()

    assert base.rechercher("n'importe quoi") == []


# ---------- La réduction de dimension ----------

def test_la_reduction_donne_des_points_a_deux_coordonnees():
    vecteurs = [embedding("congé parental"), embedding("note de frais")]

    points = reduire_a_deux_dimensions(vecteurs)

    assert len(points) == 2
    assert len(points[0]) == 2


def test_la_reduction_gere_une_liste_vide():
    assert reduire_a_deux_dimensions([]) == []
