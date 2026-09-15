/**
 * donnees-demo.js — un jeu de contacts pour démarrer.
 * ---------------------------------------------------------------------------
 * Des données de démonstration ne sont pas un détail : elles doivent couvrir
 * les cas intéressants, y compris ceux qui font rater les statistiques.
 * Ici on a volontairement :
 *   - les trois statuts ;
 *   - toutes les sources ;
 *   - des contacts anciens (pour la liste des dormants) ;
 *   - un montant à zéro sur un prospect ;
 *   - un nom avec une apostrophe et un accent.
 *
 * Toute ressemblance avec des personnes existantes serait fortuite :
 * ces contacts sont inventés, et les domaines sont des domaines d'exemple.
 * ---------------------------------------------------------------------------
 */

(function (racine) {
  'use strict';

  const CONTACTS_DEMO = [
    { nom: 'Amina Diallo', email: 'amina.diallo@exemple-nord.be', entreprise: 'Nord Logistique',
      statut: 'client', source: 'recommandation', montant: 8400, dateContact: '2026-08-28',
      notes: 'Renouvellement du contrat annuel signé.' },

    { nom: 'Pierre Vanden Bossche', email: 'p.vandenbossche@exemple-atelier.be', entreprise: 'Atelier 22',
      statut: 'client', source: 'salon', montant: 3200, dateContact: '2026-09-02',
      notes: 'Demande un devis pour un second site.' },

    { nom: 'Chloé N\'Diaye', email: 'chloe.ndiaye@exemple-verte.fr', entreprise: 'Verte Énergie',
      statut: 'prospect', source: 'site-web', montant: 0, dateContact: '2026-09-05',
      notes: 'A téléchargé le livre blanc, pas encore recontactée.' },

    { nom: 'Marc Lefèvre', email: 'marc.lefevre@exemple-bureau.be', entreprise: 'Bureau Central',
      statut: 'client', source: 'prospection', montant: 12750.5, dateContact: '2026-07-15',
      notes: 'Meilleur client. Interlocuteur unique, très réactif.' },

    { nom: 'Sofia Rossi', email: 'sofia.rossi@exemple-media.it', entreprise: 'Media Ponte',
      statut: 'prospect', source: 'salon', montant: 4500, dateContact: '2026-06-11',
      notes: 'Estimation en attente de validation budgétaire.' },

    { nom: 'Jonas Mbala', email: 'jonas.mbala@exemple-tech.cm', entreprise: 'Tech Douala',
      statut: 'client', source: 'recommandation', montant: 2100, dateContact: '2026-08-19',
      notes: 'Premier projet livré. Satisfait.' },

    { nom: 'Élodie Martin', email: 'elodie.martin@exemple-conseil.fr', entreprise: 'Conseil & Co',
      statut: 'inactif', source: 'prospection', montant: 0, dateContact: '2026-02-03',
      notes: 'Ne souhaite plus être contactée avant 2027.' },

    { nom: 'Karim Benali', email: 'k.benali@exemple-sud.fr', entreprise: 'Sud Distribution',
      statut: 'prospect', source: 'site-web', montant: 1800, dateContact: '2026-04-22',
      notes: 'Relance prévue après le déménagement de leurs bureaux.' },

    { nom: 'Lena Hofmann', email: 'lena.hofmann@exemple-bau.de', entreprise: 'Bau Nord',
      statut: 'client', source: 'site-web', montant: 6300, dateContact: '2026-09-01',
      notes: 'Facturation trimestrielle.' },

    { nom: 'Thomas Petit', email: 'thomas.petit@exemple-studio.be', entreprise: 'Studio Petit',
      statut: 'prospect', source: 'inconnue', montant: 0, dateContact: '2026-03-14',
      notes: 'Contact pris lors d\'un événement, à qualifier.' },

    { nom: 'Fatou Sow', email: 'fatou.sow@exemple-import.sn', entreprise: 'Import Dakar',
      statut: 'client', source: 'prospection', montant: 5100, dateContact: '2026-05-30',
      notes: 'Paiement à 60 jours négocié.' },

    { nom: 'Hugo Delvaux', email: 'hugo.delvaux@exemple-forge.be', entreprise: 'La Forge',
      statut: 'inactif', source: 'salon', montant: 0, dateContact: '2026-01-19',
      notes: 'Société en cours de restructuration.' }
  ];

  racine.CONTACTS_DEMO = CONTACTS_DEMO;
  if (typeof module !== 'undefined' && module.exports) module.exports = CONTACTS_DEMO;

})(typeof globalThis !== 'undefined' ? globalThis : this);
