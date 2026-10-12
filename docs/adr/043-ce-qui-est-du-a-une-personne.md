# ADR-043 — Ce qui est dû à une personne se lit sur sa fiche, depuis son entrée

- **Statut** : **EN COURS sur sa branche le 2026-10-12** (`lot/du-a-la-personne`),
  non fusionnée. Périmètre et trois décisions validés par la propriétaire le
  2026-10-12 (« ok vas-y avec tes recommandations »).
- **Amende** : l'ADR-023 (le salarié porte ses titres) sur un point — un titre
  **dû à tout l'effectif** et jamais déclaré se montre comme dû, daté depuis
  `Salarie.entreLe` ; l'ADR-024 (transmissions) — une transmission d'un titre
  salarié vers un autre titre de la même personne est désormais LUE, et dit
  quand elle est exigible. **Ne renverse pas** l'ADR-023 : rien n'est déduit
  de ce qu'une personne fait ; seuls les titres que le texte doit à TOUS, et
  ceux qu'un titre déjà déclaré appelle, sont montrés.
- **Portée** : `referentiels/conformite/` (`premierDelai` sur deux titres,
  champ `delai` d'une transmission), `salaries/du-a-la-personne.ts`, la fiche
  salarié, le compteur d'Équipe et du rail, le tableau de bord
  (`dashboard/transmissions.ts`), `surfaces/obligations-sans-surface.ts`, le
  plan d'actions (lien mesure du DUERP → titre).

## 1. Le problème

Mesuré le 2026-10-12, en lisant le code de `main` (54cbb45f) :

- `Salarie.entreLe` est documenté au schéma comme le « point de départ des
  obligations à l'embauche » et le formulaire le promet. **Aucun calcul ne le
  lit** (rapport « surface des quatorze » § 4.1).
- La visite d'information et de prévention (`R. 4624-10`, trois mois après la
  prise de poste) est due à tout travailleur. **Aucune surface ne la montre
  tant qu'aucun titre n'est déclaré** : le générateur ne part que des titres.
- La formation à la sécurité (`R. 4141-20`, dans le mois qui suit
  l'affectation) est listée sur la fiche, sans date.
- Le signal du tableau de bord « suppose un titre nominatif » se tait dès
  qu'**un** salarié détient le titre, pour tout l'effectif.
- Les transmissions entre titres d'une même personne — suivi renforcé →
  visite intermédiaire (`R. 4624-28`), autorisation de conduite → attestation
  médicale (`R. 4323-56`) — sont déclarées au référentiel et **jamais lues**
  (`engine.ts` rend `null` pour le porteur salarié).

## 2. La décision

1. **Deux titres sont dus à l'entrée, et le référentiel le dit** : la VIP
   (`premierDelai: "trimestrielle"`) et la formation à la sécurité
   (`premierDelai: "mensuelle"`). Pour un porteur salarié, le point de départ
   du premier délai est `Salarie.entreLe`. Le champ existait ; il est
   réemployé, pas doublé. Il entre à l'empreinte : `REFERENTIEL_VERSION`
   bouge, sans qu'aucune ligne de calendrier ne change (le générateur des
   titres ne le lit pas).
2. **Une transmission entre deux titres d'une personne dit quand elle est
   exigible** : `delai: "rythme_du_titre"` (la visite intermédiaire, au plus
   tard deux ans après la visite du médecin) ou `delai: "aucun"` (l'attestation
   médicale, sans laquelle l'autorisation n'est pas valide).
3. **Une seule fonction pure dit ce qui manque à une personne** :
   `ceQuiManqueALaPersonne` (`salaries/du-a-la-personne.ts`). Un titre manque
   s'il n'a **jamais** été déclaré pour elle, et qu'il est soit dû à l'entrée,
   soit appelé par un titre qu'elle détient — sauf si elle détient un titre
   que le droit déclare exclusif (`exclusionsDuTitre`, p. ex. le suivi renforcé
   qui se substitue à la VIP, `R. 4624-24`). Un titre déjà déclaré suit son
   propre cycle, comme avant : la fonction ne le recompte pas.
4. **Sans date d'entrée, l'échéance n'est pas calculée** et l'écran le dit.
   Jamais « en retard » sur une date que le produit n'a pas.
5. **Les surfaces lisent la même fonction** : la carte « À déclarer pour
   cette personne » de la fiche, les cartes et l'en-tête d'Équipe, le compteur
   du rail, le tableau de bord (compte par personne : par la transmission
   quand une obligation d'établissement en porte une, sinon par la carte
   « Titres dus à vos salariés, non déclarés » — la VIP, relecture B1).

## 3. Les trois décisions de la propriétaire (2026-10-12)

- **(a) Pas de ligne de calendrier.** Les manques ne créent aucune
  `Verification` : le réconciliateur est le point fragile relevé par les audits
  du 2026-09-09 (porteur disparu, écritures aveugles par id). Conséquence
  assumée : ces échéances ne pèsent pas dans le score. Une fois le titre
  déclaré, sa ligne naît comme aujourd'hui.
- **(b) « Dû à chaque salarié actif » pour les deux titres dus à tous ;
  « dû seulement s'il est déclaré » pour les titres sous condition** (suivi
  renforcé, secouriste, CSE…) : le produit ne sait pas qui y est soumis et ne
  le devine pas (ADR-023).
- **(c) L'exemption « sans surface » des titres salarié est resserrée, pas
  retirée.** Les titres sous condition restent listés dans Équipe (catalogue) ;
  les titres dus à l'entrée ont désormais une surface de décision réelle.

- **(d) Un manque en retard compte comme un retard** (2026-10-12, après le
  passage visuel : option 1). Au tableau de bord, une carte de titres dus
  dont au moins une personne est en retard prend la priorité d'une
  vérification dépassée, classée par sa plus ancienne échéance ; sans retard,
  elle garde le rang des transmissions. Rien n'est réservé : le rang suit la
  date. À priorité fixe, sur un dossier de quarante vérifications en retard,
  la carte tombait au-delà du cinquantième rang et la limite de cinq la
  coupait.

## 4. Ce qui n'est pas fait

- Aucune obligation nouvelle n'est encodée.
- Les dispenses de `R. 4624-15` (VIP récente chez un autre employeur) et de
  `R. 4624-27` (examen d'aptitude récent) ne sont pas calculées : l'employeur
  qui en bénéficie déclare la visite antérieure, avec sa date, et le titre est
  alors détenu.
- **Les visites AVANT l'affectation ne sont pas calculées** (relecture
  indépendante du 2026-10-12, R1) : `R. 4624-18` (travailleur de nuit, moins
  de dix-huit ans… — visite préalable) et l'examen d'aptitude du suivi
  renforcé (`R. 4624-24`), pour une personne dont le titre n'est pas encore
  déclaré. La fiche annonce les trois mois du régime général : pour ces
  personnes, c'est PLUS TARD que le texte. Sens permissif, assumé faute de
  savoir qui relève de ces régimes (ADR-023) ; la VIP adaptée et le suivi
  renforcé, une fois déclarés, écartent la VIP.
- **La formation à la sécurité n'est datée qu'en son volet « accident ou
  sinistre »** (relecture C1) : c'est le seul que `R. 4141-20` date.
  `premierDelaiVise` le nomme à l'écran.
- **La décision (c) ne change aujourd'hui aucun compte** (relecture R6) :
  tous les titres que la fiche lit atteignaient déjà le calendrier ou les
  faits. La surface `fiche_salarie` est nommée pour que la garde reste juste
  le jour où un titre dû à l'entrée n'aurait que la fiche.
- `entreLe` est la date d'entrée dans l'effectif ; les textes parlent de
  « prise effective du poste » et d'« affectation à l'emploi ». À l'embauche,
  elles coïncident ; un changement de poste (qui redéclenche la formation à
  la sécurité) n'est pas observé.
