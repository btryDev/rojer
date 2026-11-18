# ADR-058 — Un compte sans abonnement depuis douze mois est supprimé, après deux avertissements

- Statut : acceptée (2026-11-09)
- Décision de la propriétaire : 2026-11-05 et 06 (« la conservation est à
  l'utilisateur, pas à Rojer » ; douze mois de lecture, puis suppression ;
  e-mails J-30 et J-7), et 2026-11-09 (« pourquoi on ne le fait pas
  maintenant ? »)
- Confirmée le 2026-11-17 par la propriétaire, après comparaison : les
  éditeurs effacent 30 à 90 jours après la fin (Basecamp 30, Formstack et
  ChartMogul 60, DocuClipper 90) ; la CNIL exige une durée fixée (Discord
  sanctionné pour une conservation jusqu'à la fermeture du compte) et admet
  au plus deux ans pour un compte inactif. Douze mois est retenu. Les textes
  qui promettaient l'inverse sont corrigés le même jour : conditions
  générales (version `2026-11-17-provisoire`), page Abonnement, écran
  d'essai, grille des tarifs.
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
   e-mails soient partis : un avertissement qui n'est parti vers personne
   (échec d'envoi, aucun propriétaire joignable) rend sa marque et sera
   retenté.
3. **Les avertissements** : à J-30 et J-7, aux propriétaires du compte, par
   la tâche quotidienne (`lib/taches/quotidiennes.ts`). Le texte donne la
   date, le lien vers la page Abonnement, ce qui se garde (les versions
   validées du DUERP, téléchargeables sans abonnement — un compte d'avant le
   lancement a pu en valider sans payer — et, pour un compte qui a payé,
   l'export du dossier), et dit que la conservation du DUERP revient à
   l'employeur. Au plus une fois chacun (marque posée avant l'envoi, comme
   le rappel de fin d'essai). **Les autres membres** (membre, lecture)
   reçoivent un message à eux avec le rappel J-7 : la date, et que seul un
   propriétaire peut réabonner (décision du 2026-11-09, usage des éditeurs
   qui préviennent toute l'équipe). Leur envoi ne retient pas la suppression.
4. **La suppression** (`lib/abonnements/suppression.ts`), un compte à la fois,
   par la tâche quotidienne. [2026-11-17 : jamais pendant un paiement —
   « S'abonner » écrit `Abonnement.paiementOuvertLe` avant d'ouvrir Checkout,
   dont la page expire au bout d'une heure ; la suppression le lit sous le
   verrou de la ligne et attend le lendemain si la page a moins d'une heure
   [2026-11-18 : d'une heure et dix minutes — la marque précède la page, dont
   Stripe compte l'expiration sur sa propre horloge].
   Les sessions Checkout ne sont plus lues ni expirées par la suppression.]
   - chez Stripe, qui fait foi : les sessions Checkout ouvertes expirent ;
     un abonnement OUVERT chez Stripe (notre copie en retard d'un webhook)
     annule la suppression et fait relire la copie ; un premier paiement en
     cours (`incomplete` : prélèvement, 3D Secure) la reporte ; sinon, les abonnements
     non terminés (pause, impayé) sont résiliés, sans quoi Stripe pourrait
     encore facturer ; ~~le client Stripe et ses factures restent
     (comptabilité de Rojer)~~ [2026-11-18, relecture de la suppression :
     ses factures encore ouvertes sont annulées et ses brouillons supprimés,
     avant l'effacement — une facture annulée ne se paie plus, son lien non
     plus ; une facture payée entre-temps fait échouer l'annulation, et le
     compte attend. Le client et ses factures restent s'il a payé une fois
     (comptabilité de Rojer) ; s'il n'a jamais payé et que Stripe ne lui
     connaît aucune facture, il est supprimé chez Stripe après l'effacement
     (rien à garder), un échec étant signalé]. Stripe injoignable : le compte attend la
     passe suivante, et passe derrière les autres comptes échus (un compte
     qui échoue chaque jour ne bloque pas la file) [2026-11-18 : tout report
     — Stripe ou base — se signale par une alerte, une fois par jour et par
     compte ; il n'allait qu'au journal]. Client Stripe supprimé
     à la main : il n'y a rien à résilier, la suppression suit ;
   - en base, dans une transaction, la ligne d'abonnement verrouillée et la
     condition relue (un réabonnement de dernière minute l'emporte) : les
     versions de DUERP, les entreprises (tout leur contenu suit par
     cascade), les demandes d'assistance, les preuves d'acceptation des
     conditions (leur trace reste, § 5), l'abonnement, puis le compte (membres, invitations,
     consommations, fichiers comptés) ; enfin les personnes qui ne sont
     membres d'aucun autre compte et dont rien ne garde la trace ailleurs
     (signature, lien d'accès, demande, acceptation, invitation envoyée)
     [2026-11-18 : verrouillées avant d'être comptées — une invitation
     acceptée au même instant attend la fin de la transaction. Les liens qui
     refusent l'effacement d'une personne, d'un compte ou d'un DUERP sont
     listés par une garde qui relit le schéma (`suppression-schema.test.ts`) :
     un lien neuf la fait échouer tant que la suppression ne le traite pas] ;
   - les fichiers du stockage (ceux des établissements et tout fichier
     compté au compte) : notés DANS la transaction (`FichierALiberer`),
     retirés après par la tâche quotidienne, et retentés chaque jour tant
     que le stockage échoue, les moins tentés d'abord. Un fichier dont la
     ligne est effacée ne reste pas lisible (décision du 2026-11-09).
   - Restent : `EssaiEntreprise` (un essai par SIREN, ADR-053 § 8), le
     client Stripe [2026-11-18 : s'il a payé une fois], les journaux.
5. **La trace** (`CompteSupprime`), écrite dans la même transaction et gardée
   **cinq ans** (prescription de droit commun, art. 2224 C. civ.), puis
   effacée par la tâche quotidienne : le nom du compte, les adresses des
   propriétaires, les acceptations des conditions (adresse, version,
   empreinte, contexte, date), les dates des deux avertissements et de la suppression.
   Aucune donnée métier. C'est la preuve, en cas de litige, que la clause a
   été acceptée et appliquée comme annoncé (décision du 2026-11-09 ;
   `docs/rgpd.md` § 4). Les conditions générales doivent dire cette durée.
6. **Seulement l'offre lancée** : sinon la saisie est ouverte à tous, et
   rien ne s'avertit ni ne se supprime. Limite : l'horloge court pendant un
   retrait de l'offre ; un compte déjà averti à J-30 recevra J-7 à la
   relance, et sera supprimé 7 jours après.
7. **Hors de cette règle**, faute de date de départ : un compte qui n'a
   jamais eu de ligne d'abonnement (comptes d'avant le lancement de l'offre).
   Leur sort se décidera au lancement (point ouvert ci-dessous).

## Conséquences

- Quatre colonnes neuves sur `Abonnement` : `sansAbonnementDepuis`,
  `suppressionPrevueLe`, `avertiSuppression30Le`, `avertiSuppression7Le`.
- Deux tables hors compte : `CompteSupprime` (la trace, § 5) et
  `FichierALiberer` (la file des fichiers, § 4).
- La page Abonnement dit la date de suppression prévue.
- Les conditions générales (avocat) doivent dire la même chose.

## Points ouverts

- Comptes d'avant le lancement, sans ligne d'abonnement : date de départ =
  date du lancement ? À décider avec le lancement.
- ~~Suppression à la demande (« supprimer mon compte », RGPD art. 17) : la
  même fonction la permettra ; l'écran n'est pas fait.~~ [2026-11-18 :
  tranchée, § 8 ci-dessous.]

## Amendement du 2026-11-18 — § 8, la suppression à la demande

Décision de la propriétaire du 2026-11-17 et 18 : « si on est propriétaire on
le supprime, si on est invité on le quitte » ; la suppression résilie
l'abonnement ; délai de 7 jours, annulable ; n'importe quel propriétaire.

8. **Supprimer le compte**, geste d'un propriétaire (`/compte/suppression`,
   depuis la page Membres ; un membre invité garde « Quitter le compte »).
   - **Avant le geste**, la page dit ce qui part (établissements, documents,
     fichiers, accès de l'équipe ; les membres sans autre compte Rojer
     perdent leur identifiant), compte les versions validées du DUERP avec
     le lien de chaque établissement, rappelle que leur conservation
     quarante ans est à l'employeur, propose l'export s'il a payé, et dit
     que l'abonnement sera résilié sans remboursement de la période entamée.
   - **La confirmation** : le nom du compte tapé, et le mot de passe de la
     personne (vérifié par Better Auth, limite d'essais par personne).
   - **La demande** pose `Compte.suppressionDemandeeLe` (et qui l'a faite) ;
     l'effacement vient **7 jours plus tard**, par la tâche quotidienne et
     la même fonction que § 4. Un e-mail part aux propriétaires (la date, le
     lien pour annuler) et aux autres membres.
   - **Rien n'est résilié à la demande** : annuler doit tout remettre comme
     avant, abonnement compris (résilier au clic aurait fait perdre au
     dirigeant qui se ravise ce qu'il avait payé). Seule exception : un
     abonnement qui se renouvellerait avant la date de suppression reçoit
     une fin programmée à son échéance (`cancel_at_period_end`), notée
     (`Compte.suppressionFinPosee`) et retirée si la demande est annulée —
     pour ne pas prélever une période d'un compte qui va disparaître.
   - **Refusée** tant qu'une page de paiement est ouverte (§ 4) ou qu'un
     changement de formule est planifié (Stripe refuserait la fin
     programmée, ADR-053 § 10). S'abonner est refusé tant que la demande
     court : on annule d'abord.
   - **Pendant les 7 jours**, le compte vit normalement, un bandeau en tête
     du dossier dit la date ; un propriétaire l'annule d'un geste (e-mail aux
     propriétaires et aux membres).
   - **À l'effacement** : la condition relue sous verrou (demande toujours
     là, âgée de 7 jours, aucun paiement en cours), puis les gestes Stripe
     du § 4 — abonnements résiliés, factures payables annulées, client sans
     facture supprimé —, puis la transaction du § 4. Un compte sans client
     Stripe se supprime même sans clé Stripe.
   - **La trace** (§ 5) gagne le motif (`demande` ou `sans_abonnement`) et
     l'adresse de qui a demandé.

   Conséquences : trois colonnes sur `Compte` (`suppressionDemandeeLe`,
   `suppressionDemandeePar`, `suppressionFinPosee`), deux sur
   `CompteSupprime` (`motif`, `demandeePar`). Aucune table neuve.
