---
mode: agent
description: Complète une fonction laissée en TODO dans MiniCRM, en partant des tests.
---

Complète la fonction `${input:fonction:nom de la fonction à compléter}`
dans `js/statistiques.js`.

Procède dans cet ordre :

1. Lis le bloc JSDoc de la fonction : il énonce les règles, une par une.
2. Lis les tests qui la concernent dans `tests/statistiques.test.js` :
   ils sont la spécification exacte, plus précise que la JSDoc.
3. Écris l'implémentation. Fonction **pure** : aucun effet de bord,
   pas de modification du tableau reçu en paramètre.
4. Lance `node run-tests.js` et vérifie que les 90 tests passent.
5. Résume en trois lignes ce que tu as écrit et pourquoi.

Contraintes : français, deux espaces d'indentation, aucune dépendance,
aucune modification des tests.
