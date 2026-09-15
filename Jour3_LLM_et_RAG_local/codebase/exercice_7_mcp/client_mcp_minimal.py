"""
exercice_7_mcp/client_mcp_minimal.py
-------------------------------------
Le CLIENT MCP, en soixante lignes utiles.

Pourquoi écrire un client alors qu'on va utiliser Claude Code ou Codex ?
Parce que voir les deux côtés du tuyau enlève toute la magie. Après cet
exercice, « brancher un MCP » ne sera plus une case à cocher dans un fichier
de configuration : ce sera un processus enfant à qui l'on parle en JSON.

Ce client fait exactement ce que fait un assistant :
  1. il démarre le serveur comme un sous-processus ;
  2. il envoie « initialize », puis « tools/list » ;
  3. il appelle un outil ;
  4. il ferme proprement.

Lancement :  python exercice_7_mcp/client_mcp_minimal.py
"""

import json
import subprocess
import sys
from pathlib import Path

# Le chemin du serveur à démarrer. On le calcule à partir de CE fichier :
# ainsi le script marche quel que soit le dossier depuis lequel on le lance.
SERVEUR = Path(__file__).parent / "serveur_mcp.py"


class ClientMCP:
    """Un client MCP minimal, sur le transport « stdio »."""

    def __init__(self, commande):
        """Démarre le serveur comme un processus enfant.

        stdin et stdout du serveur deviennent nos tuyaux d'échange.
        stderr reste séparé : c'est là que le serveur écrit ses diagnostics.
        """
        self.processus = subprocess.Popen(
            commande,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=sys.stderr,        # les messages du serveur s'affichent chez nous
            text=True,                # on travaille en texte, pas en octets
            encoding="utf-8",
            bufsize=1                 # ligne par ligne : indispensable ici
        )
        self.compteur = 0             # pour numéroter les messages

    def appeler(self, methode, parametres=None):
        """Envoie une requête et attend la réponse correspondante."""
        self.compteur += 1

        requete = {"jsonrpc": "2.0", "id": self.compteur, "method": methode}
        if parametres is not None:
            requete["params"] = parametres

        # --- envoi ---
        ligne = json.dumps(requete, ensure_ascii=False)
        self.processus.stdin.write(ligne + "\n")
        self.processus.stdin.flush()      # sans flush, le serveur n'a rien reçu

        # --- réception ---
        reponse_brute = self.processus.stdout.readline()
        if not reponse_brute:
            raise RuntimeError("Le serveur s'est arrêté sans répondre.")

        return json.loads(reponse_brute)

    def notifier(self, methode, parametres=None):
        """Envoie une notification : aucun « id », donc aucune réponse attendue."""
        message = {"jsonrpc": "2.0", "method": methode}
        if parametres is not None:
            message["params"] = parametres

        self.processus.stdin.write(json.dumps(message, ensure_ascii=False) + "\n")
        self.processus.stdin.flush()

    def fermer(self):
        """Ferme le tuyau : le serveur voit sa boucle de lecture se terminer."""
        self.processus.stdin.close()
        self.processus.wait(timeout=5)


def main():
    print("Démarrage du serveur MCP…\n")
    client = ClientMCP([sys.executable, str(SERVEUR)])

    try:
        # --- Étape 1 : la poignée de main -------------------------------
        infos = client.appeler("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "client-minimal", "version": "1.0"}
        })
        serveur = infos["result"]["serverInfo"]
        print(f"Connecté à « {serveur['name']} » version {serveur['version']}.")

        # Le client confirme qu'il est prêt. C'est une notification :
        # on n'attend pas de réponse, et le serveur n'en envoie pas.
        client.notifier("notifications/initialized")

        # --- Étape 2 : le catalogue -------------------------------------
        catalogue = client.appeler("tools/list")
        outils = catalogue["result"]["tools"]

        print(f"\n{len(outils)} outil(s) disponible(s) :")
        for outil in outils:
            # On tronque la description : c'est celle que LE MODÈLE lit
            # en entier pour décider s'il appelle cet outil.
            print(f"  - {outil['name']} : {outil['description'][:70]}…")

        # --- Étape 3 : un appel d'outil ---------------------------------
        print("\nAppel de « rechercher_documents »…\n")
        resultat = client.appeler("tools/call", {
            "name": "rechercher_documents",
            "arguments": {"question": "quel est le plafond des notes de frais",
                          "nombre_extraits": 2}
        })

        for bloc in resultat["result"]["content"]:
            print(bloc["text"])

        # --- Étape 4 : un appel volontairement invalide ------------------
        print("\nAppel d'un outil qui n'existe pas, pour voir l'erreur :\n")
        erreur = client.appeler("tools/call", {"name": "formater_le_disque", "arguments": {}})
        print(json.dumps(erreur, ensure_ascii=False, indent=2))

    finally:
        # On ferme TOUJOURS, même en cas d'erreur : sinon le processus
        # serveur reste en vie et consomme de la mémoire.
        client.fermer()
        print("\nServeur arrêté.")


if __name__ == "__main__":
    main()
