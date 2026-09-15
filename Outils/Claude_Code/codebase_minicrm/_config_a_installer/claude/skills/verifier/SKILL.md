---
name: verifier
description: Verifie l'etat du projet MiniCRM avant de proposer une modification. A utiliser avant tout commit, ou quand on veut savoir si le projet est sain.
allowed-tools: Bash(node run-tests.js) Bash(git status) Bash(git diff:*) Read Grep
disable-model-invocation: false
---

## Contexte

### Etat de git
!`git status --short`

### Modifications non validees
!`git diff --stat`

### Resultat des tests
```!
node run-tests.js 2>&1 | tail -5
```

## Ce qu'il faut faire

Analyse ce qui precede et reponds en quatre points, sans preambule :

1. **Tests** : combien passent, combien echouent. Si des tests echouent,
   nomme-les et dis lequel corriger en premier.
2. **Portee** : les fichiers modifies correspondent-ils a une seule
   intention ? Si le diff melange deux sujets, dis-le.
3. **Regles metier** : le diff touche-t-il a l'une des cinq regles listees
   dans CLAUDE.md ? Si oui, laquelle et pourquoi.
4. **Verdict** : `PRET A VALIDER` ou `A CORRIGER`, en une ligne.

N'ecris rien d'autre. Ne modifie aucun fichier.
