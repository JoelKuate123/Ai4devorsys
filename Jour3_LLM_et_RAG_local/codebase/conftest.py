"""
conftest.py
-----------
Fichier spécial reconnu automatiquement par pytest.
Il est exécuté AVANT les tests, quel que soit le dossier depuis lequel on lance pytest.

Son rôle ici : rendre le dossier `codebase/` visible par Python,
pour que « from commun.llm_client import demander » fonctionne partout.
"""

import sys                    # sys.path est la liste des dossiers où Python cherche les modules
import os                     # os.environ contient les variables d'environnement
from pathlib import Path      # Path pour manipuler les chemins proprement

# Le dossier qui contient ce fichier, c'est-à-dire codebase/
DOSSIER_RACINE = Path(__file__).parent

# On le place en tête de la liste des dossiers de recherche
sys.path.insert(0, str(DOSSIER_RACINE))

# Pendant les tests, on force le mode hors ligne :
# les tests doivent passer sans clé d'API, sans internet, et sans coûter un centime.
os.environ["LLM_OFFLINE"] = "true"
