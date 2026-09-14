/**
 * serveur.js — Exercice 4 · le petit serveur qui rend le déploiement possible.
 * ---------------------------------------------------------------------------
 * Pourquoi un serveur alors que l'application marche déjà en double-cliquant
 * index.html ? Pour UNE raison, et elle est capitale :
 *
 *     une clé d'API ne doit JAMAIS partir dans le navigateur.
 *
 * Tant que la page appelle directement OpenAI, la clé est dans le code source,
 * visible par n'importe quel visiteur. Ici, le navigateur appelle VOTRE
 * serveur, et c'est le serveur qui détient la clé. Une couche de plus,
 * et le problème disparaît.
 *
 * Aucune dépendance : uniquement les modules livrés avec Node.
 * Lancement :  node serveur.js
 * Puis ouvrez http://localhost:3000
 * ---------------------------------------------------------------------------
 */

'use strict';

const http = require('http');       // serveur HTTP, fourni par Node
const fs = require('fs');           // lecture de fichiers
const path = require('path');       // manipulation de chemins, portable Windows/Linux

const PORT = process.env.PORT || 3000;

// La clé est lue dans l'ENVIRONNEMENT, jamais écrite dans le fichier.
// Sous Windows :   set LLM_API_KEY=sk-...  puis  node serveur.js
// Sous macOS/Linux : LLM_API_KEY=sk-... node serveur.js
const CLE_API = process.env.LLM_API_KEY || '';
const BASE_URL = process.env.LLM_BASE_URL || 'http://localhost:1234/v1';

/** Les types MIME des fichiers que l'on sert. Sans eux, le navigateur se trompe. */
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml'
};

const serveur = http.createServer(async function (requete, reponse) {

  // ---- Route 1 : /api/sante -----------------------------------------------
  // Dire si la configuration est bonne, SANS jamais révéler la clé.
  // Une route de santé qui affiche la clé est une faille, pas une aide.
  if (requete.url === '/api/sante') {
    return envoyerJson(reponse, 200, {
      etat: 'ok',
      cleConfiguree: CLE_API.length > 0,     // un booléen, pas la clé
      serveurLlm: BASE_URL,
      horodatage: new Date().toISOString()
    });
  }

  // ---- Route 2 : /api/chat ------------------------------------------------
  // Le relais vers le modèle. Le navigateur envoie sa demande ici ;
  // le serveur ajoute la clé et transmet.
  if (requete.url === '/api/chat' && requete.method === 'POST') {
    try {
      const corps = await lireCorps(requete);

      // Garde-fou : on limite ce que l'on accepte de relayer.
      // Sans cette limite, n'importe qui peut vider votre budget.
      if (!corps.messages || !Array.isArray(corps.messages) || corps.messages.length > 20) {
        return envoyerJson(reponse, 400, { erreur: 'Requête invalide ou trop longue.' });
      }

      const reponseLlm = await fetch(BASE_URL + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (CLE_API || 'lm-studio')
        },
        body: JSON.stringify({
          model: corps.model || 'local-model',
          messages: corps.messages,
          temperature: corps.temperature === undefined ? 0 : corps.temperature,
          max_tokens: Math.min(corps.max_tokens || 500, 2000)   // plafond imposé
        })
      });

      const donnees = await reponseLlm.json();
      return envoyerJson(reponse, reponseLlm.status, donnees);

    } catch (erreur) {
      // On journalise le détail côté serveur, on renvoie un message générique
      // côté client : un message d'erreur bavard aide surtout les attaquants.
      console.error('Erreur /api/chat :', erreur.message);
      return envoyerJson(reponse, 502, { erreur: 'Le modèle est injoignable.' });
    }
  }

  // ---- Route 3 : les fichiers statiques ------------------------------------
  // On sert index.html, app.js, calcul-couts.js…
  let chemin = requete.url === '/' ? '/index.html' : requete.url;

  // SÉCURITÉ : on empêche « ../../etc/passwd ». Sans cette ligne, n'importe
  // quel fichier de la machine devient téléchargeable. C'est la faille
  // la plus ancienne du web, et elle est encore exploitée en 2026.
  chemin = path.normalize(chemin).replace(/^(\.\.[\/\\])+/, '');
  const fichier = path.join(__dirname, chemin);

  if (!fichier.startsWith(__dirname)) {
    return envoyerTexte(reponse, 403, 'Accès refusé.');
  }

  fs.readFile(fichier, function (erreur, contenu) {
    if (erreur) return envoyerTexte(reponse, 404, 'Fichier introuvable : ' + chemin);
    const type = TYPES[path.extname(fichier)] || 'application/octet-stream';
    reponse.writeHead(200, { 'Content-Type': type });
    reponse.end(contenu);
  });
});

/** Lit le corps d'une requête POST et le décode en objet. */
function lireCorps(requete) {
  return new Promise(function (resoudre, rejeter) {
    let brut = '';
    requete.on('data', function (morceau) {
      brut += morceau;
      // Coupe-circuit : au-delà de 100 Ko, on refuse. Une requête légitime
      // de cette application ne dépasse jamais quelques kilo-octets.
      if (brut.length > 100000) {
        requete.destroy();
        rejeter(new Error('Corps de requête trop volumineux.'));
      }
    });
    requete.on('end', function () {
      try { resoudre(JSON.parse(brut || '{}')); }
      catch (e) { rejeter(new Error('JSON invalide.')); }
    });
  });
}

function envoyerJson(reponse, code, objet) {
  reponse.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  reponse.end(JSON.stringify(objet));
}

function envoyerTexte(reponse, code, texte) {
  reponse.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
  reponse.end(texte);
}

serveur.listen(PORT, function () {
  console.log('Application disponible sur http://localhost:' + PORT);
  console.log('Clé d\'API : ' + (CLE_API ? 'configurée' : 'absente (mode LM Studio ou hors ligne)'));
  console.log('Serveur de modèle : ' + BASE_URL);
});
