---
mode: ask
description: Relit une modification avec l'œil d'un développeur senior.
---

Relis les modifications en cours de `#changes` comme le ferait un développeur
senior sur ce projet.

Cherche, dans cet ordre :

1. une **règle métier cassée** — c'est le seul défaut qui coûte vraiment cher,
   parce qu'il ne fait pas planter le programme, il donne un chiffre faux ;
2. une **valeur non échappée** qui entre dans du HTML ;
3. une fonction placée dans la **mauvaise couche** ;
4. un **cas limite non testé** : liste vide, null, division par zéro, accent, apostrophe ;
5. un **commentaire qui répète le code**.

Réponds par une liste, du plus grave au moins grave : fichier et ligne,
le problème en une phrase, la correction en une phrase.
Si tu ne trouves rien de sérieux, dis-le en une ligne. Ne remplis pas.
