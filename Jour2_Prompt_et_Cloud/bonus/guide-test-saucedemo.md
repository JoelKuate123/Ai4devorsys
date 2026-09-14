# Guide complet — Automatiser 10 tests sur Swag Labs (saucedemo.com)

**De zéro à un rapport de test partageable.**
Chaque commande à taper, chaque fichier à créer, chaque ligne à y mettre.

**Outil :** Playwright + TypeScript
**Auteur :** Joël Parfait Kuate — Digital House Company — hello@dhcompany.pro
**Version :** 2.0 — guide exécutable

---

## Sommaire

| Étape | Ce qu'on fait | Durée |
|---|---|---|
| 0 | Vérifier les prérequis | 5 min |
| 1 | Créer et initialiser le projet | 10 min |
| 2 | Nettoyer le squelette fourni | 3 min |
| 3 | Configurer `playwright.config.ts` | 7 min |
| 4 | Fichier 1 — authentification (CT-01 à CT-04) | 30 min |
| 5 | Fichier 2 — catalogue (CT-05, CT-06) | 20 min |
| 6 | Fichier 3 — panier (CT-07 à CT-09) | 25 min |
| 7 | Fichier 4 — commande (CT-10) | 20 min |
| 8 | Lancer la campagne complète | 10 min |
| 9 | Générer et lire les rapports | 15 min |
| 10 | Raccourcis npm | 5 min |
| 11 | Diagnostiquer un échec | 15 min |

---

# Étape 0 — Prérequis

## 0.1 Ce qu'il faut avoir

| Logiciel | Version | Où le prendre |
|---|---|---|
| Node.js | 18 ou plus | nodejs.org — version LTS |
| VS Code | à jour | code.visualstudio.com |
| Un terminal | — | intégré à VS Code |

## 0.2 Vérifier

Ouvrez un terminal et tapez :

```bash
node -v
npm -v
```

**Résultat attendu :** deux numéros de version, par exemple `v22.22.2` et `10.9.4`.

Si `node -v` renvoie « commande introuvable », Node n'est pas installé — ou le terminal a été ouvert avant l'installation. Fermez-le, rouvrez-en un neuf, et retestez avant de conclure.

---

# Étape 1 — Créer le projet

## 1.1 Créer le dossier

Choisissez un chemin **sans espace ni accent**. `C:\demos\saucedemo-tests` convient ; `C:\Users\Joël\Mes Documents\Démo` posera des problèmes.

```bash
# Windows (PowerShell)
mkdir C:\demos\saucedemo-tests
cd C:\demos\saucedemo-tests

# macOS / Linux
mkdir -p ~/demos/saucedemo-tests
cd ~/demos/saucedemo-tests
```

## 1.2 Ouvrir dans VS Code

1. VS Code → menu **Fichier** → **Ouvrir le dossier…**
2. Sélectionner `saucedemo-tests`
3. Si VS Code demande « Faites-vous confiance aux auteurs ? » → **Oui**
4. Menu **Terminal** → **Nouveau terminal**
5. Vérifier que la dernière ligne du terminal se termine par `saucedemo-tests>`

Cette vérification n'est pas une formalité : si le terminal est ailleurs, tout ce qui suit sera installé dans le mauvais dossier.

## 1.3 Initialiser Playwright

```bash
npm init playwright@latest
```

Quatre questions s'affichent. Réponses à donner :

| Question | Réponse | Comment |
|---|---|---|
| TypeScript ou JavaScript ? | **TypeScript** | déjà sélectionné → `Entrée` |
| Where to put your end-to-end tests? | **tests** | ne rien changer → `Entrée` |
| Add a GitHub Actions workflow? | **N** | taper `N` → `Entrée` |
| Install Playwright browsers? | **Y** | taper `Y` → `Entrée` |

Le téléchargement des navigateurs prend 2 à 5 minutes. C'est terminé quand vous lisez `✔ Success!` et que le curseur revient sur une ligne vide.

## 1.4 Vérifier l'installation

```bash
npx playwright --version
npx playwright test --list
```

`--list` affiche les tests détectés sans les exécuter. S'il affiche « no tests found », vous n'étiez pas dans le bon dossier à l'étape 1.3.

**État du projet à ce stade :**

```
saucedemo-tests/
├─ node_modules/
├─ tests/
│  └─ example.spec.ts
├─ playwright.config.ts
├─ package.json
├─ package-lock.json
└─ .gitignore
```

Selon la version, un dossier `tests-examples/` peut aussi apparaître. Son absence n'est pas une erreur.

Dans l'explorateur VS Code, le dossier `tests` s'affiche **replié** : cliquez sur la flèche pour voir son contenu.

---

# Étape 2 — Nettoyer

On supprime les fichiers d'exemple pour repartir d'une base propre.

## 2.1 Où cliquer

1. Explorateur VS Code → déplier `tests`
2. **Clic droit** sur `example.spec.ts` → **Supprimer** → confirmer
3. Si `tests-examples/` existe : clic droit dessus → **Supprimer**

## 2.2 Ou en ligne de commande

```bash
# Windows
del tests\example.spec.ts
rmdir /s /q tests-examples

# macOS / Linux
rm tests/example.spec.ts
rm -rf tests-examples
```

## 2.3 Vérifier

```bash
npx playwright test --list
```

**Résultat attendu :** `Total: 0 tests in 0 files`. C'est normal, et c'est le point de départ.

---

# Étape 3 — Configurer

## 3.1 Quel fichier

`playwright.config.ts`, à la racine du projet. Cliquez dessus dans l'explorateur.

## 3.2 Quoi y mettre

**Remplacez tout le contenu** du fichier par celui-ci (`Ctrl+A` puis coller) :

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['html'], ['list']],

  use: {
    baseURL: 'https://www.saucedemo.com',
    testIdAttribute: 'data-test',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

Enregistrez : `Ctrl+S`.

## 3.3 Pourquoi chaque ligne

| Ligne | Effet | Conséquence si absente |
|---|---|---|
| `baseURL` | permet d'écrire `goto('/')` | il faut répéter l'URL complète partout |
| `testIdAttribute: 'data-test'` | Playwright cherche `data-test` au lieu de `data-testid` | **aucun `getByTestId()` de ce guide ne fonctionne** |
| `reporter: [['html'], ['list']]` | rapport HTML + sortie lisible au terminal | pas de rapport partageable |
| `trace: 'on-first-retry'` | film du test enregistré quand il rejoue | échec sans contexte |
| `screenshot: 'only-on-failure'` | capture au moment du plantage | échec sans preuve visuelle |
| `viewport` | taille d'écran fixe | résultats différents d'une machine à l'autre |

`testIdAttribute` est la ligne critique. Swag Labs utilise `data-test`, pas la convention par défaut de Playwright.

---

# Étape 4 — Fichier 1 : authentification

## 4.1 Créer le fichier

1. Explorateur → **clic sur le dossier `tests`** pour le sélectionner
2. **Clic sur l'icône « Nouveau fichier »** (feuille avec un +), en haut du panneau
3. Taper `01-authentification.spec.ts` → `Entrée`

Le nom doit finir par `.spec.ts`, sinon Playwright ignore le fichier.

## 4.2 Contenu complet du fichier

Collez ceci dans `tests/01-authentification.spec.ts` :

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// CT-01 — Critique — chemin nominal
test('un utilisateur valide accède au catalogue', async ({ page }) => {
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/inventory\.html/);
  await expect(page.getByText('Products')).toBeVisible();
});

// CT-02 — Haute — cas négatif
test('un compte bloqué ne peut pas se connecter', async ({ page }) => {
  await page.getByPlaceholder('Username').fill('locked_out_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByTestId('error')).toContainText('locked out');
  await expect(page).not.toHaveURL(/inventory/);
});

// CT-03 — Haute — sécurité
test('des identifiants inconnus sont rejetés sans détail', async ({ page }) => {
  await page.getByPlaceholder('Username').fill('invalid_user');
  await page.getByPlaceholder('Password').fill('mauvais_mdp');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByTestId('error'))
    .toContainText('Username and password do not match');
});

// CT-04 — Moyenne — validation de formulaire
test('les champs obligatoires sont contrôlés', async ({ page }) => {
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByTestId('error')).toContainText('Username is required');

  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByTestId('error')).toContainText('Password is required');
});
```

Enregistrez.

## 4.3 Lancer ce fichier seul

```bash
npx playwright test 01-authentification --headed --workers=1
```

- `01-authentification` filtre sur le nom de fichier
- `--headed` rend le navigateur visible
- `--workers=1` exécute un test à la fois, pour pouvoir observer

**Résultat attendu au terminal :**

```
Running 4 tests using 1 worker

  ✓  1 [chromium] › 01-authentification.spec.ts:8:1 › un utilisateur valide accède au catalogue (2.1s)
  ✓  2 [chromium] › 01-authentification.spec.ts:18:1 › un compte bloqué ne peut pas se connecter (1.4s)
  ✓  3 [chromium] › 01-authentification.spec.ts:29:1 › des identifiants inconnus sont rejetés sans détail (1.3s)
  ✓  4 [chromium] › 01-authentification.spec.ts:38:1 › les champs obligatoires sont contrôlés (1.5s)

  4 passed (7.2s)
```

## 4.4 Ce que couvre ce fichier

| Cas | Priorité | Données | Résultat attendu |
|---|---|---|---|
| CT-01 | Critique | `standard_user` / `secret_sauce` | arrivée sur `/inventory.html` |
| CT-02 | Haute | `locked_out_user` | message « locked out », pas de redirection |
| CT-03 | Haute | `invalid_user` / `mauvais_mdp` | message générique, sans préciser quel champ est faux |
| CT-04 | Moyenne | champs vides | un message par champ manquant |

Le message générique de CT-03 est une exigence de sécurité : un message précis permettrait d'énumérer les comptes existants.

---

# Étape 5 — Fichier 2 : catalogue

## 5.1 Créer le fichier

Même procédure : clic sur `tests` → **Nouveau fichier** → `02-catalogue.spec.ts`

## 5.2 Contenu complet

```ts
import { test, expect } from '@playwright/test';

// Décor commun : ces tests démarrent connectés.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/inventory\.html/);
});

// CT-05 — Haute — affichage
test('le catalogue affiche les six produits attendus', async ({ page }) => {
  const produits = page.getByTestId('inventory-item');
  await expect(produits).toHaveCount(6);

  await expect(page.getByText('Sauce Labs Backpack')).toBeVisible();
  await expect(
    produits.filter({ hasText: 'Sauce Labs Backpack' })
            .getByTestId('inventory-item-price')
  ).toHaveText('$29.99');
});

// CT-06 — Moyenne — logique métier
test('le tri par prix croissant ordonne correctement le catalogue', async ({ page }) => {
  await page.getByTestId('product-sort-container').selectOption('lohi');

  const textes = await page.getByTestId('inventory-item-price').allTextContents();
  const prix = textes.map(t => parseFloat(t.replace('$', '')));

  expect(prix).toEqual([...prix].sort((a, b) => a - b));
  expect(prix[0]).toBe(7.99);
  expect(prix[prix.length - 1]).toBe(49.99);
});
```

## 5.3 Lancer

```bash
npx playwright test 02-catalogue --headed --workers=1
```

**Résultat attendu :** `2 passed`.

## 5.4 Deux points à expliquer aux participants

**L'assertion dans le `beforeEach`.** Sans elle, une panne de connexion se manifesterait par « élément `inventory-item` introuvable » — un diagnostic trompeur, trois écrans trop loin.

**Le tri comparé à lui-même.** `expect(prix).toEqual([...prix].sort(...))` vérifie que la liste est ordonnée sans dépendre du contenu du catalogue. Si Swag Labs ajoute un produit demain, le test reste valide. Les deux assertions suivantes verrouillent tout de même les bornes connues.

---

# Étape 6 — Fichier 3 : panier

## 6.1 Créer `tests/03-panier.spec.ts`

## 6.2 Contenu complet

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/inventory\.html/);
});

// CT-07 — Critique — chemin nominal
test('ajouter un produit met à jour le panier', async ({ page }) => {
  await page.getByTestId('add-to-cart-sauce-labs-backpack').click();

  await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');
  await expect(page.getByTestId('remove-sauce-labs-backpack')).toBeVisible();
});

// CT-08 — Haute — action inverse
test('retirer un produit vide le panier', async ({ page }) => {
  await page.getByTestId('add-to-cart-sauce-labs-backpack').click();
  await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');

  await page.getByTestId('remove-sauce-labs-backpack').click();

  await expect(page.getByTestId('shopping-cart-badge')).not.toBeVisible();
  await expect(page.getByTestId('add-to-cart-sauce-labs-backpack')).toBeVisible();
});

// CT-09 — Critique — intégrité des données
test('le panier reflète fidèlement la sélection', async ({ page }) => {
  await page.getByTestId('add-to-cart-sauce-labs-backpack').click();
  await page.getByTestId('add-to-cart-sauce-labs-bike-light').click();
  await page.getByTestId('shopping-cart-link').click();

  await expect(page).toHaveURL(/cart\.html/);

  const lignes = page.getByTestId('inventory-item');
  await expect(lignes).toHaveCount(2);

  const backpack = lignes.filter({ hasText: 'Sauce Labs Backpack' });
  await expect(backpack.getByTestId('inventory-item-price')).toHaveText('$29.99');
  await expect(backpack.getByTestId('item-quantity')).toHaveText('1');

  await expect(
    lignes.filter({ hasText: 'Sauce Labs Bike Light' })
          .getByTestId('inventory-item-price')
  ).toHaveText('$9.99');
});
```

## 6.3 Lancer

```bash
npx playwright test 03-panier --headed --workers=1
```

**Résultat attendu :** `3 passed`.

## 6.4 Le piège des six boutons identiques

Si un participant écrit :

```ts
await page.getByRole('button', { name: 'Add to cart' }).click();
```

il obtient :

```
Error: strict mode violation: getByRole('button', { name: 'Add to cart' })
resolved to 6 elements
```

Ce n'est pas un bug. Playwright refuse d'agir quand un locator désigne plusieurs éléments, parce qu'il ne veut pas choisir à votre place. Deux solutions :

```ts
// A — l'attribut dédié (utilisé dans ce guide)
await page.getByTestId('add-to-cart-sauce-labs-backpack').click();

// B — chaîner : d'abord la carte produit, puis le bouton dedans
await page.getByTestId('inventory-item')
          .filter({ hasText: 'Sauce Labs Backpack' })
          .getByRole('button', { name: 'Add to cart' })
          .click();
```

La solution B est la plus transférable : la plupart des sites réels n'ont pas d'attributs de test.

---

# Étape 7 — Fichier 4 : commande

## 7.1 Créer `tests/04-commande.spec.ts`

## 7.2 Contenu complet

```ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Username').fill('standard_user');
  await page.getByPlaceholder('Password').fill('secret_sauce');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/inventory\.html/);
});

// CT-10 — Critique — bout en bout
test('un client peut commander un produit de bout en bout', async ({ page }) => {
  // 1. Sélection
  await page.getByTestId('add-to-cart-sauce-labs-backpack').click();
  await page.getByTestId('shopping-cart-link').click();

  // 2. Tunnel de commande
  await page.getByTestId('checkout').click();
  await page.getByPlaceholder('First Name').fill('Joël');
  await page.getByPlaceholder('Last Name').fill('Kuate');
  await page.getByPlaceholder('Zip/Postal Code').fill('1081');
  await page.getByTestId('continue').click();

  // 3. Récapitulatif
  await expect(page).toHaveURL(/checkout-step-two\.html/);
  await expect(page.getByTestId('subtotal-label')).toContainText('29.99');

  // 4. Confirmation
  await page.getByTestId('finish').click();
  await expect(page).toHaveURL(/checkout-complete\.html/);
  await expect(
    page.getByRole('heading', { name: 'Thank you for your order!' })
  ).toBeVisible();
});
```

L'accent dans « Joël » est volontaire : il vérifie au passage le traitement des caractères non-ASCII, défaut classique en francophonie.

## 7.3 Lancer

```bash
npx playwright test 04-commande --headed --workers=1
```

**Résultat attendu :** `1 passed`.

---

# Étape 8 — La campagne complète

## 8.1 Tout lancer

```bash
npx playwright test
```

Sans option : mode invisible, tests en parallèle. C'est le mode de tous les jours.

**Résultat attendu :**

```
Running 10 tests using 5 workers

  ✓  1 [chromium] › 01-authentification.spec.ts:8:1 › un utilisateur valide accède au catalogue
  ...
  ✓ 10 [chromium] › 04-commande.spec.ts:13:1 › un client peut commander un produit de bout en bout

  10 passed (9.4s)
```

## 8.2 Les variantes utiles

```bash
# mode démonstration : navigateur visible, un test à la fois
npx playwright test --headed --workers=1

# mode interactif : l'application d'analyse de Playwright
npx playwright test --ui

# un seul fichier
npx playwright test 03-panier

# un seul test, par son nom
npx playwright test -g "commander un produit"

# pas-à-pas dans le code, avec l'Inspector
npx playwright test 04-commande --debug

# rejouer 2 fois les tests échoués, pour détecter l'instabilité
npx playwright test --retries=2

# lister sans exécuter
npx playwright test --list
```

## 8.3 État final du projet

```
saucedemo-tests/
├─ tests/
│  ├─ 01-authentification.spec.ts    4 tests
│  ├─ 02-catalogue.spec.ts           2 tests
│  ├─ 03-panier.spec.ts              3 tests
│  └─ 04-commande.spec.ts            1 test
├─ playwright-report/                généré — le rapport partageable
├─ test-results/                     généré — captures, vidéos, traces
├─ playwright.config.ts              modifié à l'étape 3
├─ package.json
└─ node_modules/
```

`playwright-report/` et `test-results/` sont regénérés à chaque exécution. Ne les versionnez pas — le `.gitignore` créé par l'installeur les exclut déjà.

---

# Étape 9 — Les rapports

## 9.1 Le rapport HTML

```bash
npx playwright show-report
```

Un onglet s'ouvre sur `http://localhost:9323`.

**Où cliquer :**

1. **Sur un test** dans la liste → détail de ses étapes
2. **Sur une étape** (ex. `click getByTestId('checkout')`) → durée et code source
3. **Sur les filtres** en haut : Passed · Failed · Flaky · Skipped
4. Pour un test rouge : **sur la capture d'écran** en bas → l'écran au moment de l'erreur
5. Pour un test rouge : **sur le lien Trace** → le film complet, action par action

Pour fermer le serveur : `Ctrl+C` dans le terminal. Tant que vous ne le faites pas, le terminal reste bloqué — c'est normal, ce n'est pas un plantage.

## 9.2 Envoyer le rapport à un client

Le rapport est un dossier statique. Zippez `playwright-report/` et envoyez-le : il s'ouvre dans n'importe quel navigateur, sans installer quoi que ce soit.

```bash
# Windows
tar -a -c -f rapport.zip playwright-report

# macOS / Linux
zip -r rapport.zip playwright-report
```

## 9.3 Générer d'autres formats

Pour un export exploitable par un outil tiers (Jira, Jenkins, GitLab CI), ajoutez les reporters voulus dans `playwright.config.ts` :

```ts
reporter: [
  ['html'],
  ['list'],
  ['json',  { outputFile: 'rapports/resultats.json' }],
  ['junit', { outputFile: 'rapports/resultats.xml' }],
],
```

| Format | Usage |
|---|---|
| `html` | démonstration, client, archivage |
| `list` | lecture au terminal pendant le développement |
| `json` | traitement automatisé, tableaux de bord maison |
| `junit` | intégration CI/CD, remontée dans Jira ou Jenkins |

Ou ponctuellement, sans toucher à la configuration :

```bash
npx playwright test --reporter=json > resultats.json
npx playwright test --reporter=junit
```

## 9.4 Le Trace viewer

Pour rejouer un test après coup, sur n'importe quelle machine :

```bash
npx playwright show-trace test-results/<dossier-du-test>/trace.zip
```

C'est l'argument commercial le plus efficace : « quand un test casse la nuit sur le serveur, vous rejouez la scène le matin, image par image ».

Pour enregistrer une trace même en cas de succès : `npx playwright test --trace on`.

---

# Étape 10 — Raccourcis npm

Pour éviter de retaper les options à chaque fois.

## 10.1 Quel fichier

`package.json`, à la racine.

## 10.2 Quoi ajouter

Repérez le bloc `"scripts"` et remplacez-le par :

```json
"scripts": {
  "test": "playwright test",
  "test:demo": "playwright test --headed --workers=1",
  "test:ui": "playwright test --ui",
  "test:auth": "playwright test 01-authentification",
  "test:panier": "playwright test 03-panier",
  "test:debug": "playwright test --debug",
  "rapport": "playwright show-report"
},
```

Attention à la virgule finale si un autre bloc suit.

## 10.3 Usage

```bash
npm test
npm run test:demo
npm run test:ui
npm run rapport
```

C'est ce que vous donnerez à un client ou à un nouveau membre de l'équipe : quatre commandes à retenir au lieu de dix options à mémoriser.

---

# Étape 11 — Diagnostiquer un échec

## 11.1 Les trois réflexes, dans l'ordre

```bash
# 1. Voir le film du test
npx playwright test --ui

# 2. Avancer ligne par ligne
npx playwright test 04-commande --debug

# 3. Relire après coup
npx playwright show-report
```

Dans l'UI Mode : **clic sur l'action rouge** → capture au moment exact de l'échec. **Clic sur l'onglet Errors** → le locator fautif et la valeur attendue.

## 11.2 Les erreurs les plus fréquentes

| Message | Cause | Correction |
|---|---|---|
| `no tests found` | mauvais dossier, ou nom de fichier sans `.spec.ts` | vérifier `testDir` et le nom du fichier |
| `strict mode violation: resolved to N elements` | locator trop large | affiner avec `filter()` ou `getByTestId` |
| `Timeout 5000ms exceeded` sur un locator | élément absent, ou sélecteur faux | **Pick locator** dans l'UI Mode pour relire le vrai sélecteur |
| `getByTestId()` ne trouve rien | `testIdAttribute` absent de la config | ajouter `testIdAttribute: 'data-test'` |
| `browserType.launch: Executable doesn't exist` | navigateurs non installés | `npx playwright install` |
| Test vert seul, rouge en groupe | dépendance entre tests | chaque test doit repartir de zéro |
| Erreur de syntaxe rouge dans VS Code | virgule ou accolade manquante | `Ctrl+Z` et recommencer la ligne |

## 11.3 La règle de maintenance

Quand un test casse après une mise à jour du site : **corrigez le locator, pas l'assertion**. L'exigence métier, elle, n'a pas changé.

Une assertion qu'on assouplit pour faire passer un test est une exigence qu'on abandonne sans le dire.

---

# Annexe A — Jeu de données

**Comptes** — mot de passe commun `secret_sauce`

| Identifiant | Comportement |
|---|---|
| `standard_user` | parcours nominal |
| `locked_out_user` | connexion refusée |
| `problem_user` | bugs volontaires (images, formulaires) — hors périmètre |
| `performance_glitch_user` | lenteurs volontaires — hors périmètre |

**Catalogue**

| Produit | Prix | Identifiant du bouton |
|---|---|---|
| Sauce Labs Backpack | 29.99 | `add-to-cart-sauce-labs-backpack` |
| Sauce Labs Bike Light | 9.99 | `add-to-cart-sauce-labs-bike-light` |
| Sauce Labs Bolt T-Shirt | 15.99 | `add-to-cart-sauce-labs-bolt-t-shirt` |
| Sauce Labs Fleece Jacket | 49.99 | `add-to-cart-sauce-labs-fleece-jacket` |
| Sauce Labs Onesie | 7.99 | `add-to-cart-sauce-labs-onesie` |
| Test.allTheThings() T-Shirt (Red) | 15.99 | `add-to-cart-test.allthethings()-t-shirt-(red)` |

**Client de commande** — Joël / Kuate / 1081

---

# Annexe B — Matrice de couverture

| Fonction | Nominal | Négatif | Validation | Fichier |
|---|---|---|---|---|
| Authentification | CT-01 | CT-02, CT-03 | CT-04 | `01-authentification` |
| Catalogue | CT-05 | — | CT-06 | `02-catalogue` |
| Panier | CT-07, CT-09 | CT-08 | — | `03-panier` |
| Commande | CT-10 | — | — | `04-commande` |

**Angles morts assumés**, pour une itération suivante :
- validation du formulaire de commande (champs obligatoires manquants)
- déconnexion via le menu latéral
- calcul de la TVA et du total sur la page de récapitulatif
- persistance du panier après déconnexion / reconnexion

**Critère de sortie :** 10 tests au vert, aucun test instable sur trois exécutions consécutives.

---

# Annexe C — Conventions d'écriture

1. Un nom de test est une phrase métier lisible par un non-technicien.
2. Toute ligne commençant par `page.` ou `expect(` est précédée de `await`.
3. Priorité des locators : `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId` → CSS.
4. Aucune attente fixe : l'attente automatique de Playwright suffit. Un `waitForTimeout(3000)` est soit trop court un jour de lenteur, soit du temps perdu tous les autres jours.
5. Une assertion au minimum par cas, portant sur la conséquence métier de l'action. Un clic sans assertion ne teste rien.

---

# Annexe D — Documentation officielle couverte

| Sujet | Page |
|---|---|
| Installation | playwright.dev/docs/intro |
| Configuration | /docs/test-configuration |
| Écriture des tests | /docs/writing-tests |
| Locators et priorités | /docs/locators |
| Filtrage et chaînage | /docs/locators#filtering-locators |
| Saisie et clics | /docs/input |
| Assertions | /docs/test-assertions |
| Attente automatique | /docs/actionability |
| Hooks (`beforeEach`) | /docs/api/class-test |
| Isolation des tests | /docs/browser-contexts |
| Rapports | /docs/test-reporters |
| Débogage | /docs/debug |
| Trace viewer | /docs/trace-viewer |

---

*Digital House Company — hello@dhcompany.pro — dhcompany.pro*
