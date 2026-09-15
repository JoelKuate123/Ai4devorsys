"""
exercice_7_mcp/test_serveur_mcp.py
-----------------------------------
Les tests du serveur MCP.

Ce qu'on teste : la couche PROTOCOLE. C'est elle qui casse le plus souvent,
et c'est elle qu'un assistant ne pardonne pas : un seul champ mal nommé,
et la connexion échoue sans message clair.

Lancement :  pytest exercice_7_mcp/ -v
"""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from exercice_7_mcp import serveur_mcp  # noqa: E402


# ------------------------------------------------------------------
# 1. La poignée de main
# ------------------------------------------------------------------

def test_initialize_annonce_la_version_du_protocole():
    """Sans version de protocole, le client refuse la connexion."""
    reponse = serveur_mcp.traiter_message({
        "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}
    })

    assert reponse["jsonrpc"] == "2.0"
    assert reponse["id"] == 1
    assert "protocolVersion" in reponse["result"]
    assert "tools" in reponse["result"]["capabilities"]


def test_initialize_donne_un_nom_de_serveur():
    """Le nom s'affiche dans l'interface de l'assistant : il doit être parlant."""
    reponse = serveur_mcp.traiter_message({
        "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}
    })
    assert reponse["result"]["serverInfo"]["name"]


def test_une_notification_ne_recoit_pas_de_reponse():
    """Un message sans « id » est une notification : y répondre casse le client."""
    assert serveur_mcp.traiter_message({
        "jsonrpc": "2.0", "method": "notifications/initialized"
    }) is None


# ------------------------------------------------------------------
# 2. Le catalogue d'outils
# ------------------------------------------------------------------

def test_tools_list_renvoie_les_trois_outils():
    reponse = serveur_mcp.traiter_message({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    noms = [outil["name"] for outil in reponse["result"]["tools"]]

    assert "rechercher_documents" in noms
    assert "repondre_avec_sources" in noms
    assert "lister_documents" in noms


def test_chaque_outil_a_une_description_utile():
    """Une description de moins de cinquante caractères produit des appels absurdes."""
    reponse = serveur_mcp.traiter_message({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})

    for outil in reponse["result"]["tools"]:
        assert len(outil["description"]) > 50, f"Description trop courte : {outil['name']}"
        assert "inputSchema" in outil
        assert outil["inputSchema"]["type"] == "object"


def test_le_schema_declare_les_champs_obligatoires():
    reponse = serveur_mcp.traiter_message({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    outils = {o["name"]: o for o in reponse["result"]["tools"]}

    assert outils["rechercher_documents"]["inputSchema"]["required"] == ["question"]


# ------------------------------------------------------------------
# 3. L'appel d'outils
# ------------------------------------------------------------------

def test_lister_documents_renvoie_du_texte():
    reponse = serveur_mcp.traiter_message({
        "jsonrpc": "2.0", "id": 3, "method": "tools/call",
        "params": {"name": "lister_documents", "arguments": {}}
    })

    contenu = reponse["result"]["content"]
    assert contenu[0]["type"] == "text"
    assert "morceaux indexés" in contenu[0]["text"]
    assert reponse["result"]["isError"] is False


def test_rechercher_documents_cite_ses_sources():
    """Un extrait sans source est inutilisable : impossible de vérifier."""
    reponse = serveur_mcp.traiter_message({
        "jsonrpc": "2.0", "id": 4, "method": "tools/call",
        "params": {"name": "rechercher_documents",
                   "arguments": {"question": "jours de congé annuel"}}
    })

    texte = reponse["result"]["content"][0]["text"]
    assert "source :" in texte
    assert "reglement_conges.txt" in texte


def test_rechercher_documents_borne_le_nombre_dextraits():
    """Le modèle demande parfois 500 extraits. On borne, sans se plaindre."""
    reponse = serveur_mcp.traiter_message({
        "jsonrpc": "2.0", "id": 4, "method": "tools/call",
        "params": {"name": "rechercher_documents",
                   "arguments": {"question": "congé", "nombre_extraits": 500}}
    })

    texte = reponse["result"]["content"][0]["text"]
    assert texte.count("--- Extrait") <= 10


def test_une_question_vide_donne_une_erreur_lisible():
    reponse = serveur_mcp.traiter_message({
        "jsonrpc": "2.0", "id": 4, "method": "tools/call",
        "params": {"name": "rechercher_documents", "arguments": {"question": "   "}}
    })

    assert "vide" in reponse["result"]["content"][0]["text"].lower()


def test_un_outil_inconnu_renvoie_une_erreur_jsonrpc():
    reponse = serveur_mcp.traiter_message({
        "jsonrpc": "2.0", "id": 5, "method": "tools/call",
        "params": {"name": "supprimer_la_base", "arguments": {}}
    })

    assert "error" in reponse
    assert reponse["error"]["code"] == -32602


def test_une_methode_inconnue_renvoie_une_erreur_jsonrpc():
    reponse = serveur_mcp.traiter_message({
        "jsonrpc": "2.0", "id": 6, "method": "resources/list"
    })

    assert reponse["error"]["code"] == -32601


def test_une_exception_dans_un_outil_ne_tue_pas_le_serveur():
    """Point capital : si l'outil plante, le serveur doit rester debout."""
    original = serveur_mcp.IMPLEMENTATIONS["lister_documents"]

    def outil_qui_plante(_arguments):
        raise RuntimeError("disque plein")

    serveur_mcp.IMPLEMENTATIONS["lister_documents"] = outil_qui_plante
    try:
        reponse = serveur_mcp.traiter_message({
            "jsonrpc": "2.0", "id": 7, "method": "tools/call",
            "params": {"name": "lister_documents", "arguments": {}}
        })

        # On renvoie un RÉSULTAT marqué en erreur, pas une erreur de protocole :
        # le modèle peut alors lire le message et changer de stratégie.
        assert reponse["result"]["isError"] is True
        assert "disque plein" in reponse["result"]["content"][0]["text"]
    finally:
        serveur_mcp.IMPLEMENTATIONS["lister_documents"] = original


# ------------------------------------------------------------------
# 4. La sérialisation
# ------------------------------------------------------------------

def test_toutes_les_reponses_sont_serialisables_en_json():
    """Un objet non sérialisable casse la communication sans message clair."""
    messages = [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list"},
        {"jsonrpc": "2.0", "id": 3, "method": "tools/call",
         "params": {"name": "lister_documents", "arguments": {}}},
    ]

    for message in messages:
        reponse = serveur_mcp.traiter_message(message)
        # Si json.dumps échoue, le test échoue : c'est exactement le but.
        json.dumps(reponse, ensure_ascii=False)


@pytest.mark.parametrize("nom", ["rechercher_documents", "repondre_avec_sources", "lister_documents"])
def test_chaque_outil_declare_a_bien_une_implementation(nom):
    """Un outil annoncé mais non implémenté est le bug le plus frustrant du MCP."""
    assert nom in serveur_mcp.IMPLEMENTATIONS
