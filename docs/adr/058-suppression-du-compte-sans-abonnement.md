# ADR-058 — Un compte sans abonnement depuis douze mois est supprimé, après deux avertissements

- Statut : acceptée (2026-11-09)
- Décision de la propriétaire : 2026-11-05 et 06 (« la conservation est à
  l'utilisateur, pas à Rojer » ; douze mois de lecture, puis suppression ;
  e-mails J-30 et J-7), et 2026-11-09 (« pourquoi on ne le fait pas
  maintenant ? »)
- Complète : ADR-053 (abonnements), ADR-054 (comptes et membres)
- Amende : la règle 10 de CLAUDE.md (rayée le 2026-11-09, #258)

## Contexte

Sans abonnement (fin d'essai sans carte, impayé définitif, résiliation), la
saisie se ferme et la lecture reste ouverte — l'export aussi pour un compte
qui a payé (ADR-053 §§ 3 et 15). Sans délai, Rojer garderait ces données à
vie. La propriétaire a tranché : **douze mois**, puis suppression, avec un
e-mail 30 jours et 7 jours avant.

Rojer agit pour l'employeur (sous-traitant, art. 28 RGPD) : à la fin du
contrat, il rend ou efface les données, au choix du responsable. La
conservation quarante ans du DUERP (L. 4121-3-1 V, R. 4121-4) est
l'obligation de l'**employeur** : l'export la lui permet, Rojer ne s'y
substitue pas.

Aujourd'hui, `supprimerEntreprise` refuse d'effacer une entreprise qui porte
des versions de DUERP, au nom des quarante ans. Ce refus protège l'employeur
d'un geste malheureux tant qu'il est client ; il reste en place. La
suppression de ce lot est d'une autre nature : la fin du service, annoncée
deux fois.

## Décision

1. **L'horloge** : `Abonnement.sansAbonnementDepuis`, écrite par la
   synchronisation Stripe (la seule écriture de la ligne). Statut ouvert
   (`trialing`, `active`, `past_due`) : vide, et les avertissements aussi —
   un compte qui se réabonne repart de zéro. Statut fermé : la fin de
   l'abonnement chez Stripe (`ended_at` ; pour une pause de fin d'essai,
   `trial_end`), sinon la date déjà notée, sinon l'heure de la relecture
   (`unpaid` n'a pas de date chez Stripe).
2. **La date de suppression** : douze mois après, `suppressionPrevueLe`,
   posée au premier avertissement et jamais avancée — **au moins 30 jours
   après le premier e-mail, au moins 7 jours après le second**, même si une
   tâche a manqué un jour. Aucun compte n'est supprimé sans que les deux
   e-mails soient partis.
3. **Les avertissements** : à J-30 et J-7, aux propriétaires du compte, par
   la tâche quotidienne (`lib/taches/quotidiennes.ts`). Le texte donne la
   date, le lien vers la page Abonnement, ce qui se garde (les versions
   validées du DUERP, téléchargeables sans abonnement — un compte d'avant le
   lancement a pu en valider sans payer — et, pour un compte qui a payé,
   l'export du dossier), et dit que la conservation du DUERP revient à
   l'employeur. Au plus une fois chacun (marque posée avant l'envoi, comme
   le rappel de fin d'essai).
4. **La suppression** (`lib/abonnements/suppression.ts`), un compte à la fois,
   par la tâche quotidienne :
   - chez Stripe, qui fait foi : les sessions Checkout ouvertes expirent ;
     un abonnement OUVERT chez Stripe (notre copie en retard d'un webhook)
     annule la suppression et fait relire la copie ; un premier paiement en
     cours (`incomplete` : prélèvement, 3D Secure) la reporte ; sinon, les abonnements
     non terminés (pause, impayé) sont résiliés, sans quoi Stripe pourrait
     encore facturer ; le client Stripe et ses factures restent
     (comptabilité de Rojer). Stripe injoignable : le compte attend la
     passe suivante ;
   - en base, dans une transaction, la ligne d'abonnement verrouillée et la
     condition relue (un réabonnement de dernière minute l'emporte) : les
     versions de DUERP, les entreprises (tout leur contenu suit par
     cascade), les demandes d'assistance, les preuves d'acceptation des
     conditions, l'abonnement, puis le compte (membres, invitations,
     consommations, fichiers comptés) ; enfin les personnes qui ne sont
     membres d'aucun autre compte ;
   - les fichiers du stockage, après la transaction (ceux des
     établissements et tout fichier compté au compte).
   - Restent : `EssaiEntreprise` (un essai par SIREN, ADR-053 § 8), le
     client Stripe, les journaux.
5. **Seulement l'offre lancée** : sinon la saisie est ouverte à tous, et
   rien ne s'avertit ni ne se supprime. Limite : l'horloge court pendant un
   retrait de l'offre ; un compte déjà averti à J-30 recevra J-7 à la
   relance, et sera supprimé 7 jours après.
6. **Hors de cette règle**, faute de date de départ : un compte qui n'a
   jamais eu de ligne d'abonnement (comptes d'avant le lancement de l'offre).
   Leur sort se décidera au lancement (point ouvert ci-dessous).

## Conséquences

- Quatre colonnes neuves sur `Abonnement` : `sansAbonnementDepuis`,
  `suppressionPrevueLe`, `avertiSuppression30Le`, `avertiSuppression7Le`.
- La page Abonnement dit la date de suppression prévue.
- Les conditions générales (avocat) doivent dire la même chose.

## Points ouverts

- Comptes d'avant le lancement, sans ligne d'abonnement : date de départ =
  date du lancement ? À décider avec le lancement.
- Suppression à la demande (« supprimer mon compte », RGPD art. 17) : la
  même fonction la permettra ; l'écran n'est pas fait.
