# ADR-042 — Le niveau audit : au référentiel, hors du quotidien, jamais caché

- **Statut** : acceptée, 2026-10-08 — décision de la propriétaire du même jour,
  sur une remarque du préventeur.
- **Amende** : ADR-022 (une obligation dont le champ est atteint peut ne pas
  être servie), ADR-025 § 8 (la page « Ce que Rojer ne couvre pas » distingue
  un statut de plus).
- **Portée** : `referentiels/conformite/types.ts` (`niveau`),
  `referentiels/conformite/niveau-audit.ts` (`estNiveauAudit`, seule lecture),
  `empreinteReferentiel` (segment `niveau:audit`), `matching/engine.ts`
  (`evaluerObligation`, la porte ; `determineObligationsNiveauAudit`),
  `calendrier/generateur.ts` et `calendrier/passe.ts` (la voie des titres),
  `salaries/catalogue.ts`, `perimetre/niveau-audit.ts` et la page
  « Ce que Rojer ne couvre pas », `equipements/hors-referentiel.ts` (motif
  `niveau_audit`), `surfaces/obligations-sans-surface.ts` (surface
  `niveau_audit`), la grille de relecture et l'export de relecture.

## Contexte

Le préventeur, p. 35 du référentiel annoté, sur les chiffons, cotons et
papiers imprégnés (`R. 4227-26`) : « à supprimer ». Il « ne veut pas qu'on
tombe dans l'audit ». L'obligation est pourtant légale, lue en première main
(C45), et la retirer ferait dire au produit qu'elle n'existe pas.

La propriétaire, le 2026-10-08 : « certes c'est une obligation mais Rojer est
un outil de gestion au quotidien et les chiffons par exemple c'est too much ;
on garde dans le référentiel mais avec une mention audit et qu'il ne soit plus
actif dans l'app ; le label audit aura son sens le jour où on poussera plus
loin Rojer ». Condition posée et acceptée : **l'outil ne ment pas** — une
obligation légale sortie du quotidien reste VISIBLE.

## Décision

1. **Un champ, une lecture.** `Obligation.niveau?: "audit"`. Absent = servi.
   `estNiveauAudit(o)` est la seule lecture ; aucune surface ne lit le champ.
2. **Une porte, au moteur.** `evaluerObligation` rend `null` pour une
   obligation audit. Tout ce qui sert le quotidien en descend — calendrier,
   « Ce qui doit être en place », « Quand ça arrive », indice, tableau de bord,
   MCP, registre, dossier, guide « Comprendre ». La seule autre voie vers une
   ligne, celle des titres salarié, qui ne passe pas par le matching
   (ADR-023), porte la même lecture : `genererVerificationsDepuisTitres`, le
   garde-fou d'applicabilité de la passe, et le catalogue de l'écran Équipe.
3. **Visible.** La page « Ce que Rojer ne couvre pas » gagne une rubrique
   « Niveau audit — obligations légales suivies hors du quotidien de Rojer »,
   calculée **par établissement** : même champ que le moteur, sans la porte
   (`determineObligationsNiveauAudit`). Le calcul coûte un appel au moteur ;
   le faire à tous aurait nommé la vérification des masques respiratoires à un
   bureau qui n'en a pas. Une obligation salarié audit, que le moteur ne sait
   pas attribuer, serait nommée à tout employeur. La fiche d'un appareil visé
   par une seule obligation audit porte le motif « Obligation au niveau
   audit », jamais « aucune obligation ». La grille et l'export de relecture
   marquent ces lignes « Audit ».
4. **Le champ entre dans l'empreinte** (segment ajouté, seulement quand il est
   présent) : il décide de l'existence des lignes. Le poser ou le lever
   resynchronise tous les calendriers.
5. **Réconciliation : comme une obligation qui cesse de s'appliquer.** Les
   lignes existantes sont archivées si elles portent une trace (rapport,
   action, réalisation), supprimées sinon — le chemin ordinaire du
   réconciliateur, aucun code neuf. Une déclaration d'état permanent reste en
   base, sans ligne pour l'afficher.
6. **Réactivable.** Lever le marqueur et monter la version. Rien d'autre n'a
   bougé : source, notes, lecture du corpus restent en place.
7. **Le compte du référentiel inclut les obligations audit** ; CLAUDE.md dit
   « dont N au niveau audit ».

### Appliqué le 2026-10-08 à trois obligations

- `incendie-travail-chiffons-impregnes-recipients-clos` (`R. 4227-26`) ;
- `epi-verification-generale-periodique-respiratoire` et
  `epi-verification-generale-periodique-gilet-sauvetage` (arrêté du 19 mars
  1993, art. 1er) — **nées d'une scission** :
  `epi-verification-generale-periodique` portait les trois catégories
  `EPI_ANTICHUTE`, `EPI_RESPIRATOIRE`, `EPI_GILET_SAUVETAGE`. L'antichute
  reste servie et garde l'identifiant (sa population ne change pas) ; les
  deux autres familles prennent un identifiant neuf et déclarent
  `succedeA` vers l'ancien (convention de GE 4 § 1, 2026-09-08). Au niveau
  audit, `succedeA` n'agit pas ; il servira le jour où le marqueur se lève.

## Ce que ce n'est pas

- **Pas un retrait** (`OBLIGATIONS_RETIREES`). Une obligation retirée n'est
  plus au référentiel ; son identifiant est gelé. Une obligation audit y est,
  avec sa source, comptée, relue par la veille, et se réactive en levant un
  champ.
- **Pas un hors-périmètre déclaré** (`perimetre/exclusions.ts`). Celui-là dit
  qu'aucune obligation d'exploitant ne découle de l'article. Ici l'obligation
  existe et elle est due.
- **Pas un « non couvert » du corpus** (`manques-annonces.ts`). L'article est
  `retenu` : il est encodé, et l'encodage est gardé.

## Alternatives écartées

- **Retirer de périmètre, comme l'IGH le 2026-10-07.** L'IGH sortait parce que
  le règlement n'est pas dépouillé et que ses obligations pèsent sur un autre
  débiteur. Ici le texte est lu, le débiteur est l'employeur : retirer
  ferait dire « rien » là où le droit dit « dû ».
- **Laisser actif.** C'est ce que le préventeur et la propriétaire refusent :
  Rojer est un outil du quotidien, et ces lignes le faisaient basculer dans le
  contrôle de détail.
- **Filtrer surface par surface.** Six surfaces au moins (calendrier, écran
  en place, indice, tableau de bord, MCP, registre) : la septième aurait
  oublié. La porte du moteur est le seul endroit en amont de toutes.

## Conséquences

- Référentiel `2026-10-08.4` (`.3` est pris par `lot/formations-faits-
  etablissement`, ADR-041) : 172 + 2 − 0 = 174 obligations, dont 3 au niveau
  audit.
- La question `chiffonsImpregnes` reste posée à la fiche : elle ne décide plus
  d'aucune ligne, elle décide de la rubrique « Niveau audit ». Sa relance
  (« à confirmer ») disparaît, puisque son silence ne retient plus rien.
- `VERSION_MOTEUR_CALENDRIER` n'est pas incrémentée : sans le champ, le code
  rend ce qu'il rendait ; c'est la donnée, hachée par l'empreinte, qui
  resynchronise.
- Le chiffre public de la page d'accueil passe de 172 à 174 — c'est le compte
  du référentiel, que `chiffres-publics.test.ts` lie à la page ; il INCLUT les
  obligations audit, comme le § 7. Les distinguer à l'écran public (« 171
  suivies au quotidien ») est une question posée à la propriétaire.
