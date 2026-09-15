"""
interface_web/serveur_rag.py
-----------------------------
Le pont entre le RAG (Python) et l'interface web (HTML/CSS/JS).

POURQUOI CE FICHIER
Le moteur RAG est en Python : il lit des fichiers sur le disque, ce qu'un
navigateur ne sait pas faire. L'interface, elle, est en HTML/CSS/JS.
Ce serveur relie les deux, et sert au passage de démonstration de
l'architecture réelle d'une application IA :

    navigateur  ->  VOTRE serveur  ->  modèle
                     (la clé est ici, jamais dans le navigateur)

Aucune dépendance : uniquement la bibliothèque standard de Python.

LANCEMENT
    python interface_web/serveur_rag.py
    puis ouvrez http://localhost:8000
"""

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from exercice_6_rag_local import rag  # noqa: E402

PORT = 8000
DOSSIER_STATIQUE = Path(__file__).parent

# On indexe UNE fois au démarrage, pas à chaque requête.
print("[serveur-rag] indexation des documents…")
BASE = rag.indexer()
print(f"[serveur-rag] {len(BASE)} morceaux indexés.")

# Types MIME : sans eux, le navigateur affiche le JavaScript comme du texte.
TYPES = {".html": "text/html; charset=utf-8",
         ".js": "text/javascript; charset=utf-8",
         ".css": "text/css; charset=utf-8"}


class Gestionnaire(BaseHTTPRequestHandler):
    """Traite les requêtes HTTP entrantes."""

    def do_GET(self):
        """Sert les fichiers de l'interface."""
        chemin = "/index.html" if self.path == "/" else self.path.split("?")[0]

        # SÉCURITÉ : on empêche « ../../ ». Sans cette ligne, tout le disque
        # devient téléchargeable. C'est la faille la plus ancienne du web.
        fichier = (DOSSIER_STATIQUE / chemin.lstrip("/")).resolve()
        if not str(fichier).startswith(str(DOSSIER_STATIQUE.resolve())):
            return self._texte(403, "Accès refusé.")

        if not fichier.exists() or not fichier.is_file():
            return self._texte(404, f"Introuvable : {chemin}")

        contenu = fichier.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", TYPES.get(fichier.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(len(contenu)))
        self.end_headers()
        self.wfile.write(contenu)

    def do_POST(self):
        """Traite les appels de l'interface au moteur RAG."""
        if self.path != "/api/demander":
            return self._json(404, {"erreur": "Route inconnue."})

        # On lit le corps de la requête, en bornant sa taille.
        longueur = int(self.headers.get("Content-Length", 0))
        if longueur > 20000:
            return self._json(413, {"erreur": "Requête trop volumineuse."})

        try:
            corps = json.loads(self.rfile.read(longueur) or b"{}")
        except json.JSONDecodeError:
            return self._json(400, {"erreur": "JSON invalide."})

        question = str(corps.get("question", "")).strip()
        if len(question) < 3:
            return self._json(400, {"erreur": "Question trop courte."})

        # On appelle le moteur de l'exercice 6, sans le modifier.
        resultat = rag.repondre(question, BASE)

        # On renvoie TOUT : réponse, sources ET extraits. C'est la condition
        # pour que l'utilisateur puisse vérifier. Une réponse RAG sans ses
        # extraits n'est qu'un chatbot de plus.
        return self._json(200, {
            "question": question,
            "reponse": resultat["reponse"],
            "sources": resultat["sources"],
            "extraits": [
                {"texte": e["texte"][:600],
                 "score": e["score"],
                 "source": e["metadonnees"].get("source", "?")}
                for e in resultat["extraits"]
            ],
            "modele_appele": resultat["modele_appele"]
        })

    # ---- utilitaires -----------------------------------------------------

    def _json(self, code, objet):
        contenu = json.dumps(objet, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(contenu)))
        self.end_headers()
        self.wfile.write(contenu)

    def _texte(self, code, message):
        contenu = message.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(contenu)))
        self.end_headers()
        self.wfile.write(contenu)

    def log_message(self, format, *args):
        """Journal allégé : une ligne par requête, sans le bruit habituel."""
        sys.stderr.write(f"[serveur-rag] {self.command} {self.path}\n")


if __name__ == "__main__":
    serveur = HTTPServer(("127.0.0.1", PORT), Gestionnaire)
    print(f"[serveur-rag] prêt sur http://localhost:{PORT}")
    print("[serveur-rag] Ctrl+C pour arrêter.")
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        print("\n[serveur-rag] arrêt.")
