# Spécification d'architecture technique — RAG documentaire confidentiel

> Livrable de l'exercice 5 (Jour 3 · Module 5).
> Énoncé ORSYS : « Rédiger une spécification d'architecture technique RAG
> de LLM explorant en base de données documentaire locale et confidentielle. »

---

## 1. Contexte et objectif

Une organisation détient environ 5 000 documents internes (règlements, procédures,
notes de service, contrats) qui ne doivent **jamais** sortir de son réseau.
Les agents perdent du temps à chercher l'information.

Objectif : un assistant en langage naturel qui répond à partir de ces documents
**uniquement**, en citant ses sources, sans qu'aucun contenu ne quitte l'infrastructure.

Contrainte structurante : **aucun appel à une API externe**. Le modèle tourne en local.

## 2. Pourquoi le RAG et pas un réentraînement

| Option | Coût | Mise à jour | Traçabilité | Retenu |
|---|---|---|---|---|
| Réentraîner un modèle | très élevé | à refaire à chaque ajout | aucune | non |
| Fine-tuning | élevé | lente | faible | non |
| **RAG** | faible | immédiate (on ré-indexe) | citation des sources | **oui** |
| Tout mettre dans le prompt | impossible | — | — | non |

Le RAG (*Retrieval-Augmented Generation*) ne modifie pas le modèle : il lui **fournit
les bons extraits** au moment de la question. Ajouter un document = ré-indexer, pas
réapprendre.

## 3. Architecture cible

```
                    PHASE 1 — INDEXATION (hors ligne, une fois par nuit)

  Documents  →  Extraction  →  Découpage   →  Embedding  →  Base
  (PDF,DOCX)     du texte      en morceaux     (local)      vectorielle
                              (800 car.,                    (sur disque,
                              chevauch. 150)                 chiffrée)

                    PHASE 2 — INTERROGATION (temps réel, < 5 s)

  Question  →  Embedding  →  Recherche   →  Construction  →  LLM local  →  Réponse
   agent       (local)       top-k = 5       du prompt       (GGUF)        + sources
                             + seuil 0,25    (contexte
                                             + question)
```

### Composants et technologies

| Couche | Choix retenu | Alternative | Justification |
|---|---|---|---|
| Extraction | `pdfplumber`, `python-docx` | `unstructured` | simple, sans service externe |
| Découpage | découpage récursif 800/150 | par titre | compromis précision / contexte |
| Embedding | `sentence-transformers` multilingue, en local | API OpenAI | **aucune donnée ne sort** |
| Base vectorielle | Chroma ou pgvector, sur disque local | Qdrant | persistance + filtres métadonnées |
| Modèle | modèle instruct 7B–14B quantifié Q4_K_M, via LM Studio ou Ollama | API cloud | confidentialité, coût nul au token |
| Service | API interne (FastAPI), réseau privé | — | authentification maison |

## 4. Le rôle exact du modèle de langage

Le modèle **ne cherche pas** l'information : la recherche est faite par la similarité
cosinus, du calcul mathématique classique. Le modèle **rédige** une réponse à partir
des extraits qu'on lui donne.

Conséquence directe : si la recherche remonte de mauvais extraits, le modèle donnera une
mauvaise réponse, même excellent. **La qualité d'un RAG se joue à 80 % dans l'indexation.**

Instruction système imposée :

> Réponds uniquement à partir du CONTEXTE fourni. Si le contexte ne contient pas
> l'information, réponds exactement : « Je ne trouve pas cette information dans les
> documents fournis. » Cite après chaque affirmation le nom du document source.

## 5. Cas limites et traitement

| Cas | Traitement attendu |
|---|---|
| Aucun extrait au-dessus du seuil de similarité | on n'appelle pas le modèle ; message « information non trouvée » |
| Extraits contradictoires (v1 et v2 d'un règlement) | on affiche les deux avec leur date ; le modèle signale la contradiction |
| Question hors périmètre (« quel temps fait-il ? ») | refus poli, sans appel au modèle |
| Document scanné sans couche texte | signalé au moment de l'indexation, OCR à prévoir |
| Document confidentiel réservé à un service | filtre par métadonnée `service` appliqué **avant** la recherche |
| Modèle local indisponible | l'application affiche les extraits bruts trouvés, sans rédaction |
| Question très longue | tronquée à 500 caractères, l'utilisateur est prévenu |

## 6. Sécurité et conformité

- Tout reste sur le réseau interne : aucun flux sortant vers internet.
- Les droits d'accès aux documents sont **répliqués** dans les métadonnées et appliqués
  au filtrage : un agent ne peut pas obtenir par l'assistant ce qu'il ne peut pas ouvrir.
- Journalisation des questions, sans contenu de document, conservée 12 mois.
- Aucune donnée personnelle n'est envoyée au modèle (base RGPD, art. 5 : minimisation).
- Le fichier de la base vectorielle est chiffré au repos : un embedding **peut** être
  partiellement inversé, il doit donc être traité comme le document lui-même.

## 7. Indicateurs de qualité

| Indicateur | Cible | Mesure |
|---|---|---|
| Rappel de la recherche (le bon extrait est-il remonté ?) | > 90 % | jeu de 50 questions de référence |
| Taux d'hallucination | < 2 % | relecture humaine d'un échantillon hebdomadaire |
| Temps de réponse | < 5 s | mesuré en production |
| Taux de « je ne trouve pas » | 5 à 15 % | trop bas = le modèle invente |

## 8. Questions ouvertes

1. Qui valide les réponses les premières semaines ?
2. Quelle fréquence de ré-indexation : nuit, ou à chaque dépôt de document ?
3. Le budget matériel permet-il un GPU, ou reste-t-on sur CPU (réponses 3 à 5 fois plus lentes) ?
4. Que fait-on des documents antérieurs à 2015, souvent périmés ?

---

**Sources techniques**
- Format GGUF : https://huggingface.co/docs/hub/gguf
- Serveur local compatible OpenAI (LM Studio) : https://lmstudio.ai/docs/app/api/endpoints/openai
- Étapes d'une chaîne RAG : https://docs.langchain.com/oss/python/deepagents/rag
