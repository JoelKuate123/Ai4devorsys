"""
╔══════════════════════════════════════════════════════════════════╗
║           SERVEUR MCP — Meteo Africa                             ║
║           Masterclass MCP · AI4Africa Ignition · 07 mai 2026     ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Ce serveur expose 4 outils MCP à Claude :                       ║
║    1. meteo_ville(ville)          → météo complète               ║
║    2. comparer_meteo(villes)      → comparaison multi-villes     ║
║    3. conseil_tenue(ville)        → conseils vestimentaires       ║
║    4. meteo_resume(ville)         → résumé en une ligne           ║
║                                                                  ║
║  API utilisée : Open-Meteo (gratuite, sans clé)                  ║
║    Géocodage : geocoding-api.open-meteo.com                      ║
║    Météo     : api.open-meteo.com                                ║
║                                                                  ║
║  LANCEMENT :                                                     ║
║    python server.py                                              ║
║                                                                  ║
║  CONFIGURATION CLAUDE DESKTOP :                                  ║
║    Voir README.md ou lancer NB4 pour la config automatique       ║
╚══════════════════════════════════════════════════════════════════╝
"""

# ─────────────────────────────────────────────────────────────────
#  IMPORTS
# ─────────────────────────────────────────────────────────────────

import requests                          # Pour les appels HTTP aux APIs
import urllib3                           # Pour désactiver les warnings SSL
from mcp.server.fastmcp import FastMCP   # Pour créer le serveur MCP

# Désactive les avertissements SSL (certificat Windows Store non reconnu)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# ─────────────────────────────────────────────────────────────────
#  CONSTANTES
# ─────────────────────────────────────────────────────────────────

# URL des deux APIs Open-Meteo (gratuites, sans clé)
URL_GEOCODAGE = 'https://geocoding-api.open-meteo.com/v1/search'
URL_METEO     = 'https://api.open-meteo.com/v1/forecast'

# Dictionnaire de traduction des codes météo WMO
# Source : https://open-meteo.com/en/docs#weathervariables
CODES_METEO = {
    0:  'Ciel degage',
    1:  'Principalement degage',
    2:  'Partiellement nuageux',
    3:  'Couvert',
    45: 'Brouillard',
    48: 'Brouillard givrant',
    51: 'Bruine legere',
    53: 'Bruine moderee',
    55: 'Bruine dense',
    61: 'Pluie legere',
    63: 'Pluie moderee',
    65: 'Forte pluie',
    71: 'Neige legere',
    73: 'Neige moderee',
    75: 'Forte neige',
    80: 'Averses legeres',
    81: 'Averses moderees',
    82: 'Averses violentes',
    95: 'Orage',
    96: 'Orage avec grele',
    99: 'Orage violent avec grele',
}


# ─────────────────────────────────────────────────────────────────
#  CRÉATION DU SERVEUR MCP
# ─────────────────────────────────────────────────────────────────

# FastMCP est la façon la plus simple de créer un serveur MCP en Python
# Le nom 'Meteo Africa' apparaîtra dans Claude Desktop
mcp = FastMCP('Meteo Africa')


# ─────────────────────────────────────────────────────────────────
#  FONCTIONS UTILITAIRES INTERNES
#  Ces fonctions ne sont PAS des outils MCP (pas de @mcp.tool())
#  Elles sont appelées en interne par les outils ci-dessous.
#  Le _ au début du nom indique qu'elles sont internes (convention Python)
# ─────────────────────────────────────────────────────────────────

def _geocoder_ville(nom_ville):
    """
    Transforme un nom de ville en coordonnées GPS.

    Appelle l'API de géocodage Open-Meteo.
    Retourne un dict {nom, pays, region, latitude, longitude}
    ou None si la ville n'est pas trouvée.
    """
    params = {
        'name':     nom_ville,
        'count':    1,        # Un seul résultat (le plus pertinent)
        'language': 'fr',     # Noms en français
        'format':   'json',
    }

    # timeout=10 : on attend max 10 secondes avant d'abandonner
    reponse = requests.get(URL_GEOCODAGE, params=params, timeout=10, verify=False)

    # raise_for_status() génère une exception si le code HTTP n'est pas 2xx
    reponse.raise_for_status()

    donnees = reponse.json()

    # Si aucun résultat : ville introuvable
    if not donnees.get('results'):
        return None

    # On prend le premier résultat (le plus pertinent)
    r = donnees['results'][0]

    return {
        'nom':       r['name'],
        'pays':      r['country'],
        'region':    r.get('admin1', ''),  # Région/province (peut être absent)
        'latitude':  r['latitude'],
        'longitude': r['longitude'],
    }


def _appeler_api_meteo(lat, lon):
    """
    Obtient les données météo actuelles pour des coordonnées GPS.

    Appelle l'API météo Open-Meteo.
    Retourne le dict 'current' avec temperature, humidite, vent, code météo.
    """
    params = {
        'latitude':      lat,
        'longitude':     lon,
        # Les variables météo qu'on veut — séparées par des virgules
        'current':       'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code',
        'timezone':      'auto',    # Fuseau horaire local automatique
        'forecast_days': 1,         # Données du jour seulement
    }

    reponse = requests.get(URL_METEO, params=params, timeout=10, verify=False)
    reponse.raise_for_status()

    # On retourne directement le sous-dictionnaire 'current'
    # qui contient toutes les données météo actuelles
    return reponse.json()['current']


# ─────────────────────────────────────────────────────────────────
#  OUTILS MCP
#  Chaque fonction avec @mcp.tool() devient un outil que Claude
#  peut appeler. Claude lit la docstring pour savoir quand l'utiliser.
# ─────────────────────────────────────────────────────────────────


# ── Outil 1 ─────────────────────────────────────────────────────

@mcp.tool()
def meteo_ville(ville: str) -> str:
    """
    Obtient la météo actuelle et complète d'une ville dans le monde.

    Utilise cet outil quand l'utilisateur :
    - Demande la météo d'une ville spécifique
    - Veut savoir s'il fait chaud, froid, s'il pleut quelque part
    - Veut connaître la température, l'humidité ou le vent d'un lieu

    Paramètre :
        ville : Nom de la ville (ex: 'Yaoundé', 'Dakar', 'Paris', 'Abidjan')

    Retourne :
        Texte multi-lignes avec : ville, pays, température, humidité,
        vitesse du vent, conditions météo, heure locale.
    """

    # Étape 1 : Trouver les coordonnées GPS de la ville
    coords = _geocoder_ville(ville)

    # Gestion d'erreur : ville introuvable
    if coords is None:
        return (
            f"Ville '{ville}' introuvable dans l'API.\n"
            f"Conseil : Essayez sans accents (ex: 'Yaounde' au lieu de 'Yaoundé')"
        )

    # Étape 2 : Obtenir les données météo
    actuel = _appeler_api_meteo(coords['latitude'], coords['longitude'])

    # Étape 3 : Décoder le code météo en texte lisible
    code = actuel['weather_code']
    description = CODES_METEO.get(code, f'Code meteo {code}')

    # Étape 4 : Construire et retourner la réponse texte
    # Les outils MCP retournent TOUJOURS un string
    return (
        f"Meteo a {coords['nom']}, {coords['pays']}\n"
        f"{'=' * 42}\n"
        f"Temperature     : {actuel['temperature_2m']} C"
        f" (ressentie {actuel['apparent_temperature']} C)\n"
        f"Humidite        : {actuel['relative_humidity_2m']} %\n"
        f"Vent            : {actuel['wind_speed_10m']} km/h\n"
        f"Conditions      : {description}\n"
        f"Heure locale    : {actuel['time']}"
    )


# ── Outil 2 ─────────────────────────────────────────────────────

@mcp.tool()
def comparer_meteo(villes: list) -> str:
    """
    Compare la météo actuelle entre plusieurs villes simultanément.
    Maximum 5 villes pour rester rapide.

    Utilise cet outil quand l'utilisateur :
    - Veut comparer la météo entre plusieurs villes
    - Demande quelle ville est la plus chaude ou la plus froide
    - Prépare un voyage et compare des destinations
    - A des collègues ou clients dans plusieurs villes

    Paramètre :
        villes : Liste de noms de villes (ex: ['Dakar', 'Abidjan', 'Paris'])

    Retourne :
        Tableau comparatif avec la météo de chaque ville,
        et identification de la ville la plus chaude et la plus froide.
    """

    # Validation : pas plus de 5 villes
    if len(villes) > 5:
        return 'Maximum 5 villes a la fois pour ne pas surcharger API.'

    # Début de la construction de la réponse
    lignes = [
        f'COMPARAISON METEO — {len(villes)} villes',
        '=' * 52,
    ]

    # Variables pour identifier les extrêmes de température
    temp_max  = None   # Température la plus haute trouvée
    temp_min  = None   # Température la plus basse trouvée
    ville_chaude = ''  # Nom de la ville la plus chaude
    ville_froide = ''  # Nom de la ville la plus froide

    # Boucle sur chaque ville de la liste
    for nom_ville in villes:

        coords = _geocoder_ville(nom_ville)

        if coords is None:
            # Ville non trouvée : on l'indique et on passe à la suivante
            lignes.append(f'  {nom_ville} : INTROUVABLE')
            continue  # Passe directement à la ville suivante

        actuel = _appeler_api_meteo(coords['latitude'], coords['longitude'])

        temp = actuel['temperature_2m']
        hum  = actuel['relative_humidity_2m']
        code = actuel['weather_code']
        desc = CODES_METEO.get(code, f'Code {code}')

        # Ligne de résultat pour cette ville
        lignes.append(
            f"  {coords['nom']}, {coords['pays']}\n"
            f"    {temp} C  |  {desc}  |  Humidite {hum}%"
        )

        # Mise à jour des extrêmes
        if temp_max is None or temp > temp_max:
            temp_max     = temp
            ville_chaude = coords['nom']

        if temp_min is None or temp < temp_min:
            temp_min     = temp
            ville_froide = coords['nom']

    # Résumé des extrêmes
    if temp_max is not None:
        lignes.append('-' * 52)
        lignes.append(f'Plus chaude : {ville_chaude} ({temp_max} C)')
        lignes.append(f'Plus froide : {ville_froide} ({temp_min} C)')

    # join() assemble toutes les lignes en un seul texte
    return '\n'.join(lignes)


# ── Outil 3 ─────────────────────────────────────────────────────

@mcp.tool()
def conseil_tenue(ville: str) -> str:
    """
    Donne des conseils vestimentaires adaptés à la météo actuelle d'une ville.

    Utilise cet outil quand l'utilisateur :
    - Demande quoi porter pour aller dans une ville
    - Veut savoir s'il faut un manteau, un parapluie, de la crème solaire
    - Prépare ses bagages pour un voyage
    - Demande comment s'habiller en fonction du temps

    Paramètre :
        ville : Nom de la ville (ex: 'Douala', 'Paris', 'Nairobi')

    Retourne :
        Texte avec la météo actuelle et une liste de recommandations
        vestimentaires adaptées à la température et aux conditions.
    """

    # Récupérer les coordonnées et la météo
    coords = _geocoder_ville(ville)
    if coords is None:
        return f"Ville '{ville}' introuvable."

    actuel = _appeler_api_meteo(coords['latitude'], coords['longitude'])

    temp = actuel['temperature_2m']   # Température en °C
    code = actuel['weather_code']      # Code météo WMO
    desc = CODES_METEO.get(code, f'Code {code}')

    # ─── Conseils selon la température ───────────────────────
    # On adapte les recommandations à la plage de température

    if temp >= 35:
        # Très chaud — typique en zone tropicale en saison sèche
        conseils = [
            'Vetements tres legers : coton ou lin preferables',
            'Creme solaire indispensable (indice minimum 30)',
            'Chapeau ou casquette pour proteger du soleil',
            'Bouteille d eau grande quantite obligatoire',
            'Evitez les activites intenses en milieu de journee',
        ]
    elif temp >= 28:
        # Chaud — conditions tropicales normales
        conseils = [
            'T-shirt leger et pantalon fin',
            'Lunettes de soleil recommandees',
            'Hydratation reguliere importante',
        ]
    elif temp >= 20:
        # Doux — agréable
        conseils = [
            'Tenue decontractee : jean et t-shirt',
            'Veste legere conseille pour le soir',
        ]
    elif temp >= 10:
        # Frais
        conseils = [
            'Pull ou veste indispensable',
            'Chaussures fermees recommandees',
        ]
    elif temp >= 0:
        # Froid
        conseils = [
            'Manteau chaud obligatoire',
            'Echarpe et gants recommandes',
            'Chaussures isolees',
        ]
    else:
        # Très froid (gel)
        conseils = [
            'Manteau tres chaud indispensable',
            'Bonnet, echarpe et gants obligatoires',
            'Plusieurs couches de vetements',
            'Chaussures impermeables et isolees',
        ]

    # ─── Conseils supplémentaires selon les conditions ───────
    # Codes de pluie : bruine, pluie, averses
    codes_pluie = [51, 53, 55, 61, 63, 65, 80, 81, 82]
    # Codes de neige
    codes_neige = [71, 73, 75]
    # Codes d'orage
    codes_orage = [95, 96, 99]

    if code in codes_pluie:
        conseils.append('Parapluie ou impermeable OBLIGATOIRE — il pleut !')
    elif code in codes_neige:
        conseils.append('Chaussures impermeables — neige prevue !')
    elif code in codes_orage:
        conseils.append('Evitez de sortir si possible — orage en cours !')
    elif code in [45, 48]:
        conseils.append('Prudence en voiture — visibilite reduite (brouillard)')

    # ─── Construction de la réponse ──────────────────────────
    nom  = coords['nom']
    pays = coords['pays']

    lignes = [
        f'CONSEIL TENUE — {nom}, {pays}',
        '=' * 42,
        f'Conditions actuelles : {temp} C  |  {desc}',
        '',
        'Recommandations :',
    ]

    # Ajouter chaque conseil avec un tiret
    for conseil in conseils:
        lignes.append(f'  - {conseil}')

    return '\n'.join(lignes)


# ── Outil 4 ─────────────────────────────────────────────────────

@mcp.tool()
def meteo_resume(ville: str) -> str:
    """
    Donne un résumé météo très court en une seule ligne pour une ville.

    Utilise cet outil quand :
    - L'utilisateur veut une réponse rapide et concise
    - On compare beaucoup de villes et on veut être bref
    - On a besoin d'un format compact pour une liste ou un tableau

    Paramètre :
        ville : Nom de la ville

    Retourne :
        Une seule ligne : "NomVille (Pays) : XX C, Description, XX% hum"
    """

    coords = _geocoder_ville(ville)
    if coords is None:
        return f"'{ville}' : ville introuvable"

    actuel = _appeler_api_meteo(coords['latitude'], coords['longitude'])

    temp = actuel['temperature_2m']
    hum  = actuel['relative_humidity_2m']
    code = actuel['weather_code']
    desc = CODES_METEO.get(code, f'Code {code}')

    # Une seule ligne — format compact
    return f"{coords['nom']} ({coords['pays']}) : {temp} C, {desc}, Humidite {hum}%"


# ─────────────────────────────────────────────────────────────────
#  POINT D'ENTRÉE — Lance le serveur
# ─────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print('Serveur MCP Meteo Africa demarre !')
    print('4 outils disponibles :')
    print('  - meteo_ville(ville)')
    print('  - comparer_meteo(villes)')
    print('  - conseil_tenue(ville)')
    print('  - meteo_resume(ville)')
    print()
    print('En attente de connexion depuis Claude Desktop...')
    print('(Ctrl+C pour arreter)')

    # transport='stdio' = communication via l'entrée/sortie standard
    # C'est ce qu'attend Claude Desktop pour les serveurs MCP locaux
    mcp.run(transport='stdio')
