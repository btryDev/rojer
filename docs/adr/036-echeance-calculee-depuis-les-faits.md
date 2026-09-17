# ADR-036 — L'échéance d'une ligne se calcule depuis des faits stockés, par une seule fonction

- **Statut** : **proposée — quatre décisions à confirmer par la propriétaire**
  (D1 à D4, § 6). Rien n'est branché : la fonction du § 3 existe et est testée
  (`lot/adr036-fonction-echeance`), aucun fichier du moteur ne l'importe, et un
  test le garde jusqu'à la bascule.
- **Portée, à la bascule** : `src/lib/calendrier/echeance-de-ligne.ts` (neuf),
  `src/lib/calendrier/recalcul-ligne.ts` (neuf), `src/lib/calendrier/generateur.ts`
  (le générateur perd son horloge, le réconciliateur perd ses branches de date),
  `src/lib/calendrier/actions.ts`, `src/lib/rapports/actions.ts` (`rouler` et la
  transmission d'`echeanceHonoree` disparaissent), `prisma/schema.prisma`
  (`Verification.suiviDepuis`, si D2 est confirmée), les trois scripts de seed
- **Amendera, au lot 4 et pas avant** : l'ADR-012 § A (« cycle ouvert :
  `datePrevue` ne bouge pas »), l'ADR-034 (le constat B de son § 3, le lot N2,
  la « limite écrite » de la phase A) et l'en-tête de doctrine de
  `generateur.ts`. **Jusqu'à la bascule ces trois textes décrivent le vrai**, et
  les barrer aujourd'hui ferait mentir la documentation sur le code en ligne
- **Dépend de** l'ADR-011 (jour civil de Paris, retard dès le lendemain),
  l'ADR-022 et l'ADR-023 (porteurs), l'ADR-034 (la ligne ne porte que l'échéance
  ouverte, la réalisation se lit sur les rapports), l'ADR-035 (rythme effectif)
- **Fondée sur** : un audit neutre du « temps 2 » mené le 2026-09-17 sur
  `f44ba64` (huit tests jetables sur les fonctions pures, rien de commité), trois
  contre-vérifications indépendantes (branches du réconciliateur, sources de
  date, tests et lecteurs), et le plan approuvé le même jour. Les sept scénarios
  S1 à S7 du § 1 sont ceux de l'audit, avec ses dates

## 1. Le problème

### Le constat B, et ce qu'il cachait

`docs/chantiers-ouverts.md` § 11 tenait le constat B pour un cas étroit : une
ligne « planifiée » sans rapport dont le rythme change garde sa date. L'audit l'a
élargi. **Tant qu'un appareil n'a jamais été contrôlé, sa date reste figée dans
trois situations** — le rythme change (référentiel, prescription posée ou levée),
la mise en service est ajoutée ou corrigée, le premier délai légal change — et
l'erreur va dans les deux sens : retard caché, retard inventé. Le calendrier
dépend de **l'ordre des saisies**, pas seulement des faits déclarés. C'est le
défaut que l'ADR-012 § E dénonce pour le référentiel.

Rejoué au 17/09/2026 :

| | Scénario | Ce que le produit affiche aujourd'hui | Ce que les faits disent |
|---|---|---|---|
| **S1** | Obligation d'établissement sans aucune source, suivie depuis le 15/06, jamais contrôlée | 15/06, 94 jours de retard | la même chose — et c'est ce qu'« écraser » détruirait (0 jour, date glissante) |
| **S2** | Appareil mis en service le 01/06/2025, annuel, échéance du 01/06/2026 manquée | 01/06/2026, 108 jours de retard | la même chose — idem |
| **S3a** | Annuel → semestriel, mise en service 01/06/2026, pas de rapport | reste au 01/06/2027 sur une ligne affichée « semestrielle » | 01/12/2026 |
| **S3b** | Le même, régénéré le 20/12/2026 | reste au 01/06/2027 | 01/12/2026, 19 jours de retard |
| **S4** | Faute de frappe corrigée sur la mise en service (15/03/2026 → 15/11/2025) | reste au 15/03/2027, correction ignorée, ligne comptée « inchangée » | 15/11/2026 |
| **S5** | Mise en service (01/09/2026) saisie le lendemain de la création de l'appareil (16/09) | reste « à planifier » au 16/09, donc en retard dès le 17 | 01/09/2027 — ce que la même saisie faite le jour même aurait donné |
| **S6** | Ligne qui porte un rapport | rapport + rythme | rapport + rythme : écraser y est inoffensif |
| **S7** | Appareil neuf sous prescription semestrielle | première échéance à **un an** sur une ligne affichée semestrielle (`generateur.ts` lit `o.periodicite`, le rythme du référentiel) | six mois |

### La cause : deux calculateurs, quatre écrivains

Le recalcul se fait en deux temps. Le générateur (temps 1) calcule ce qui devrait
exister ; le réconciliateur (temps 2, `reconcilierCalendrier`) **redécide la date
d'une ligne existante**, et il le fait à huit endroits :

1. la date d'un titre fait foi (`datePrevueFaisantFoi`) ;
2. le ponctuel réalisé garde sa date, son statut se relit sur le rapport ;
3. le ré-ancrage sur changement de rythme — **seulement s'il existe un rapport** ;
4. l'héritage d'une succession, gardé par `!porteUnePreuve` ;
5. le « placeholder » — « à planifier » cède à une date calculée, **seulement si
   la date en base n'est pas passée** ;
6. le cycle ouvert, cas général : **la date en base ne bouge jamais** ;
7. la ligne absorbante qui naît datée de l'héritage ;
8. la boucle finale (NB4), qui réaligne un rythme en gardant la date.

La date s'écrit en outre à **quatre endroits** : le `createMany` de la
régénération, son `update`, `rouler` au dépôt d'un rapport, et le recul à la
suppression d'un rapport (avec une chaîne de transmission d'`echeanceHonoree`
d'environ quatre-vingts lignes). Chaque branche porte, dans son commentaire, le
récit d'une régression de la précédente — « le correctif du correctif »,
« régression de N2 ». C'est le signe que la conception est à reprendre, pas la
branche suivante.

### Pourquoi on ne peut pas simplement écraser

Le principe de la propriétaire est juste : **« si on met à jour un calcul, c'est
pour qu'il soit appliqué. »** Mais le temps 1 tel qu'il est écrit **n'est pas
stable** : quand il n'a pas de source, il répond « aujourd'hui » (`now`).
Appliqué tel quel, S1 repasserait de 94 jours de retard à 0, et sa date
glisserait chaque jour ; S2 perdrait ses 108 jours par la règle 4 bis.

La règle « la date en base ne bouge jamais » ne protège en réalité qu'**une seule
information : le jour depuis lequel Rojer suit la ligne**, à partir duquel
l'ADR-011 § 5 compte le retard d'un « à planifier ». Cette origine n'est stockée
proprement nulle part — elle vit dans `datePrevue`, puis migre dans
`echeanceHonoree` quand la ligne roule. Pour la garder, on a gelé toute la date.

**Aucune saisie d'utilisateur n'est à protéger** : aucun écran, aucune action,
aucun outil MCP ne laisse saisir une `datePrevue`. Ses seuls écrivains sont la
régénération et les deux actions de rapport.

## 2. Le principe

**Une donnée dérivée est une fonction pure de faits stockés.** `datePrevue` et
`statut` sont dérivés ; les faits sont la date d'un titre, le dernier rapport
réalisé, la mise en service, le rythme effectif, le premier délai, et l'origine
du suivi. La fonction ne lit aucune horloge : deux passes donnent le même état,
**quel que soit le jour**, et quel que soit l'ordre dans lequel les faits ont été
saisis.

C'est la pratique dominante des GMAO pour un planning « flottant » — la date se
déduit du dernier contrôle, le modèle que l'ADR-034 a déjà retenu —, et le modèle
tourne déjà en production pour un porteur sur trois : la date d'un titre de
salarié est reprise du calcul à chaque passe.

## 3. La fonction

`src/lib/calendrier/echeance-de-ligne.ts`, module pur : ni horloge, ni base, ni
session.

```ts
type FaitsDeLigne = {
  periodicite: Periodicite;        // rythme EFFECTIF, prescription comprise
  premierPas: Periodicite;         // premier délai résolu par premierPas()
  dateDuTitre: Date | null;        // salarié — echeanceDuTitre()
  realisation: { date: Date; resultat: string } | null; // dernier rapport RÉALISÉ propre
  realisationHeritee: Date | null; // succession, la plus ancienne
  miseEnService: Date | null;
  origine: Date;                   // depuis quand Rojer suit la ligne
};
echeanceDeLigne(f): { datePrevue; statut; source } // `source` n'est jamais persistée
```

**L'ordre des règles**, et c'est l'ordre qui compte :

1. **La date du titre** → « planifiée » à cette date. Elle vient de la pièce que
   l'employeur a en main ; elle prime sur tout, réalisation comprise.
2. **Ponctuel** (`!estCyclique`) : la date est la mise en service, à défaut le
   début du jour de l'origine. Le statut est celui du dernier résultat si le
   contrôle est réalisé ; sinon « planifiée » si la mise en service n'est pas en
   retard **au jour de l'origine**, « à planifier » autrement. Un héritage ne
   solde pas un ponctuel.
3. **Dernier rapport réalisé** — propre, sinon hérité — **+ rythme effectif** →
   « planifiée », passée ou non. Le premier délai n'y est jamais lu.
4. **Mise en service + premier pas** → « planifiée » si cette première échéance
   tombe à l'origine ou après (`!estEnRetard(premiere, origine)`). C'est la
   règle 4 bis d'aujourd'hui, **évaluée au jour de l'origine et non au jour du
   calcul** : une échéance née pendant que Rojer suivait la ligne est réelle,
   passée ou non ; une échéance antérieure au suivi serait un retard inventé.
5. **Sinon** « à planifier », daté du **début du jour civil de Paris** de
   l'origine (`debutDuJour`, forme canonique de l'ADR-011).

**Précondition** : `dateDuTitre !== null || !estSansRendezVous(periodicite)`. Un
rythme `autre` n'a pas de rendez-vous ; la ligne n'existe que si une date de
titre est saisie, et elle passe alors par la règle 1. La fonction refuse le cas
contraire par une erreur, plutôt que de dater une obligation qui n'a pas de date.

**`premierPas(premierDelai, periodiciteReferentiel, periodiciteEffective)`** —
voir D1. Sans prescription, c'est `premierDelai ?? periodiciteReferentiel`, le
comportement d'aujourd'hui. Sous prescription, le plus court des deux plafonds.

Tout se compose de fonctions existantes — `prochaineEcheance`, `estCyclique`,
`estEnRetard`, `debutDuJour`, `statutDepuisResultat`,
`estPeriodicitePlusStricte`, `estSansRendezVous` ; aucune règle n'est recopiée.

## 4. La structure

**Correction apportée à l'audit : le générateur n'est pas nourri de
l'historique.** L'identité d'une ligne — clé, adoption par `succedeA`, héritage
par `absorbePar` — se résout dans le temps 2 ; l'origine et la réalisation propre
viennent de la rangée adoptée, dont la clé n'est pas celle de la ligne générée. Et
le commentaire de `reconcilierCalendrier` décrit déjà le piège : avec un
historique, un ponctuel réalisé sort de `aGenerer` et se fait archiver à tort.

- **Le temps 1 décrit.** Ce qui s'applique, et ses sources de calcul
  (`premierPas`, `miseEnService`, `dateDuTitre`). Il perd `now`, `datePrevue` et
  `statut`.
- **Le temps 2 rassemble et applique.** Il résout l'identité, rassemble les faits
  de la ligne, appelle `echeanceDeLigne`, écrit. Il garde **telles quelles** ses
  protections, qui n'ont rien à voir avec la date : la non-suppression d'une
  ligne qui porte une trace, l'archivage et le désarchivage, l'adoption, le
  porteur disparu, la boucle NB4 sur les lignes `autre` (hors de la fonction :
  elles n'ont pas de sémantique de date), les écritures conditionnées, les trois
  passes, le sceau.
- **Le dépôt et la suppression d'un rapport passent par la même fonction**, via
  `recalculerLigne(tx, verificationId)`. `rouler` et la chaîne de transmission
  d'`echeanceHonoree` disparaissent ; l'écriture d'`echeanceHonoree` au dépôt
  reste, l'ADR-034 § 5 en a besoin pour reconstruire les occurrences.

## 5. La table des cas

| Cas | Ce que la fonction rend |
|---|---|
| S1 | « à planifier » au 15/06, stable quel que soit le jour du calcul |
| S2, origine ≤ 01/06/2026 | « planifiée » au 01/06/2026 : les 108 jours sont gardés. Origine postérieure : « à planifier » à l'origine |
| S3a, S3b | « planifiée » au 01/12/2026, quel que soit le jour ; le 20/12 elle a 19 jours de retard |
| S4 | recalculée à chaque passe, donc appliquée : 15/11/2026 |
| S5 | « planifiée » au 01/09/2027, quel que soit l'ordre des saisies |
| S7 | mise en service + 6 mois, par `premierPas` |
| Rythme allongé (1 → 2 ans), sans rapport | mise en service + 2 ans : le retard inventé tombe |
| Rapport « non vérifiable » seul | ce n'est pas une réalisation : l'appelant passe `realisation: null` → règles 4 ou 5. `porteUnePreuve` empêche toujours la suppression |
| Rapport antidaté | seul le plus récent compte (`indexerDernieresRealisations`) : aucun effet |
| Suppression du dernier rapport | s'il en reste un réalisé : règle 3 sur lui. Sinon règles 4 ou 5 — une date de génération revient à l'origine, même date et même statut qu'aujourd'hui ; **une vraie échéance revient « planifiée »**, donc visible, et non plus masquée en « à planifier » |
| Ligne adoptée | même rangée : ses rapports et son origine la suivent |
| Ligne héritée (N → 1) | règle 3 sur la réalisation héritée la plus ancienne ; une réalisation propre prime toujours. La garde `!porteUnePreuve` disparaît : « propre, sinon héritée » ne peut pas se rejouer |
| Ligne sur mesure | pas de mise en service → « à planifier » à l'origine, puis rapport + rythme |
| Titre de salarié | règle 1, y compris sur un rythme `autre` dont l'échéance est saisie |
| Ponctuel ouvert | daté de la mise en service ; « planifiée » si elle est à venir au jour de l'origine |
| Ponctuel soldé | statut du résultat (conforme, observations, écart majeur) |
| Ligne `autre` non générée (NB4) | hors de la fonction |
| Ligne archivée puis rouverte | mêmes faits, même origine (D4) |

**Conséquence de la règle 5, écrite** : chaque ligne « à planifier » est réécrite
une fois, vers minuit de Paris du même jour civil. Le passage à blanc la range
sous `meme_jour_civil`.

**Un legs à protéger hors de la fonction** : un ponctuel au statut réalisé **sans
aucun rapport** (seed uniquement). La fonction ne voit que des faits et effacerait
cette trace ; une garde étroite dans l'applicateur la conserve, et le passage à
blanc la compte à part (`legs_statut_realise`).

### Les tests qui encodaient le défaut

La règle de tri, pour `generateur.test.ts` : un retard s'exprime par un fait —
origine, mise en service, rapport. **Un test dont la date n'est justifiable par
aucun fait encodait le défaut ; il est inversé, et nommé ici.**

- **« n'efface pas un retard déjà constaté »** (placeholder, date passée). Une
  ligne « à planifier » au 01/02/2026 et un appareil mis en service le
  01/03/2026 : le test exigeait que la ligne garde le 01/02 et reste en retard.
  Par les faits, cet appareil doit son premier contrôle le 01/03/2027 et n'a
  manqué aucun rendez-vous. C'est S5. **Inversé.**
- **« ne bouge pas l'échéance calculée d'un équipement »** garde son assertion
  quand la ligne n'a aucune source (c'est S1) ; sa variante où le générateur
  apporte une date « planifiée » suit l'inversion ci-dessus.
- **« adopte l'échéance même quand la ligne porte une réalisation »** garde sa
  date — le titre prime — mais **perd son assertion de statut** : la règle 1
  rend « planifiée », là où le test conservait un statut réalisé hérité d'avant
  l'ADR-034 sur un rythme cyclique. Les lecteurs le lisent déjà « planifiée »
  (`statutLu`).
- **« une périodicité devenue PONCTUELLE solde une ligne roulée »** garde son
  statut, pas sa date : le ponctuel soldé est daté de sa mise en service (ou de
  l'origine), plus de l'échéance roulée qu'il portait. Aucun lecteur ne lit la
  date d'un ponctuel soldé.

## 6. Les quatre décisions à confirmer

### D1 — Premier délai contre prescription plus stricte

**L'exemple.** Un récipient sous pression mis en service le **01/12/2025**. Le
texte dit : première inspection dans les **3 ans**, puis tous les **4 ans**. Sans
rien d'autre, première échéance au **01/12/2028** — c'est le comportement
d'aujourd'hui, inchangé. L'assureur impose maintenant un contrôle **annuel**.

| Option | Première échéance affichée |
|---|---|
| **(a) le plus court entre « premier délai du référentiel » et « rythme de la prescription »** — *recommandée* | **01/12/2026** |
| (b) le premier délai du référentiel seul — le code actuel, c'est S7 | 01/12/2028, sur une ligne étiquetée « annuelle » : premier contrôle dans trois ans, puis tous les ans |
| (c) le plus court entre le premier délai et **tous** les rythmes, référentiel compris | 01/12/2026 ici — mais fausse un autre texte, voir ci-dessous |

**Pourquoi pas (c).** Un texte « première vérification à **2 ans**, puis
**annuelle** » — sans aucune prescription —, appareil du 01/12/2025 : (c) rend le
**01/12/2026**, un an avant ce que le texte exige ; (a) rend le 01/12/2027. On ne
compare donc **jamais** le premier délai au rythme du référentiel : les deux
viennent du même texte, qui a voulu les deux.

**Écart relevé avec la formule du plan, à connaître avant de confirmer.** Écrite
littéralement — `base = premierDelai ?? référentiel`, puis « l'effectif s'il est
plus strict que la base » —, elle tombe dans (c) quand il n'y a **pas** de
prescription : l'effectif est alors le rythme du référentiel, et il est comparé
au premier délai. Le code porte donc une garde : sans prescription (effectif =
référentiel), la base est rendue telle quelle. Aucune obligation livrée n'est
touchée aujourd'hui — le seul `premierDelai` du référentiel, 3 ans puis 4 ans,
est plus court que son rythme — mais la première qui l'aurait été se serait
trompée en silence. Une mutation qui retire la garde fait rougir la table.

### D2 — Une colonne explicite `suiviDepuis`

**L'exemple.** S1 : une obligation d'établissement suivie depuis le
**15/06/2026**, jamais contrôlée. Au 17/09 : 94 jours de retard.

| Option | Ce qui s'affiche |
|---|---|
| **(a) colonne `suiviDepuis`, écrite une fois à la création, jamais modifiée** — *recommandée* | 15/06, 94 jours — et pareil après une restauration ou un import |
| (b) lire `createdAt`, qui existe déjà et que personne ne lit | 15/06, 94 jours **aujourd'hui**. Après une restauration de base le 01/10/2026, `createdAt` repart au 01/10 : **0 jour de retard, 108 jours blanchis, sans un mot**. C'est le défaut que ce chantier ferme — une date stockée sans son origine — qui reviendrait par une autre porte |

Deux raisons de plus pour (a) : les seeds doivent pouvoir écrire « suivi depuis
huit mois, jamais contrôlé », ce que `createdAt` interdit ; et `createdAt` est
posé par PostgreSQL quelques millisecondes après l'horloge qui a servi au calcul
— une ligne créée à 23:59:59,998 le 15/06 pourrait porter le 16/06.

**Le coût** : une migration, additive et sans effet sur le code en ligne (Vercel
la joue dès la preview) — `ADD COLUMN … NOT NULL DEFAULT CURRENT_TIMESTAMP`, puis
`UPDATE … SET "suiviDepuis" = "createdAt"`.

### D3 — Un changement de rythme peut faire passer une ligne « à planifier », en retard

**L'exemple.** Mise en service le **01/01/2026**. La ligne est créée le
**01/09/2026** (l'appareil est déclaré ce jour-là). Rythme annuel : première
échéance au 01/01/2027, **après** l'origine → « planifiée » au **01/01/2027**.

Une prescription **semestrielle** arrive. La première échéance devient le
**01/07/2026** — **avant** l'origine. La règle 4 ne conclut plus :

| Option | Ce qui s'affiche |
|---|---|
| **(a) accepter la conséquence** — *recommandée* | « à planifier » au **01/09/2026**, donc **en retard dès le 02/09** (16 jours au 17/09). C'est exactement ce que la ligne aurait affiché si la prescription avait existé le jour de la création. Le dirigeant fait faire le contrôle, dépose le rapport, et la ligne repart à rapport + 6 mois |
| (b) garder la première échéance, même antérieure à l'origine | « planifiée » au 01/07/2026 : **78 jours de retard** au 17/09, comptés sur deux mois où Rojer ne suivait pas l'appareil et où la prescription n'existait pas. C'est abandonner la règle 4 bis : un appareil de 2018 afficherait sept ans de retard |
| (c) repartir de la date de la prescription | demande un fait que la fonction ne reçoit pas (`dateDocument`). Hors périmètre, nommé au § 8 |

**Ce que (a) coûte, dit honnêtement** : une ligne qui était tranquille jusqu'au
01/01/2027 devient rouge le lendemain de la saisie de la prescription. C'est le
prix de l'indépendance à l'ordre des saisies — le même que S1.

### D4 — L'origine n'est pas remise à zéro quand une ligne archivée est rouverte

**L'exemple.** Un extincteur sans date de mise en service. Ligne créée le
**01/03/2026**. Le 10/03, un rapport « non vérifiable » est déposé — la ligne
porte une trace. L'appareil est désactivé le 01/04 (la ligne est **archivée**,
pas supprimée), puis réactivé le **01/09/2026**.

| Option | Ce qui s'affiche au 17/09 |
|---|---|
| **(a) l'origine reste le 01/03** — *recommandée* | « à planifier » au 01/03, **200 jours de retard**. Identique à aujourd'hui pour une ligne qui porte une trace |
| (b) l'origine repart à la réouverture | « à planifier » au 01/09, 16 jours. Désactiver puis réactiver un appareil deviendrait le moyen d'effacer un retard — sur une ligne qui a justement une pièce au dossier |

**Ce que (a) coûte** : un appareil réellement hors service cinq mois affiche un
retard qui compte ces cinq mois. Le produit ne sait pas distinguer un arrêt réel
d'un aller-retour ; dans le doute, l'incertitude ne réduit jamais la couverture.

## 7. Les options écartées

- **La rustine « (a) »** — « sans contrôle réalisé et avec une mise en service
  connue, reprendre la date du temps 1 ; sinon garder la date ». Elle corrige
  S3a, S4 et S5. Telle quelle, elle efface les 108 jours de S2 (le temps 1 y rend
  « aujourd'hui »). Bornée à « seulement si le temps 1 rend planifiée », S3b reste
  faux. Et ce serait la **neuvième branche** d'un calcul qui ne devrait pas vivre
  là. La propriétaire l'a refusée : « on prend le temps, mais que ce soit sain et
  fiable. »
- **Lire `createdAt` directement** — voir D2.
- **Nourrir le générateur de l'historique** — la proposition de l'audit. L'identité
  se résout au temps 2, et un ponctuel réalisé disparaîtrait de `aGenerer` (§ 4).
- **Tout écraser avec le générateur actuel** — il répond `now` sans source : S1 et
  S2 perdent leur retard, et la date glisse à chaque régénération (§ 1).

## 8. Les limites, écrites pour ne pas les redécouvrir

- **Désactiver puis réactiver un appareil remet l'origine à zéro pour une ligne
  sans trace** : elle est supprimée, puis recréée. Le trou existe déjà
  (`generateur.ts`, « CE QUE CETTE SUPPRESSION LAISSE PASSER ») ; il n'est ni
  aggravé ni fermé. Le fermer voudrait archiver une ligne qui n'atteste de rien.
- **Une ligne absorbante neuve ne reprend pas l'origine des lignes absorbées.**
  Elle reprend leur réalisation (règle 3), pas leur ancienneté de suivi.
- **L'origine est le seul fait de « premier cycle » hors mise en service.** Une
  date d'installation dans les lieux (`GH 61 § 5`), une modification notable d'un
  équipement sous pression, la date d'une prescription : autant de faits que la
  fonction saurait lire et que le modèle ne porte pas. Hors périmètre.
- **Le renforcement de périodicité ne vise toujours que le porteur équipement.**
- **La règle de fusion « la plus ancienne l'emporte »** est inchangée, et reste la
  déduction que `reprendreLaRealisation` dit qu'elle est.

## 9. Le plan de bascule

Chaque lot se fusionne seul, après relecture neutre, suite complète en UTC, `tsc`,
`eslint`, `next build`, preview et point avec la propriétaire — qui pousse `main`.

| Lot | Contenu | Preuve |
|---|---|---|
| **0** | cet ADR, les quatre décisions | — |
| **1** | la fonction pure et sa table de vérité, **sans branchement** | une mutation par règle, chacune rouge ; `version-moteur.test.ts` vert sans retouche ; une garde interdit tout import du module |
| **2a** | la colonne `suiviDepuis` (si D2), écrite au `createMany` ; `faux-prisma.ts` durci (`select` honoré) | relevé du moteur recopié sans incrément |
| **2b** | la couture : les branches de date déplacées **mot pour mot** dans une stratégie `deciderParConservation` | les tests existants verts sans être touchés |
| **2c** | **le passage à blanc** : la stratégie candidate `deciderParFaits`, et un script en transaction `READ ONLY` — une lecture, deux plans, leur différence, par établissement et par catégorie (`identique`, `meme_jour_civil`, `statut_seul`, `rythme`, `mise_en_service`, `retard_invente`, `date_arbitraire`, `legs_statut_realise`, `inexplique`), sans aucun nom de personne ; le plan candidat rejoué à J+400 doit être vide | **zéro `inexplique`**, en local puis en production (lancé par la propriétaire) ; compte rendu dans `docs/revues/` |
| **3** | les seeds et les démos écrivent des faits ; leur `datePrevue` sort de `echeanceDeLigne` | seed complet + passage à blanc = zéro écart |
| **4** | **la bascule** : `deciderParFaits` par défaut, le générateur perd `now`, dépôt et suppression passent par `recalculerLigne`, `VERSION_MOTEUR_CALENDRIER` = 3, amendements barrés (ADR-012, ADR-034, en-tête de `generateur.ts`), la garde du lot 1 est retirée | passage à blanc refait sur la production juste avant ; confluence (après un dépôt, la réconciliation rend « inchangé ») ; plan vide à J+400 |
| **5** | le ménage : couture, types morts, garde du legs si la production n'en compte aucun, `chantiers-ouverts.md`, puce 036 du `CLAUDE.md` | — |

C'est la méthode « Scientist » : le nouveau calcul tourne à côté de l'ancien, les
écarts sont journalisés sans rien écrire, puis on bascule.

## 10. Le retour arrière

Annuler le commit du lot 4 et passer `VERSION_MOTEUR_CALENDRIER` à **4**, pas à
2 : chaque dossier doit être rescellé, et un numéro déjà servi ne rejouerait rien.
L'ancien moteur conserve les dates en place, qui sont justes. La colonne
`suiviDepuis` reste, sans effet. **Aucun fait n'est détruit par la bascule** — une
date est une donnée dérivée, et l'export JSON du passage à blanc garde l'état
d'avant.
