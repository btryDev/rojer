# ADR-047 — Une formation des salariés se suit dans Équipe

> **Amendement du 2026-10-24 (soir) — l'onglet devient une section**
> (décision de la propriétaire, `lot/fiche-salarie`). L'onglet Formations
> regroupait surtout ce qui se voit ailleurs (titres manquants : les fiches ;
> lignes datées : le calendrier ; événementielles : « En cas de… »), et ne
> disait pas pourquoi une formation y était. Sa raison d'être est désormais
> écrite : **les formations dues aux salariés quand Rojer ne sait pas
> lesquels** — elles ne peuvent pas aller sur une fiche, l'établissement les
> organise. Elles forment la section « Formations à organiser » de la page
> Équipe, sous les personnes, chaque ligne disant pourquoi elle est là
> (`pourquoiALEtablissement`), avec ce que le DUERP signale sans que personne
> ait le titre (`titres-sans-porteur.ts`). Retirés de cet endroit : les lignes
> datées, les événementielles, les titres manquants par personne. Les onglets
> (`OngletsEquipe`) disparaissent ; `/equipe/formations` redirige vers
> `/equipe#formations` ; `cheminDeDeclaration` vise `/equipe`. Le § 2
> ci-dessous est amendé d'autant ; la marque `formation` et le § 3 restent.

- **Statut** : acceptée, 2026-10-24 — décisions de la propriétaire des
  2026-10-22 et 2026-10-24, branche `lot/guide-par-module`.
- **Amende** : ADR-041 (les faits d'activité : ce que leur réponse rend dû ne
  se déclare plus sous la question) ; la décision du 2026-10-21 qui rangeait
  ces lignes sur « Évaluer les risques de vos salariés » ; ADR-027 (l'écran
  « Ce qui doit être en place » ne porte plus les formations).
- **Portée** : `referentiels/conformite/types.ts` (`formation`, `estFormation`),
  seize obligations marquées, `etats-permanents/par-l-equipe.ts` (ex-
  `par-les-risques.ts`), `etats-permanents/queries.ts` et `compte.ts`,
  `app/etablissements/[id]/equipe/formations/page.tsx`,
  `components/salaries/OngletsEquipe.tsx`, la page « Évaluer les risques »,
  le filtre `?formation=1` du calendrier, le widget « Ce qui doit être en
  place ».

## Contexte

Le 2026-10-21, les lignes nées d'un fait d'activité (formation à la
manutention, habilitation électrique, carnet de prescriptions, consigne EPI)
ont quitté « Ce qui doit être en place » pour se déclarer sous leur question,
sur « Évaluer les risques de vos salariés ». À l'usage (2026-10-22/24), la
propriétaire relève trois choses : la page des questions n'est pas le lieu de
rappeler ce qui reste à faire ; le compteur de « en place » comptait des lignes
qu'il n'affichait pas ; et une formation se cherche là où sont les salariés.

## Décision

1. **Une marque sur l'obligation, `formation: true`**, lue par la seule
   `estFormation`. Posée à la main, sur le texte : formation, instruction ou
   entraînement imposé à l'employeur envers ses travailleurs. Ni un document
   (carnet, consigne, instructions d'évacuation), ni une information, ni un
   exercice d'évacuation (il essaie aussi le matériel), ni une autorisation de
   conduite. Hors empreinte : elle ne change aucune ligne du calendrier.
2. **Équipe porte deux onglets, Personnes et Formations.** L'onglet Formations
   est une vue, sans stockage : les états permanents marqués (déclarés avec la
   même fiche, sans parcours), les lignes datées du calendrier, les
   obligations événementielles, et les titres qui manquent aux personnes. Le
   nombre de formations non déclarées s'affiche sur l'onglet.
3. **Les états permanents marqués quittent « Ce qui doit être en place »** et
   son compteur ; le score et le PDF les gardent. Les autres lignes nées d'un
   fait (carnet de prescriptions, consigne EPI) y reviennent.
4. **« Évaluer les risques de vos salariés » ne pose que les questions.** Son
   bloc dans Équipe disparaît une fois tout répondu ; les réponses se revoient
   dans le DUERP.
5. **Le calendrier filtre « Personnel et formations »** (`?formation=1`) :
   les titres et visites des salariés (famille `personnel`) et les formations
   d'établissement. Un choix de « Type d'échéance », qui remplace « Titres du
   personnel » ; `?famille=personnel` y mène.
6. **La manutention se suit pour l'établissement** (« à organiser pour
   l'établissement »), pas par personne : R. 4541-8 vise chaque travailleur
   concerné, et le suivi nominatif serait un titre salarié — à décider plus
   tard, par un ADR.

## Conséquences

- Une obligation de formation neuve doit se prononcer sur la marque ; un
  oubli la laisse sur « Ce qui doit être en place », visible et comptée — le
  côté visible de l'erreur.
- `par-l-equipe.test.ts` tient une borne basse et une borne haute de la
  marque, jamais la liste entière.
