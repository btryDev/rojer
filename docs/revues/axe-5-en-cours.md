# Axe 5 — éprouver les gardes en les cassant

Worktree isolé `agent-ab3ea8b968f2eda1c`, plage `de2d857..2a54efb`.
Aucune injection commitée. `git checkout` du fichier entre chaque épreuve.
Aucune commande Prisma contre une base.

## Vert de référence (avant toute injection)

```
> vitest run
 RUN  v4.1.4
 Test Files  133 passed (133)
      Tests  1836 passed (1836)
   Duration  5.62s
```

Vert final, après revert de toutes les injections : **133 / 1836, identique.**
Arbre propre (`git diff --stat` vide) hors ce fichier.

---

## Épreuve 1 — `tenancy-lectures.test.ts` sur son propre cas : SOLIDE

**Garde** : `src/lib/auth/tenancy-lectures.test.ts` — « les lectures rattachées à
un établissement établissent toutes leur portée ».

**Injecté** : dans `src/lib/etats-permanents/queries.ts:listerEtatsPermanents`,
retrait du `const user = await requireUser()` et de la ligne
`etablissement: { entreprise: { userId: user.id } }`. **Commentaire explicatif
laissé en place** — il contient littéralement `requireEtablissement(id)`
(ligne 101). L'injection reproduit donc exactement le mode d'échec « la prose
couvre le code nu ».

**Tombé** :

```
FAIL src/lib/auth/tenancy-lectures.test.ts > établissent toutes leur portée
AssertionError: expected [ Array(1) ] to deeply equal []
+ [ "etats-permanents/queries.ts:listerEtatsPermanents" ]
```

**Conclusion** : garde solide sur son cas, et `sansCommentairesNiChaines()` fait
un vrai travail — vérifié en laissant en place le commentaire porteur du
mot-clé. Écrite par quelqu'un qui l'avait déjà cassée lui-même, et ça se voit.

### Variation du cas : ce que la garde ne voit pas

Mesuré en instrumentant son propre balayage :

- elle voit **45 fonctions**, toutes dans `src/lib/*/queries.ts` ;
- l'assertion plancher est `toBeGreaterThan(15)`. **Trente des quarante-cinq
  peuvent disparaître sans que rien ne rougisse.** La borne basse est trois fois
  trop lâche pour ce qu'elle protège ;
- le balayage ne lit **que** `src/lib/<dossier>/queries.ts`, un seul niveau de
  profondeur et ce nom de fichier exact. Sur les **65 fichiers** du dépôt qui
  portent une lecture Prisma, la garde en inspecte **22**. Les `actions.ts`,
  les pages `src/app/**`, et les modules `lib` qui lisent sans s'appeler
  `queries.ts` (`navigation/sidebar-counts.ts`, `perimetre/faits.ts`,
  `dashboard/transmissions.ts`, `equipements/fiche.ts`, `salaries/droits.ts`,
  `calendrier/echeances.ts`…) sont hors de son champ ;
- le découpage des corps va d'un `export` au `\nexport ` suivant : une fonction
  **non exportée** placée après une fonction exportée est absorbée dans le corps
  de celle-ci et hérite de ses marqueurs. C'est précisément la forme des deux
  seules lectures réellement nues du dépôt (§ mesure ci-dessous) ;
- `export const f = async () => {}` n'est pas reconnu par
  `/export (?:async )?function (\w+)\(/`.

**Ce n'est pas un défaut à corriger** : le test dit lui-même qu'il vise « la
forme des neuf défauts constatés », tous dans des `queries.ts`. Mais il faut
lire son titre pour ce qu'il est — *les lectures des `queries.ts` de premier
niveau*, pas *les lectures du dépôt*. La borne à 15 est la seule chose que je
resserrerais, et seulement si on y touche par ailleurs.

---

## Épreuve 2 — `corpus.test.ts:243`, la liste exhaustive : NE GARDE RIEN

**Garde** : `src/lib/referentiels/corpus/corpus.test.ts:243`,
`expect(refs).toEqual([...])` — liste écrite à la main des articles au statut
`obligation_manquante`.

### Le fait, contre-vérifié sur pièce à `2a54efb`

`L. 4622-1` apparaît **deux fois dans le corpus**, avec la même URL, la même
`versionEnVigueur` (2022-03-31), la même `citationCle`, lu le même jour
(`luLe: "2026-08-31"`) — et **deux statuts contradictoires** :

| fichier | ligne | statut |
|---|---|---|
| `corpus/code-travail-sante-travail.ts` | 87 | `obligation_manquante` |
| `corpus/code-travail-service-prevention-sante.ts` | 40 | `retenu` → `sante-travail-etablissement-adhesion-spst` |

Et l'obligation **existe** : `conformite/sante-travail.ts:323`,
`sante-travail-etablissement-adhesion-spst`, porteur établissement.

Le `bloquePar` de l'entrée périmée est devenu faux mot à mot. Il dit « rien dans
le produit ne permettrait de la solder » et « encoder une obligation sur un
titre dont on n'a lu qu'une phrase reviendrait à faire ce que le cliquet
interdit » — or le lot 8 l'a encodée légitimement, en ouvrant un corpus de
quatre articles pour ne plus être dans ce cas.

**Le dépôt publie donc « nous ne couvrons pas L. 4622-1 » sur une obligation
qu'il couvre.** `obligationsManquantes()` est la liste, nommée et sourcée, de ce
que le référentiel avoue ne pas porter ; elle est lue comme telle.

### Injecté : la correction honnête

Entrée périmée passée de `obligation_manquante` à
`statut: "retenu", obligations: ["sante-travail-etablissement-adhesion-spst"]`.

**Ce qui est tombé — un seul test, et c'est la liste :**

```
Test Files  1 failed | 132 passed (133)
     Tests  1 failed | 1835 passed (1836)

FAIL corpus.test.ts:243 > ne retient qu'un seul article créant une obligation
                          périodique pour les secteurs couverts
AssertionError: expected [ 'PE 27', …(10) ] to deeply equal [ 'PE 27', …(11) ]
-   "L. 4622-1",
```

**Ce qui n'est PAS tombé** : `liensRetenusRompus()` passe — le lien est
légitime, le référentiel le confirme. Les 17 autres tests du corpus passent.

C'est la démonstration complète, dans les deux sens :

- sur l'état **faux**, la suite entière est verte (1836/1836) ;
- sur l'état **juste**, un seul test rougit — et c'est pour réclamer le retour
  du défaut.

La liste s'est trompée de côté. Elle ne certifie pas que le corpus est juste,
elle certifie qu'il n'a pas bougé ; et sa réparation naturelle, sous pression,
est de retirer une ligne du test. Le commentaire au-dessus raconte la sortie de
`PE 37` faite à la main le 31 au soir : la même n'a pas été faite pour
`L. 4622-1`, et rien ne l'a signalé.

### Ce qui l'attraperait — mesuré, pas supposé

Sonde temporaire sur le corpus réel (33 corpus, 237 articles), supprimée après
lecture.

**Règle 1 — un même `ref` ne peut pas porter deux statuts divergents.**
Purement interne au corpus, ne touche pas au référentiel.

```
refs présents dans plusieurs corpus : 3
  dont statuts DIVERGENTS            : 1
    L. 4622-1 -> sante-travail=obligation_manquante | service-prevention-sante=retenu
  concordants                        : 2
    R. 4226-19 -> incendie | electricite = retenu
    L. 4711-5  -> incendie | electricite = retenu
```

**Zéro faux positif, un vrai positif.** Quelques lignes, aucun arbitrage.

**Règle 2 — un article `obligation_manquante` ne peut pas être cité par une
obligation encodée.** C'est celle dont le faux positif était redouté (« un
article peut être cité par une obligation voisine sans que l'obligation qu'il
crée soit portée »).

```
articles obligation_manquante : 12
  SIGNALÉ L. 4622-1 <- sante-travail-etablissement-adhesion-spst
  total signalés : 1 / 12
```

**Zéro faux positif aujourd'hui aussi.** Le risque redouté est réel mais ne
s'est pas matérialisé : la crainte se mesure à 0/12.

**Ce que je dis honnêtement de ces deux règles** — et c'est ce qui départage :

- la **règle 1 attrape ce défaut-ci, pas sa classe**. Si le lot 8 avait encodé
  `L. 4622-1` sans ouvrir un second corpus, elle serait restée muette. Elle est
  quasi gratuite, mais elle ne couvre que le cas du doublon ;
- la **règle 2 attrape la classe**, et c'est elle qui vaut. Son faux positif
  futur est réel : `referencesLegales` ne distingue pas l'article *fondateur* de
  l'article cité *en contexte* (pas de champ de rôle dans `ReferenceLegale`,
  `conformite/types.ts:197`), et `sante-travail-etablissement-adhesion-spst`
  cite justement `D. 4622-1` et `D. 4622-2` en contexte. Le jour où l'un des
  deux serait rangé `obligation_manquante` ailleurs, la règle crierait à tort.

Décision non prise ici : elle appartient à la propriétaire. La correction de
l'entrée périmée, elle, ne dépend d'aucune règle.

---

## Mesure — les lectures Prisma et le prédicat de tenancy

Demandée en remplacement du prototype AST. Balayage du source à `2a54efb`,
hors tests, puis **contre-vérification à la main des douze cas signalés**.

```
TOTAL lectures Prisma (hors tests) : 172
fichiers concernés                 :  65
```

| | |
|---|---|
| sur modèle non rattaché à un établissement (`entreprise`, `accessToken`, `signature`) | 9 |
| sur modèle rattachable à un établissement | **163** |
| — prédicat porté dans le `where` | **127** |
| — portée établie dans la fonction, lecture par l'id vérifié | **34** |
| — lecture par un id que personne n'a confronté au compte | **2** |

Les 12 cas signalés par le balayage automatique se réduisent à 2 après lecture.
**Dix étaient des faux positifs de ma sonde**, et chacun illustre une des trois
formes légitimes que `tenancy-lectures.test.ts` recense :

- `calendrier/echeances.ts` ×3 — `where: scope`, où `scope` **est** le prédicat
  complet (`{ etablissementId, etablissement: { entreprise: { userId } } }`),
  construit dans `listerAutresEcheances` après `requireUser()` ;
- `requireRisque` / `requireUnite` / `requireDuerp` ×2 /
  `assertEntrepriseOwnership` ×2 — la fonction établit l'appartenance puis ne
  lit que par l'id vérifié ;
- `app/…/verifications/[verificationId]/page.tsx` — `getVerification()` est
  scopée, plus un `v.etablissementId !== id → notFound()`.

### Les deux lectures réellement nues, et laquelle décide

Toutes deux sont des **helpers non exportés** — donc invisibles à
`tenancy-lectures.test.ts` deux fois : elles sont dans un `actions.ts`, et une
fonction non exportée est absorbée dans le corps de l'exportée qui la précède.

**1. `src/lib/transverses/actions.ts:16` — `obtenirUniteTransverse(duerpId)`**
`prisma.uniteTravail.findFirst({ where: { duerpId, estTransverse: true } })`.
Unique appelant `toggleRisqueTransverse`, qui fait `requireDuerp(duerpId)`
d'abord. **Non exploitable aujourd'hui.** Le commentaire du fichier (l. 12-13)
dit d'ailleurs que `requireDuerp` remonte jusqu'à `Entreprise.userId`.
*Scénario si l'appelant change* : un second appelant qui passerait un `duerpId`
non confronté créerait ou lirait l'unité transverse d'un autre dossier. C'est le
cas d'école de la convention, et il reste théorique.

**2. `src/lib/prescriptions/actions.ts:108` —
`compterLignesAvecPreuve(prescriptionId)`**
`prisma.verification.count({ where: { prescriptionId, OR: [...] } })`.
Unique appelant `supprimerPrescription(etablissementId, prescriptionId)`, qui
fait `assertEtablissementOwnership(etablissementId)`.

**C'est le seul cas où l'appelant ne vérifie pas le mauvais objet par accident,
mais par construction** : il vérifie l'**établissement**, et lit par la
**prescription**, sans jamais confronter les deux. Le défaut n'est donc pas
« si l'appelant changeait » — il est déjà là.

*Scénario, avec ce qu'il donne et ce qu'il ne donne pas.* Un utilisateur
authentifié propriétaire de l'établissement A appelle
`supprimerPrescription(A, prescriptionId_de_B)`. L'assertion passe. Le compte
porte sur les vérifications de B. Si le compte est > 0, la réponse rendue à
l'écran contient **le nombre de vérifications d'un autre compte** :
« Suppression refusée : 3 vérifications issues de cette prescription portent un
rapport ou une action corrective. » C'est un **oracle de comptage
inter-comptes**.

Ce qu'il ne donne pas, et c'est ce qui le déclasse : la suppression qui suit
**est** scopée — `where: { id: prescriptionId, etablissementId }` (l. 216) —
donc aucune écriture ne traverse la frontière, et l'oracle exige de deviner un
`cuid`, qui n'est pas énumérable.

**Passage au filtre** : contre-vérifié sur pièce (oui) ; quelqu'un peut-il s'en
apercevoir — un dirigeant à l'écran, un contrôleur sur pièce ? non ; est-ce
grave, réglementaire, ou fait-ce mentir la réglementation ? non, aucun des
trois. **Donc se consigne, ne se corrige pas** — je l'écris ici plutôt que de
le remonter comme un défaut. Si on y touche un jour, la correction est d'une
ligne (`etablissementId` dans le `where` du compte) et ne crée aucune surface.

### Ce que la mesure dit de la règle AST

Elle confirme l'argument contre. Sur 163 lectures rattachables, **161 portent
leur portée** d'une des trois formes légitimes, et les 2 restantes sont des
helpers privés à appelant unique déjà vérifié. Une règle AST devrait reconnaître
les trois formes pour ne pas crier à tort — c'est exactement l'exercice qui
avait produit **treize faux positifs** à la première rédaction de
`tenancy-lectures.test.ts` — et son rendement mesuré serait de deux
signalements, dont un seul décrit un vrai franchissement, non exploitable.
**Ma propre sonde, écrite en connaissance de cause, a fait 10 faux positifs sur
12 signalements.** C'est le taux qu'il faut avoir en tête, et il plaide contre
l'outil.

---

## Gardes que je n'ai PAS éprouvées, nommément

Ni cassées ni instruites, faute de tour :

- `src/lib/matching/faux-negatifs-ancrage.test.ts` (322 l., neuf) — les trois
  obligations rebranchées du palier 1 ;
- `src/lib/etats-permanents/regle.test.ts` (355 l., neuf) et
  `actions.test.ts` (135 l. ajoutées) — la garde de l'action et la règle
  `modeDeclarationApplique`, que les commentaires disent avoir divergé ;
- `src/lib/etats-permanents/phrases.test.ts` (265 l.) — le motif d'origine
  (« 1 sur 3 portent une date ») est corrigé, mais je n'ai pas éprouvé les
  autres accords du fichier ;
- `src/lib/dashboard/transmissions.test.ts` (229 l. ajoutées) et
  `recommandations.test.ts` (88 l. ajoutées) ;
- `src/lib/referentiels/conformite/conformite.test.ts` (184 l. ajoutées) — en
  particulier `EMPREINTE_ATTENDUE`, qui est un compteur figé : sa forme est
  celle d'une liste exhaustive et mérite le même traitement que
  `corpus.test.ts:243` ;
- `src/lib/referentiels/conformite/nature.test.ts` (158 l., neuf) ;
- `src/lib/salaries/echeance-promise.test.ts` (97 l., neuf) — porte des
  périodicités (quinquennale, quadriennale, biennale) : **cible prioritaire
  pour la porte (b)**, une périodicité fausse figée par assertion ;
- `src/lib/calendrier/domaines-presents.test.ts` (129 l., neuf) ;
- `src/lib/rgpd/frontiere-medicale.test.ts` (55 l. ajoutées) ;
- `src/components/guide/guide-n-affirme-rien.test.ts` (132 l., neuf) — lu, non
  cassé. Il grep du source (`ChezVous.tsx`, `IllustrationDocuments.tsx`,
  `recommandations.ts`) **sans retirer les commentaires** : c'est le motif de
  l'épreuve 1, et il n'est pas protégé ici. Ses assertions sont des `not.toContain`,
  donc un mot-clé dans un commentaire les ferait rougir à tort plutôt que
  passer à tort — le sens d'erreur est le bon. **Vérifié en revanche, contre le
  troisième motif (« garde calibrée sur un rendu que personne n'affiche ») : le
  composant est bien monté** — `app/etablissements/[id]/guide/page.tsx:94` →
  `GuideHero` → `IllustrationDocuments`, et `ChezVous` l. 98 de la même page.
  La garde du SVG porte sur un rendu réellement affiché. Rien à signaler.
