# ADR-035 — Prescriptions particulières propres à un établissement

> **Renumérotée le 2026-09-15, anciennement 014.** Deux ADR portaient ce
> numéro : celle-ci, datée du 2026-08-25, et `014-provenance-navigation.md`,
> datée du 2026-08-20. La plus récente a pris le premier numéro libre ; la
> décision, sa date et son contenu sont inchangés. Le code, les commentaires et
> les documents qui la citaient disent désormais « ADR-035 » ; seuls
> `prisma/schema.prisma` et deux migrations (`20260825140000_prescriptions_particulieres`,
> `20260901160000_source_prescription_demande_assureur`) écrivent encore
> « ADR-014 » — une migration jouée ne se réécrit pas, et le schéma est laissé
> au lot qui le touchera.
>
> **Amendée le 2026-09-01 par l'ADR-032.** Les sources d'une prescription ne sont
> plus exclusivement des actes d'autorité opposables : une source contractuelle
> — la demande d'assureur — existe, marquée comme telle partout où elle
> s'affiche. Le mécanisme décrit ici est inchangé.
>
> ~~*(Note : deux ADR portent le numéro 014 dans ce dossier — celle-ci et
> `014-provenance-navigation.md`. Collision antérieure au recadrage, à
> renuméroter.)*~~

- **Date** : 2026-08-25
- **Statut** : Acceptée
- **Auteur** : Claude Code (sur brief Paloma)
- **Relatif à** : ADR-003 (référentiel en TypeScript versionné), ADR-004
  (typologie), ADR-011 (dates civiles), ADR-012 (conservation et idempotence
  du calendrier), migration `20260825140000_prescriptions_particulieres`

## Contexte

Le calendrier de vérifications est entièrement dérivé du référentiel générique
(ADR-003) par le moteur de matching. Ce référentiel décrit des obligations qui
s'appliquent à une classe d'établissements. Or un établissement donné peut
recevoir des obligations qui ne valent que pour lui. Textes relus sur
Légifrance le 2026-08-25 :

- un arrêté du maire ou du préfet pris à la suite d'un avis de la commission
  de sécurité, qui « fixe, le cas échéant, la nature des aménagements et
  travaux à réaliser ainsi que les délais d'exécution » (CCH, art. R. 143-45,
  https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819041) ;
  les visites de la commission vérifient « si les prescriptions du présent
  chapitre ou les arrêtés du représentant de l'Etat dans le département ou du
  maire pris en vue de son application sont observés » (CCH, art. R. 143-41,
  1°, https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819031) ;
  la fréquence des visites « peut être modifiée, s'il est jugé nécessaire, par
  arrêté du maire ou du préfet après avis de la commission de sécurité »
  (arrêté du 25 juin 1980, art. GE 4 § 4,
  https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029642660) ;
- un arrêté préfectoral ICPE assortissant l'enregistrement « de prescriptions
  particulières complétant ou renforçant les prescriptions générales »
  (C. env., art. L. 512-7-3,
  https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042655052), un
  arrêté complémentaire (L. 512-7-5, L. 181-14), ou « toutes prescriptions
  spéciales nécessaires » imposées à une installation déclarée (L. 512-12,
  https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042655062) ;
- une demande de l'inspection du travail de « faire vérifier l'état de
  conformité de ses installations et équipements » (C. trav., art. L. 4722-1,
  https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903400), pour
  laquelle l'agent « fixe le délai dans lequel cet organisme doit être saisi »
  (R. 4722-1, R. 4722-5), ou une mise en demeure qui « fixe un délai »
  (L. 4721-6).

Ces actes sont opposables, mais propres à chaque établissement : ils ne
peuvent pas entrer dans le référentiel générique sans le corrompre (une règle
qui ne vaut que pour un SIRET n'est pas une règle). Jusqu'ici l'outil les
ignorait : le calendrier affichait le rythme du référentiel alors qu'un arrêté
imposait plus court, ou ne montrait rien alors qu'une vérification avait été
prescrite.

Deux contraintes issues des textes cadrent la solution :

1. Une prescription individuelle **renforce**. Les textes qui prévoient un
   allègement (aménagement « justifié par les circonstances locales »,
   L. 512-7-3 ; prolongation du délai de visite « sur proposition de la
   commission », GE 4 § 3) le subordonnent à une procédure que l'outil ne peut
   pas vérifier. Et l'exploitant reste tenu de faire vérifier ses
   installations : « le contrôle exercé par l'administration ou par les
   commissions de sécurité ne les dégage pas des responsabilités qui leur
   incombent personnellement » (CCH, art. R. 143-34,
   https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819017).
2. Un procès-verbal de commission est un avis (CCH, art. R. 143-27) ; l'acte
   opposable est l'arrêté qui le suit (R. 143-45). L'outil permet de conserver
   le PV comme pièce et de désigner l'acte qui prescrit.

## Décision

### A. Une donnée d'établissement, pas une extension du référentiel

Nouveau modèle `PrescriptionParticuliere`, rattaché à `Etablissement`, portant
une source (`arrete_prefectoral`, `arrete_municipal`,
`pv_commission_securite`, `arrete_icpe`, `inspection_travail`, `autre`), une
référence documentaire (numéro, autorité, date civile au sens de l'ADR-011),
une date de fin optionnelle (prescription levée) et un booléen `actif`.

Le référentiel (`src/lib/referentiels/conformite/`) et `REFERENTIEL_VERSION`
ne sont pas touchés. Une prescription n'est jamais une `Obligation` du
référentiel et n'en emprunte ni le domaine ni les références légales.

### B. Deux effets, exclusifs, vérifiés en base et dans le moteur

- `renforce_periodicite` : cible une obligation du référentiel
  (`obligationId`), optionnellement un seul équipement, et impose une
  périodicité **strictement plus courte** au sens de `PERIODICITE_EN_JOURS`.
  Une obligation du référentiel sans échéance (`mise_en_service_uniquement`,
  `autre`) peut recevoir n'importe quelle périodicité : c'est un renforcement.
- `obligation_sur_mesure` : libellé, périodicité, réalisateurs, catégorie
  d'équipement ou équipement précis. Affichée partout avec la mention
  « Prescription propre à votre établissement », jamais avec une référence du
  référentiel.

L'exclusivité est une CHECK SQL (`PrescriptionParticuliere_effet_xor`, même
technique que `Action_origine_xor`, ADR-002). La règle « plus court que le
référentiel » ne peut pas être une contrainte SQL puisque le référentiel n'est
pas en base : elle est validée à la saisie (Zod) **et** réappliquée par le
moteur à chaque génération. Si le référentiel évolue et devient lui-même au
moins aussi strict, la prescription est ignorée et signalée comme « rattrapée
par le référentiel » — elle n'est ni supprimée ni appliquée en silence.

### C. Intégration dans la chaîne matching → générateur → réconciliation

Le matching du référentiel s'exécute d'abord, inchangé. Une fonction pure
`appliquerPrescriptions` (`src/lib/matching/prescriptions.ts`) :

1. surcharge, par équipement, la périodicité des `ObligationApplicable`
   ciblées par une prescription `renforce_periodicite` recevable ;
2. produit la liste des obligations sur mesure avec leurs équipements
   déclencheurs ;
3. renvoie la liste des prescriptions **ignorées** avec une raison en français
   (obligation non applicable ici, rythme pas plus strict, aucun équipement de
   la catégorie, doublon) — mode explain, comme le moteur.

Le générateur lit la surcharge et émet, pour les obligations sur mesure, des
lignes dont `obligationId` vaut `prescription:<id>`. La clé d'idempotence
`(etablissementId, obligationId, equipementId)` et la réconciliation de
l'ADR-012 restent inchangées : une prescription levée ou supprimée fait
disparaître le couple de l'état souhaité ; la ligne est supprimée si elle ne
porte aucune preuve, marquée « Ne s'applique plus » sinon.

`Verification.prescriptionId` (nullable, `ON DELETE SET NULL`) trace la
prescription à l'origine de la périodicité ou de la ligne.

### D. Régénération

Toute mutation d'une prescription relance `genererCalendrier` dans la même
server action, comme les mutations d'équipement. Aucun second repère de
version n'est introduit : la donnée est en base et la réconciliation est
idempotente.

### E. Affichage

Fiche établissement → section « Prescriptions propres à votre
établissement » : liste, état (active / levée / ignorée avec raison),
formulaire. Le formulaire ne propose que des périodicités plus courtes et
explique qu'un allègement documentaire peut être conservé en pièce mais n'est
pas pris en compte. Aucune formulation « conforme » : l'outil rappelle une
prescription, il ne l'interprète pas.

## Conséquences

**Ce qu'on gagne**

- Le calendrier reflète les actes individuels opposables à l'établissement.
- Le référentiel reste générique, auditable par Git ; son test d'empreinte ne
  bouge pas.
- Chaque décision (application, surcharge, ignorance) est une fonction pure
  avec une raison textuelle.

**Coûts et limites assumés**

- `obligationId = "prescription:<id>"` est une convention de nommage. Tout
  consommateur qui fait `obligationParId(id)` doit passer par
  `estObligationSurMesure(id)` avant de lire un domaine ou une référence
  légale.
- La criticité des obligations sur mesure est fixée par convention (4) pour
  le tri du calendrier ; ce n'est pas une cotation.
- Une prescription `inspection_travail` à délai imposé se modélise en
  `mise_en_service_uniquement` avec sa date ; l'outil ne calcule pas de délai
  légal.
- Le périmètre ICPE reste celui de CLAUDE.md : le petit ICPE à déclaration
  d'une TPE recevant un arrêté de prescriptions spéciales. L'outil n'encode
  pas les prescriptions générales ministérielles ICPE.
- L'outil n'apprécie pas si une prescription est légale, proportionnée ou
  encore en vigueur. Il applique ce que le dirigeant déclare, sous sa
  responsabilité (CCH R. 143-34), et refuse seulement ce qu'il ne peut pas
  vérifier (les allègements).
- Les prescriptions **sans échéance** d'un PV (« remplacer la porte
  coupe-feu ») relèvent du plan d'actions (`Action`, ADR-002), pas de ce
  modèle.

## Alternatives rejetées

- **Encoder les cas particuliers dans le référentiel** — contraire à
  l'ADR-003 : une règle propre à un établissement n'est pas une règle du
  référentiel.
- **Autoriser une périodicité plus souple avec justificatif** — l'outil ne
  peut pas vérifier les conditions posées par L. 512-7-3 ou GE 4 § 3, et
  afficherait « à jour » sur la foi d'un allègement peut-être irrégulier.
- **Créer un modèle `Obligation` en base pour les sur mesure** — réintroduit
  le double stockage que l'ADR-003 a écarté.
- **Une colonne `origine` sur `Verification`** plutôt que le namespace —
  redondante avec `prescriptionId` ; le namespace garde la clé d'idempotence
  intacte.
- **Persister les prescriptions ignorées** — elles se recalculent à
  l'affichage ; les stocker créerait une seconde vérité.
