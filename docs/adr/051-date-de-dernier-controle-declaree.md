# ADR-051 — Une date de dernier contrôle déclarée date l'échéance suivante, sans rien prouver

- **Statut** : acceptée, 2026-10-27 — décision de la propriétaire du même jour
  (« Oui, marquée « déclarée » »), sur le compte de test du préventeur où tous
  les contrôles restaient « à planifier ».
- **Amende** l'ADR-036 (règle 3 d'`echeanceDeLigne`). Ne touche pas l'ADR-034 :
  la ligne ne roule pas, aucun rapport n'est créé.

## Contexte

Un établissement neuf dans Rojer n'a ni rapport, ni historique. Ses contrôles à
rythme tombent dans la règle 5 : « à planifier », datés du jour où le suivi
commence. Jusqu'ici, la seule façon de leur donner une échéance était de
déposer le rapport du dernier contrôle, fichier obligatoire. Un exploitant qui
connaît la date de son dernier passage sans avoir la pièce sous la main
restait bloqué, et l'écran ne disait pas pourquoi.

## Décision

1. **Une colonne** `Verification.dernierControleDeclareLe` (nullable, migration
   additive `20261027130000_verification_dernier_controle_declare`).
2. **Règle 3** : la dernière réalisation est, dans l'ordre, le rapport réalisé
   de la ligne, puis la réalisation héritée, **puis la date déclarée**. Un
   rapport l'emporte même s'il est plus ancien : une déclaration ne repousse
   jamais l'échéance qu'une pièce établit. Source `declaration`, statut
   `planifiee` ; le retard se lit sur la date, comme ailleurs.
3. **Ce n'est pas une réalisation.** La ligne n'est jamais soldée par elle, rien
   n'entre au registre ni au dossier de contrôle, et l'écran l'écrit :
   « Calculée d'après le dernier contrôle déclaré le …, sans rapport ».
4. **Où elle se saisit** : sur la fiche de l'appareil, carte « Date du dernier
   contrôle », une ligne par contrôle à rythme sans échéance connue ou déjà daté
   par une déclaration. L'action (`dernier-controle/actions.ts`) refuse une
   ligne ponctuelle, de salarié, archivée, d'appareil retiré, une date future ou
   de plus de vingt ans, et toute date quand un rapport réalisé existe. Vide,
   elle retire la déclaration. La ligne est recalculée sous verrou
   (`recalculerLigne`), comme au dépôt d'un rapport.
5. **L'appareil neuf** ne passe pas par elle : sa date de mise en service, déjà
   lue par la règle 4, date le premier contrôle. La carte y renvoie, et dit
   quand une mise en service trop ancienne ne date rien (règle 4 bornée à
   l'origine du suivi).

## Conséquences

- `VERSION_MOTEUR_CALENDRIER` inchangée : la colonne naît vide, la
  régénération écrit sur chaque dossier exactement ce qu'elle écrivait.
- ~~Une succession de ligne (renommage d'obligation) ne lègue pas la date
  déclarée : seule une réalisation se lègue.~~ [2026-10-27, revue
  indépendante : faux. Une succession ADOPTE la rangée (`adopter`), qui garde
  sa colonne : la date déclarée suit l'obligation renommée ou scindée, avec le
  rythme du successeur. Seule la fusion vers une ligne d'établissement
  (`heritageDesRetirees`) ne la transmet pas. Sans cas en base.]
- Un rapport réalisé déposé sur la ligne EFFACE la date déclarée
  (`rapports/actions.ts`, revue du 2026-10-27) : sans quoi, le rapport
  supprimé, la déclaration oubliée redatait la ligne en silence.
- Une date antérieure à la mise en service de l'appareil est refusée.
- Limite connue : sur une ligne qui porte à la fois un héritage et une
  déclaration, la fiche attribue l'échéance à la déclaration alors que le
  moteur a pris l'héritage. Cas rare, sans cas en base.
- **À trancher par la propriétaire** (revue du 2026-10-27) : une ligne datée par
  une déclaration compte comme n'importe quelle échéance — hors retard si la
  date le dit — dans les compteurs, le MCP et la case « aucune vérification en
  retard » du dossier de contrôle, et la mention « sans rapport » n'est écrite
  que sur la fiche de l'appareil.
- Le contrôle ponctuel (vérification de mise en service) reste soldé par une
  pièce seulement.
