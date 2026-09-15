"""
exercice_5_embeddings/embeddings_maison.py
-------------------------------------------
Jour 3 · Module 5 · Les LLM — text embedding, cosine similarity, réduction de dimension

OBJECTIF
Comprendre les embeddings en les FABRIQUANT à la main, sans bibliothèque,
sans clé d'API et sans connexion internet.

Un embedding, c'est une liste de nombres qui représente un texte.
Deux textes qui parlent de la même chose ont des listes de nombres proches.
« Proches » se mesure avec la SIMILARITÉ COSINUS.

Le vrai embedding d'un modèle est appris sur des milliards de phrases.
Le nôtre est bien plus rustique, mais il illustre exactement le même mécanisme
et il permet de faire tourner un RAG complet hors ligne.
"""

import math          # math.sqrt = racine carrée
import hashlib       # hashlib = pour transformer un mot en nombre, toujours le même
import unicodedata   # unicodedata = pour enlever les accents proprement


# ------------------------------------------------------------------
# 1. Préparer le texte
# ------------------------------------------------------------------

# Les mots très fréquents n'apportent aucune information sur le SENS.
# On les retire : on les appelle des « mots vides » (stop words).
MOTS_VIDES = {
    "le", "la", "les", "un", "une", "des", "du", "de", "et", "ou", "a", "au",
    "aux", "ce", "cet", "cette", "ces", "en", "dans", "sur", "pour", "par",
    "que", "qui", "est", "sont", "avec", "son", "sa", "ses", "il", "elle",
    "nous", "vous", "ils", "elles", "plus", "pas", "ne", "se", "on", "y",
}


def enlever_accents(texte):
    """Transforme « déjà vu » en « deja vu ».

    Utile pour que « congé » et « conge » soient traités comme le même mot.
    """
    # NFD sépare la lettre de son accent : é devient e + ́
    decompose = unicodedata.normalize("NFD", texte)

    # On garde uniquement les caractères qui ne sont PAS des accents
    # (catégorie Unicode "Mn" = Mark, nonspacing)
    return "".join(c for c in decompose if unicodedata.category(c) != "Mn")


def decouper_en_mots(texte):
    """Transforme une phrase en liste de mots utiles.

    Étapes : minuscules → sans accents → on ne garde que les lettres et chiffres
             → on découpe → on retire les mots vides et les mots trop courts.
    """
    texte = enlever_accents(texte.lower())

    # On remplace tout ce qui n'est ni lettre ni chiffre par un espace
    propre = "".join(c if c.isalnum() else " " for c in texte)

    # .split() découpe sur les espaces et supprime les vides
    mots = propre.split()

    # On garde les mots de plus de 2 lettres qui ne sont pas des mots vides
    return [mot for mot in mots if len(mot) > 2 and mot not in MOTS_VIDES]


# ------------------------------------------------------------------
# 2. Fabriquer l'embedding
# ------------------------------------------------------------------

# La taille du vecteur. Les vrais modèles utilisent 384, 768, 1536 ou 3072.
# Plus la dimension est grande, plus le vecteur est précis, plus il pèse lourd.
DIMENSION = 128


def _position_du_mot(mot, dimension=DIMENSION):
    """Donne toujours la même position (entre 0 et dimension-1) pour un mot donné.

    On utilise une empreinte (hash) : c'est reproductible d'une exécution
    à l'autre, contrairement à la fonction hash() de Python.
    Cette technique s'appelle le « hashing trick ».
    """
    empreinte = hashlib.md5(mot.encode("utf-8")).hexdigest()

    # int(texte, 16) lit l'empreinte comme un nombre en base 16
    # % dimension garde le reste de la division : un nombre entre 0 et dimension-1
    return int(empreinte, 16) % dimension


def embedding(texte, dimension=DIMENSION):
    """Transforme un texte en une liste de `dimension` nombres.

    Méthode :
      1. on découpe le texte en mots utiles ;
      2. chaque mot ajoute 1 à une case du vecteur, toujours la même ;
      3. on normalise le vecteur (longueur ramenée à 1).

    L'étape 3 est importante : sans elle, un texte long aurait
    automatiquement des scores plus élevés qu'un texte court.
    """
    # On part d'un vecteur rempli de zéros
    vecteur = [0.0] * dimension

    mots = decouper_en_mots(texte)

    # Chaque mot vote pour sa case
    for mot in mots:
        position = _position_du_mot(mot, dimension)
        vecteur[position] += 1.0

    return normaliser(vecteur)


def normaliser(vecteur):
    """Ramène la longueur du vecteur à 1, sans changer sa direction.

    La longueur (ou norme) se calcule comme l'hypoténuse en géométrie :
    racine carrée de la somme des carrés.
    """
    # sum(x * x for x in vecteur) additionne les carrés de chaque nombre
    longueur = math.sqrt(sum(valeur * valeur for valeur in vecteur))

    # Cas particulier : un vecteur entièrement nul ne peut pas être divisé
    if longueur == 0:
        return vecteur

    return [valeur / longueur for valeur in vecteur]


# ------------------------------------------------------------------
# 3. La similarité cosinus
# ------------------------------------------------------------------

def produit_scalaire(vecteur_a, vecteur_b):
    """Multiplie les vecteurs case par case, puis additionne le tout.

    zip(a, b) parcourt les deux listes en parallèle :
    il donne (a[0], b[0]), puis (a[1], b[1]), etc.
    """
    return sum(x * y for x, y in zip(vecteur_a, vecteur_b))


def similarite_cosinus(vecteur_a, vecteur_b):
    """Mesure à quel point deux vecteurs pointent dans la même direction.

    Résultat :
      1   → même direction  → textes très proches
      0   → perpendiculaires → aucun rapport
      -1  → directions opposées

    Pourquoi le cosinus plutôt que la distance ?
    Parce qu'on veut comparer le SENS, pas la LONGUEUR du texte.
    """
    # Les vecteurs doivent avoir la même taille, sinon la comparaison n'a pas de sens
    if len(vecteur_a) != len(vecteur_b):
        raise ValueError(
            f"Tailles différentes : {len(vecteur_a)} et {len(vecteur_b)}"
        )

    norme_a = math.sqrt(sum(v * v for v in vecteur_a))
    norme_b = math.sqrt(sum(v * v for v in vecteur_b))

    # Un vecteur nul n'a pas de direction : la similarité vaut 0
    if norme_a == 0 or norme_b == 0:
        return 0.0

    return produit_scalaire(vecteur_a, vecteur_b) / (norme_a * norme_b)


# ------------------------------------------------------------------
# 4. Une mini base vectorielle
# ------------------------------------------------------------------

class BaseVectorielle:
    """Une base de données vectorielle minimale, tenue en mémoire.

    Les vraies bases (Chroma, Qdrant, pgvector, FAISS) ajoutent la persistance
    sur disque, les index rapides et les filtres par métadonnées.
    Le principe de la recherche, lui, est exactement celui écrit ici.
    """

    def __init__(self, dimension=DIMENSION):
        """__init__ est appelée à la création de l'objet."""
        # self = l'objet lui-même. Les attributs y sont rangés.
        self.dimension = dimension
        self.documents = []   # la liste de tout ce qu'on a stocké

    def ajouter(self, texte, metadonnees=None):
        """Range un texte dans la base, avec son vecteur."""
        self.documents.append({
            "texte": texte,
            "vecteur": embedding(texte, self.dimension),
            "metadonnees": metadonnees or {},   # {} si rien n'est fourni
        })

    def ajouter_plusieurs(self, textes):
        """Range plusieurs textes d'un coup."""
        for texte in textes:
            self.ajouter(texte)

    def rechercher(self, question, nombre_de_resultats=3):
        """Renvoie les documents les plus proches de la question.

        C'est le « R » de RAG : Retrieval, la récupération.
        """
        # Étape 1 : on transforme la question en vecteur, comme les documents
        vecteur_question = embedding(question, self.dimension)

        resultats = []

        # Étape 2 : on compare la question à CHAQUE document
        for document in self.documents:
            score = similarite_cosinus(vecteur_question, document["vecteur"])

            resultats.append({
                "texte": document["texte"],
                "score": round(score, 4),
                "metadonnees": document["metadonnees"],
            })

        # Étape 3 : on trie du plus proche au plus lointain.
        # reverse=True car un score élevé est un bon score.
        resultats.sort(key=lambda ligne: ligne["score"], reverse=True)

        # Étape 4 : on ne garde que les N premiers ([:n] = « les n premiers »)
        return resultats[:nombre_de_resultats]

    def __len__(self):
        """Permet d'écrire len(ma_base) pour connaître le nombre de documents."""
        return len(self.documents)


# ------------------------------------------------------------------
# 5. Réduction de dimension (pour visualiser)
# ------------------------------------------------------------------

def reduire_a_deux_dimensions(vecteurs):
    """Ramène des vecteurs de 128 nombres à 2 nombres, pour les dessiner.

    Méthode simplifiée : on projette sur deux axes fixes construits
    par alternance de signes. Ce n'est pas une vraie ACP (analyse en
    composantes principales), mais cela suffit à comprendre l'idée :
    on perd de l'information pour gagner en lisibilité.

    Pour un vrai travail, utilisez PCA, t-SNE ou UMAP
    (bibliothèque scikit-learn ou umap-learn).
    """
    if not vecteurs:
        return []

    dimension = len(vecteurs[0])

    # Axe 1 : + - + - + - ...   (on alterne selon la parité de l'indice)
    axe_1 = [1.0 if i % 2 == 0 else -1.0 for i in range(dimension)]

    # Axe 2 : + + - - + + - -   (on alterne toutes les deux cases)
    axe_2 = [1.0 if (i // 2) % 2 == 0 else -1.0 for i in range(dimension)]

    # On normalise les axes pour que les coordonnées restent comparables
    axe_1 = normaliser(axe_1)
    axe_2 = normaliser(axe_2)

    points = []
    for vecteur in vecteurs:
        # La coordonnée sur un axe est le produit scalaire avec cet axe
        x = round(produit_scalaire(vecteur, axe_1), 4)
        y = round(produit_scalaire(vecteur, axe_2), 4)
        points.append((x, y))

    return points


# ------------------------------------------------------------------
# 6. Démonstration
# ------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Similarité entre deux phrases proches ===")
    a = embedding("Comment poser un congé parental ?")
    b = embedding("Quelle est la procédure pour demander un congé parental ?")
    c = embedding("Quel est le prix d'une imprimante laser ?")

    print(f"congé / congé      : {similarite_cosinus(a, b):.3f}")
    print(f"congé / imprimante : {similarite_cosinus(a, c):.3f}")

    print("\n=== Recherche dans une mini base ===")
    base = BaseVectorielle()
    base.ajouter_plusieurs([
        "Le congé parental dure quatre mois par enfant.",
        "La demande de télétravail se fait auprès du responsable.",
        "Les notes de frais sont remboursées le 15 du mois.",
        "Le congé de paternité est de vingt jours ouvrables.",
    ])

    for resultat in base.rechercher("combien de temps dure le congé parental", 2):
        print(f"  {resultat['score']:.3f} — {resultat['texte']}")
