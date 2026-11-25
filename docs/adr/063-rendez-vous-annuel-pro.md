# ADR-063 — Le rendez-vous annuel de la formule Pro : un par an et par compte, sur des créneaux ouverts hors de l'application

- **Statut** : ~~**proposée**, 2026-11-24 — à valider par la propriétaire avant
  d'être codée (CLAUDE.md, règle 2 : deux tables neuves).~~ [2026-11-24 :
  **codée** sur `lot/assistance`, à la demande de la propriétaire (« faudra
  que tu me mettes des créneaux »), en essai local. ~~**Pas encore codé : le
  § 7, point 2** — la tâche quotidienne qui annule la veille un rendez-vous
  dont le compte n'est plus en Pro. L'écran annonce déjà la fin connue de la
  formule (§ 7, point 1).~~ [2026-11-24, même lot : codé —
  `assistance/hors-pro.ts`, joué par la tâche quotidienne ; voir § 7.] Écrans
  refaits sur la maquette validée (« Réserver le rendez-vous de l'année »,
  artefact Design du 2026-11-24).]
- **Décisions de la propriétaire du 2026-11-24**, prises sur les maquettes de
  l'Assistance :
  - « 1 rdv par an c'est tout » ;
  - un rendez-vous pour tous les établissements du compte ;
  - le client ne voit que les créneaux libres, jamais ceux pris par d'autres ;
  - la visio est proposée, son lien (Google) est envoyé à la main ;
  - pour ouvrir les créneaux, rien n'est codé : des scripts vers la base,
    puis un agent qui lit un agenda Google ;
  - pas d'espace d'équipe dans Rojer.

## Contexte

La formule Pro promet « un rendez-vous d'1 h par an » (page des tarifs,
conditions générales § 8 ; `heuresExpertParAn` dans `formules.ts`). L'Assistance
(ADR-050, amendée le même jour) sert déjà la question écrite. Il manque la
réservation, et la règle qui borne à un par an.

## Décision

1. **Deux tables.**
   - **`CreneauAssistance`**, hors compte. Champs :
     - `debut`, unique ;
     - `fin` ;
     - `reserveLe`, posé quand un compte prend le créneau, effacé quand il le
       rend.

     Elle est écrite **hors de l'application** : par script, puis par un agent
     qui lit un agenda. Rojer n'y écrit que pour prendre un créneau et le
     rendre.
   - **`RendezVousAssistance`**, racine `compteId` (ADR-054). Champs :
     - le créneau : son identifiant, son début et sa fin, recopiés ;
     - le mode, `telephone` ou `visio` ;
     - le téléphone ;
     - ce que la personne veut aborder ;
     - qui a réservé (`userId`) ;
     - `annuleLe`.
2. **Un par an et par compte, tous établissements compris.**
   - L'année est celle de l'abonnement : de la date anniversaire du premier
     paiement à la suivante (`debutDeLAnnee`, la même que les plafonds annuels
     de l'ADR-053 § 14).
   - Un compte qui n'a jamais payé (compte offert) suit l'année civile.
   - Un rendez-vous non annulé compte pour l'année où il tombe, qu'il ait eu
     lieu ou non. Rien ne se reporte.
3. **Réserver** demande trois conditions :
   - la formule Pro (`assistanceProOuverte`, la règle de l'ADR-050 amendée) ;
   - une saisie ouverte (`verifierSaisie` : ni lecture seule ni impayé) ;
     [2026-11-25 : « impayé » au sens de l'ADR-053 § 3 — `unpaid`,
     `incomplete` ; un paiement en retard (`past_due`) garde la saisie et la
     formule, comme au § 7.]
   - un créneau à plus de 24 h.

   Sous le verrou du compte, l'action vérifie qu'aucun autre rendez-vous non
   annulé ne tombe dans l'année du créneau. Le créneau se prend par une
   écriture conditionnelle (`reserveLe` encore vide) : deux comptes ne prennent
   jamais le même.
   [2026-11-25, décision de la propriétaire : **un seul rendez-vous à venir
   par compte**. Tant qu'il y en a un, une nouvelle réservation est refusée,
   même sur l'année suivante — elle n'aurait ni carte ni geste à l'écran ;
   on déplace celui qui existe.]
4. **Déplacer ou annuler**, jusqu'à 24 h avant.
   - Déplacer rend l'ancien créneau et prend le nouveau dans le même geste.
   - Annuler rend le créneau, et l'année retrouve son rendez-vous.
   - À moins de 24 h, plus rien ne se fait en ligne : le rendez-vous compte.
5. **Le client ne voit que les créneaux libres** à plus de 24 h, mois par mois.
   [2026-11-24, décision de la propriétaire : **sur un mois** — de 24 h après
   maintenant à un mois après (`fenetreDesCreneaux`) ; un créneau ouvert plus
   loin attend d'y entrer, et ne se réserve pas avant.]
6. **Les e-mails.**
   - À la boîte de Rojer, à chaque réservation, déplacement ou annulation :
     date, mode, téléphone ou adresse, ce qui est à aborder, compte. Le lien
     de visio part en réponse, à la main.
   - À la personne, une confirmation.
   - « Ajouter à mon agenda » : un fichier `.ics` servi par l'application.
   - [2026-11-24, maquette : l'invitation `.ics` est aussi jointe à la
     confirmation ; « Préparer le rendez-vous » complète ce qui est à aborder
     jusqu'à 24 h avant, et l'envoie de nouveau à la boîte de Rojer.]
7. **Une formule Pro qui s'arrête avant le rendez-vous.**
   - L'écran l'annonce dès que la fin est connue (résiliation, baisse
     programmée).
   - ~~La tâche quotidienne annule la veille un rendez-vous dont le compte
     n'est plus en Pro, et prévient les deux côtés.~~ [2026-11-24, maquette
     « À avancer » : la tâche quotidienne annule le rendez-vous à venir d'un
     compte qui n'est plus en Pro dès le jour où il ne l'est plus — un impayé
     (`past_due`) garde la formule —, rend le créneau, et prévient les deux
     côtés (`assistance/hors-pro.ts`).] [2026-11-25, relecture : comme les
     gestes de la personne, l'e-mail à l'équipe part dans la transaction —
     s'il échoue, rien n'est annulé et la passe du lendemain recommence ; la
     formule est relue sous le verrou ; un compte en échec n'arrête pas les
     autres. Côté compte, l'annonce va à la personne qui avait réservé si
     elle en est encore membre, sinon aux propriétaires. Limite connue : un
     rendez-vous qui tombe le jour où le Pro s'arrête, avant la passe du
     lendemain, a lieu (`docs/chantiers-ouverts.md` § 26).]
   - [2026-11-25 : « l'écran l'annonce dès que la fin est connue » valait
     pour la résiliation seule — la baisse planifiée ne vit que chez Stripe.
     Elle se relit désormais là (`assistance/fin-du-pro.ts`, la lecture de
     `abonnements/baisse.ts` partagée avec les invitations), seulement pour
     un compte Pro qui a un rendez-vous à venir, et seulement si la formule
     visée n'a pas de rendez-vous (une formule visée inconnue n'est pas dite
     une fin). Stripe injoignable : rien n'est annoncé, c'est noté. Un
     déplacement ne propose alors que les créneaux d'avant la fin du Pro. Une
     résiliation connue (copie de Rojer) borne aussi les créneaux sans
     rendez-vous à venir, et l'action refuse un créneau d'après ; une baisse
     ne se relit pas chez Stripe dans l'action — un créneau d'après, posté
     quand même, sera annulé par la tâche du jour (limite assumée,
     2026-11-25).]
8. **Pas d'écran pour l'équipe.** Les rendez-vous se lisent dans les e-mails
   et par script.
9. **Données personnelles.** Sont gardés le mode, le téléphone et ce qui est
   à aborder, saisis par la personne pour son rendez-vous (base légale 6.1.b).
   Ils sont supprimés avec le compte. Les rendez-vous passés de plus de trois
   ans seront purgés, comme les demandes d'assistance (dette commune).

## Conséquences

- Migration additive : deux tables, RLS activée (`migrations-rls`), index sur
  `compteId` et sur `debut`.
- `portee/correspondance.ts` : `RendezVousAssistance` racine `compteId`,
  `CreneauAssistance` hors compte. Aucune clé étrangère entre les deux : le
  client borné n'a pas de relation à traverser.
- L'Assistance gagne, en Pro, l'onglet « Rendez-vous annuel ». Le parcours
  tient en trois écrans : choisir un créneau, donner ses coordonnées, voir la
  confirmation.
- Rien n'est codé pour ouvrir les créneaux.
- [2026-11-24, au codage]
  - Le client borné ne lit ni n'écrit une table hors compte : les créneaux
    se lisent, se prennent et se rendent en SQL paramétré
    (`assistance/creneaux.ts`, nommé dans la garde du SQL brut), dans la
    transaction du compte — prise du créneau et rendez-vous tiennent ou
    tombent ensemble.
  - `RendezVousAssistance.creneauId` est un texte, pas un UUID : ce n'est pas
    une identité du compte (garde `correspondance.test.ts`).
  - L'e-mail à l'équipe part dans la transaction : s'il échoue, rien n'est
    réservé, déplacé ni annulé. La confirmation à la personne part après.
  - La suppression d'un compte (ADR-058) efface ses rendez-vous et rend le
    créneau de celui à venir.
  - Un membre en lecture seule voit le rendez-vous, sans le prendre ni le
    changer (`verifierSaisie`).
  - [relecture de sécurité du 2026-11-24] Chaque geste (réserver, déplacer,
    annuler, préparer) écrit à l'équipe : dix par jour et par compte au plus
    (`LIMITES.rendezVousCompte`). La tâche quotidienne et la suppression d'un
    compte relisent le rendez-vous sous le verrou du compte avant de rendre
    son créneau ; la suppression d'un compte prévient l'équipe de son
    rendez-vous à venir.
- [2026-11-25, relecture multi-axes] Corrigés sur `lot/rdv-annuel-relecture` :
  - « Préparer » prend le verrou du compte, et ne transmet rien quand le
    texte n'a pas changé ;
  - le compteur de dix gestes par jour se débite juste avant l'envoi à
    l'équipe, une fois les refus passés : un geste refusé ou sans rien de
    nouveau ne compte pas, et des réservations refusées en rafale ne privent
    plus le compte d'annuler ;
  - un geste qui échoue dit ce qui n'a pas changé, plus la phrase du
    formulaire de contact ; l'écran ne dit la confirmation partie que si
    elle l'est ;
  - le `.ics` porte son organisateur (RFC 5546) ;
  - le SQL des créneaux est éprouvé sur une vraie base
    (`creneaux.integration.test.ts`, en CI) ; les transactions simulées des
    tests défont ce qu'elles ont écrit.
