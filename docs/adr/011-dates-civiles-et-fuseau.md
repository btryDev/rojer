# ADR-011 — Dates civiles, fuseau de référence et prédicats de retard

- **Date** : 2026-08-11
- **Statut** : Acceptée
- **Auteur** : Claude Code (sur brief Paloma)
- **Relatif à** : ADR-002 (Action unifiée), ADR-010 (Registre de sources
  d'échéances), modules Calendrier / Tableau de bord / Plan d'actions /
  Vérifications / Prestataires / Carnet sanitaire

## Contexte

### 1. Une date civile stockée comme un instant UTC

Toutes les dates saisies par l'utilisateur arrivent d'un
`<input type="date">` au format « AAAA-MM-JJ » et traversent, dans chaque
schéma Zod du produit, la même transformation :

```ts
z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v))
```

`new Date("2026-08-10")` est interprété par ECMAScript comme un **instant
UTC** : `2026-08-10T00:00:00Z`. Prisma le range dans une colonne
`DateTime`, et il ressort tel quel. Or l'utilisateur n'a pas saisi un
instant : il a saisi une **date civile**, « le 10 août », qui n'a pas
d'heure. Le produit stocke donc systématiquement une date civile sous la
forme d'un instant qui, à Paris, tombe à **02:00 en été** et **01:00 en
hiver**.

Sont concernés : `Action.echeance`, `Verification.datePrevue` et
`dateRealisee`, `RapportVerification.dateRapport`, les dates de validité
des attestations prestataires (`urssafValableJusquA`,
`rcProValableJusquA`), `ReleveTemperature.dateReleve`,
`AnalyseLegionelle.dateAnalyse`, les dates de permis de feu et de plans
de prévention.

Ces instants étaient ensuite comparés à `new Date()` / `Date.now()`
bruts. Conséquence directe, visible à l'écran : **une échéance datée
d'aujourd'hui basculait « en retard » dès 00:00 UTC**, soit 02:00 heure
de Paris en été. Le dirigeant qui ouvrait son tableau de bord à 8 h
découvrait en rouge une action dont il avait encore toute la journée pour
s'occuper. Sur un outil de conformité, annoncer un retard qui n'existe
pas est aussi grave que d'en taire un.

Le même défaut atteignait les regroupements : `d.toISOString().slice(0, 10)`
sert de clé de jour à plusieurs endroits, alors qu'il rend le jour **UTC**.
Un horodatage réel du 10 janvier à 00:30 heure de Paris (23:30Z le 9) est
rangé au 9 janvier.

### 2. Six définitions divergentes de « en retard »

Aucun module de dates partagé n'existait — `src/lib/utils.ts` ne contient
que `cn()`. Chaque appelant a donc réinventé sa règle :

| Emplacement | Règle appliquée |
|---|---|
| `src/lib/calendrier/queries.ts:105` | `depassee` ou (`planifiee` et `datePrevue < debutDuJour`) ; `a_planifier` **non pénalisant** |
| `src/lib/dashboard/queries.ts:109` | idem, mais comparé à `debutDuJour` local du serveur |
| `src/lib/dashboard/queries.ts:182` | idem, comparé à `now` **brut** (pas au début du jour) |
| `src/lib/dashboard/queries.ts:264` | `a_planifier` compté comme « à venir », jamais en retard |
| `src/lib/dashboard/recommandations.ts:100` | `depassee` ou (`a_planifier` et `datePrevue <= now`) — l'**inverse** du calendrier |
| `src/lib/pdf/builders.ts:239` | `depassee` ou `a_planifier`, **sans regarder la date du tout** |

Deux écarts d'affichage en découlaient : le calendrier et le tableau de
bord annonçaient des compteurs différents pour le même établissement, et
le dossier de conformité exporté en PDF surcomptait les retards.

S'y ajoutaient **huit littéraux `365` indépendants** dans le code de
production (`SEUIL_DUERP_A_METTRE_A_JOUR_JOURS`, `SEUIL_REGISTRE_JOURS`,
`SEUIL_ANALYSE_LEGIONELLE_JOURS`, `JOURS_MAJ_DUERP`,
`JOURS_ANALYSE_LEGIONELLES`, deux comparaisons dans
`src/lib/dashboard/queries.ts`, une dans la synthèse DUERP), qui dérivent
d'un jour dès qu'un 29 février est traversé et d'une heure à chaque
changement d'heure, ainsi que **plus de quarante appels à
`toLocaleDateString("fr-FR")`** sans `timeZone`, dont la sortie dépend du
fuseau du processus — donc potentiellement différente entre le rendu
serveur et le rendu client.

## Décision

### 1. Europe/Paris est le fuseau de référence produit

Rojer s'adresse à des TPE/PME françaises métropolitaines. Toute date
civile s'entend **à Paris**, quel que soit le fuseau du serveur, du
conteneur ou du navigateur.

Corollaire technique : aucune composante de date n'est lue via
`getFullYear()`, `getMonth()`, `getDate()` ni `getHours()`, qui dépendent
du fuseau du processus. Tout passe par `Intl.DateTimeFormat` avec
`timeZone: "Europe/Paris"` explicite. Le module produit donc le même
résultat sous `TZ=Europe/Paris`, `TZ=UTC` ou `TZ=Asia/Tokyo` — c'est
vérifié par sa suite de tests.

### 2. Un module unique : `src/lib/dates/`

- **`src/lib/dates/index.ts`** — primitives pures : `composantesCiviles`,
  `instantCivil`, `debutDuJour`, `cleJourCivil`, `depuisCleJourCivil`,
  `joursCivilsEntre`, `ajouterJours` / `ajouterMois` / `ajouterAns`,
  `formaterDateFr` / `formaterDateLongueFr` / `formaterDateCourteFr` /
  `formaterDateHeureFr`, et les constantes partagées
  (`FUSEAU_REFERENCE`, `JOURS_HORIZON_PROCHE`, `JOURS_ALERTE_EXPIRATION`,
  `MOIS_PERIODE_ANNUELLE`, `MOIS_FENETRE_HISTORIQUE`, `MS_PAR_JOUR`).
- **`src/lib/dates/retard.ts`** — les prédicats métier canoniques.

**Aucune dépendance externe** : ni `date-fns`, ni `luxon`. `Intl` est dans
la plateforme, les règles tiennent en une centaine de lignes testées, et
le principe zéro-IA / déterminisme du projet vaut aussi pour les
dépendances : moins de surface, plus d'auditabilité.

### 3. L'horloge est toujours injectée

Aucune fonction du module n'appelle `new Date()` ni `Date.now()` sans
paramètre. L'instant courant est un **argument**, comme il l'est déjà dans
`frise.ts` et `recommandations.ts`. C'est ce qui rend les règles
d'échéance reproductibles, testables et stables entre le rendu serveur et
le rendu client.

### 4. La règle de produit : une échéance du jour n'est jamais en retard

`estEnRetard(date, now)` est vrai si et seulement si `date` est
**strictement antérieure au début du jour civil courant** (minuit, heure
de Paris). L'utilisateur a toute sa journée. Le retard commence au minuit
suivant.

Symétriquement, `estDansLesProchainsJours(date, now, jours)` inclut la
borne basse (aujourd'hui) et la borne haute en jours civils entiers : une
échéance ne peut plus tomber dans le trou « ni en retard, ni à venir »
que créaient les bornes exprimées en instants.

### 5. Arbitrage sur `a_planifier`

C'est le point de désaccord du code existant, tranché ici.

`src/lib/calendrier/queries.ts:93-99` tenait `a_planifier` pour **non
pénalisant** : une occurrence tout juste générée à la déclaration d'un
équipement n'est qu'un « à faire », l'utilisateur n'a pas encore fixé de
date avec son prestataire. `src/lib/dashboard/recommandations.ts:100`
faisait exactement l'inverse et la remontait en urgence.

**Décision : ce n'est pas le statut qui crée l'obligation, c'est la
date.**

- Tant que la `datePrevue` est aujourd'hui ou plus tard, `a_planifier`
  reste un « à faire » non pénalisant → `estVerificationAPlanifier`.
- Dès que la `datePrevue` est passée, le contrôle réglementaire n'a pas
  été réalisé dans les temps : c'est un retard, que l'utilisateur ait ou
  non pris rendez-vous → `estVerificationEnRetard`.

Prétendre le contraire reviendrait à minorer une non-conformité réelle
parce que l'utilisateur n'a pas cliqué sur « planifier » — exactement ce
que le produit s'interdit (« l'outil ne ment pas sur le niveau de
conformité »). À l'inverse, l'ancienne règle de `recommandations.ts`
alertait sur des occurrences dont l'échéance n'était pas encore atteinte.

Les deux prédicats sont **mutuellement exclusifs** : un compteur
« en retard » et un compteur « à planifier » ne doublonnent jamais. Un
troisième, `estVerificationAVenir`, couvre la fenêtre proche et exclut
volontairement `a_planifier` — sans date arrêtée avec le prestataire,
annoncer « prévue le 12 » serait un mensonge d'affichage.

~~Règle transverse : une occurrence portant une `dateRealisee`, ou un statut
`realisee_*`, n'est jamais en retard. **La preuve prime sur l'état.**~~
Amendée par l'ADR-034 (2026-09-13) : la ligne ne porte plus de date de
réalisation, et un statut réalisé ne purge l'échéance que sur une obligation
sans rendez-vous suivant (`estVerificationRealisee`) ; sur une obligation
périodique, la date décide. **L'échéance ouverte prime sur le souvenir.**

### 6. Actions correctives

`estActionEnRetard` : action `ouverte` ou `en_cours` dont l'échéance est
passée. Une action `levee` ou `abandonnee` ne l'est jamais, même traitée
après la date visée — le plan d'actions rend compte de ce qui reste à
faire, pas d'un historique de ponctualité.

Une action **sans échéance** n'est pas en retard (on ne dépasse pas une
date qui n'existe pas) mais constitue un angle mort : sans date, elle
n'apparaît ni au calendrier, ni dans la frise, ni dans les 30 prochains
jours. `estActionSansEcheance` la rend repérable, pour inviter à la
dater plutôt que de la laisser disparaître.

### 7. Arithmétique calendaire, pas arithmétique en millisecondes

`ajouterMois` écrête en fin de mois (31 janvier + 1 mois = 28 février, ou
29 en bissextile — jamais le 2 ou 3 mars comme le ferait `setMonth`).
`ajouterAns` en dérive (29 février + 1 an = 28 février). `ajouterJours`
raisonne en jours civils et reconstruit l'instant, au lieu d'ajouter
`n × 86 400 000` — sans quoi l'heure civile dérive d'une heure à chaque
changement d'heure traversé, ce qui suffit à faire changer de jour une
date stockée près de minuit.

`MOIS_PERIODE_ANNUELLE = 12` remplace les sept littéraux `365`. Les
périodicités **réglementaires** (annuelle, triennale, quinquennale)
restent, elles, dans le référentiel de conformité — ADR-003.

## Conséquences

### Positives

- Un seul endroit décide de ce qu'est un retard. Calendrier, tableau de
  bord, frise, recommandations, PDF et export contrôle affichent
  nécessairement le même compte.
- Une échéance du jour n'est plus annoncée en retard le matin même.
- Les compteurs et les libellés ne dépendent plus du fuseau du processus :
  plus d'écart possible entre rendu serveur et rendu client.
- Les périodicités annuelles ne dérivent plus au fil des bissextiles.
- Toute règle d'échéance est testable en injectant l'horloge, sans
  `vi.setSystemTime` ni variable `TZ`.

### Négatives / coûts

- Migration à faire sur tous les consommateurs (phase de reprise dédiée) :
  tant qu'elle n'est pas terminée, deux régimes coexistent.
- `Intl.DateTimeFormat` est plus coûteux qu'un `getDate()`. Les formateurs
  sont donc instanciés une seule fois au niveau module ; les boucles de
  comptage passent par `composantesCiviles`, dont le coût reste
  négligeable devant celui d'une requête Prisma.
- Les dates restent stockées à minuit UTC : le module corrige la
  **lecture**, pas le stockage (cf. alternative A).

### Règles opposables en revue

1. **Tout module qui compare une date à « maintenant » importe ces
   prédicats.** Réécrire `date < now` dans un module métier est un défaut
   de revue, pas un raccourci.
2. **Interdiction d'écrire `new Date()` ou `Date.now()` dans un calcul
   d'échéance.** L'instant courant est capturé au bord (server action,
   route handler, page) et passé en paramètre.
3. **Interdiction de `toISOString().slice(0, 10)`** comme clé de jour :
   c'est `cleJourCivil`.
4. **Interdiction de `toLocaleDateString` / `toLocaleString` sans
   `timeZone`** : ce sont les `formater*Fr`.
5. **Interdiction de `± n * 86 400 000`** pour décaler une date : ce sont
   `ajouterJours` / `ajouterMois` / `ajouterAns`. `MS_PAR_JOUR` reste
   exporté pour la seule géométrie (largeur de frise, position en pixels).

## Alternatives rejetées

### Alternative A — Colonne `@db.Date` en base plutôt qu'un module de lecture

Passer les dates civiles (`Action.echeance`, `Verification.datePrevue`,
validités d'attestations, `dateReleve`, `dateAnalyse`, `dateRapport`) en
`DateTime @db.Date` supprimerait le problème à la racine : PostgreSQL
stockerait une date sans heure ni fuseau.

**Écartée pour l'instant**, pas sur le fond mais sur le coût : migration
de plusieurs colonnes réparties sur huit modules, sur des données déjà en
production, avec un client Prisma qui rematérialise malgré tout un `Date`
JavaScript à minuit UTC côté application — le module de lecture resterait
donc nécessaire. **À reprendre plus tard**, sous ADR dédiée ; ce module
est un prérequis, pas un concurrent.

### Alternative B — Introduire `date-fns` ou `luxon`

Bibliothèques éprouvées, mais elles n'auraient rien tranché : les six
définitions divergentes de « en retard » et l'arbitrage sur `a_planifier`
sont des **décisions métier**, pas un manque d'outillage. La valeur du
présent module est dans `retard.ts`, que nulle bibliothèque ne fournit.
S'y ajoutent le poids de bundle (module importé par des composants
client) et la surface de dépendance.

### Alternative C — Tout normaliser en UTC et parler d'« heure UTC » partout

Cohérent, mais faux vis-à-vis de l'utilisateur : une obligation
réglementaire française court sur des **jours civils français**. Un
contrôle « au plus tard le 31 décembre » ne s'apprécie pas à minuit UTC.

### Alternative D — Fuseau lu depuis le navigateur du visiteur

Rendrait le calcul de retard dépendant du poste de consultation : le même
établissement afficherait des compteurs différents selon l'appareil, et
le rendu serveur ne pourrait pas correspondre au rendu client. Le fuseau
est une propriété du **référentiel réglementaire**, pas du lecteur.

### Alternative E — Stocker les dates civiles en `String` « AAAA-MM-JJ »

Comparaison lexicographique correcte et sans ambiguïté, mais on perd le
tri et les filtres par intervalle typés de Prisma, et il faudrait
convertir à chaque calcul de périodicité. Régression nette par rapport à
l'alternative A.

## Notes de conformité

- Le module ne porte **aucune règle réglementaire** : il fournit des
  primitives de calendrier et la règle de produit sur le retard. Les
  périodicités légales restent dans `src/lib/referentiels/conformite/`
  (ADR-003), avec leur source Légifrance/INRS.
- La règle « une échéance du jour n'est pas en retard » est une règle
  **d'affichage prudente**, non un avis juridique : elle évite d'annoncer
  un manquement avant que le délai ne soit écoulé. Elle ne dit jamais
  l'inverse — une échéance dépassée est toujours signalée.
- Conformément à la règle n°7 du projet, aucun traitement de date n'est
  confié à un modèle : tout est déterministe et couvert par 94 tests
  (`src/lib/dates/index.test.ts`, `src/lib/dates/retard.test.ts`),
  exécutés et vérifiés sous trois fuseaux serveur distincts.
