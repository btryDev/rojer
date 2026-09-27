# Audit de bout en bout — du texte enregistré au réconciliateur (2026-09-27)

Branche `lot/audit-bout-en-bout`, sur `lot/couverture-reponse-absente` (`1cded3d8`).
Commande de la session de coordination, pour la propriétaire : « est-ce que tout ce
qui concerne le périmètre est là et fonctionnel ». Mené les 27 et 28 septembre.

Règle de décision reçue avec la commande : ce qu'une règle déjà écrite décide, ou
qu'un texte relu par l'API Légifrance fonde clairement, est tranché et codé ; le
reste va dans `docs/revues/decisions-a-prendre-2026-09-27.md` (D1 à D24).

Chaque maillon dit ce qui est **vérifié**, ce qui était un **défaut** et a été
corrigé, et ce qui attend une **décision**, avec la preuve : commit, test, ou sortie
relevée. Un test ajouté ici a été éprouvé en injectant la violation qu'il interdit ;
la casse est décrite dans le message du commit ou dans l'en-tête du fichier de test,
et la sortie rouge est citée ci-dessous. Une contre-lecture neutre en a rejoué six
le 2026-09-28, avec les mêmes sorties.

**Hashs.** La branche a été rebasée deux fois le 2026-09-27 (sur les corrections de
la revue du lot 1, puis sur `1cded3d8`). Les hashs cités ici sont ceux d'aujourd'hui.
Les messages de commit antérieurs au rebase citent parfois l'ancien : `05acd12` →
`1310b435`, `c70a069` → `2505c5b2`, `56c35fc` → `9b0f735a`, `2967030` → `f67f56d5` ;
l'en-tête généré de `verification-legifrance-2026-09-27-lot2.md` dit « Corpus à
`71294cb` », aujourd'hui `feeb952e`.

**Fichiers temporaires.** `2505c5b2` a embarqué trois fichiers d'audit temporaires
(`zz-m5-*.tmp*`), retirés par le commit suivant, `2135985f`. Ils n'existent dans
aucun arbre de fin de branche.

---

## Maillon 1 — Corpus

**Vérifié.**
- `pnpm legifrance:verifier` sur tout le corpus (`1310b435`, rapport
  `docs/revues/verification-legifrance-2026-09-27-lot2.md`) : 534 articles, 513 OK,
  20 non vérifiables (fiches INRS, règlement UE 2024/573, arrêtés cités entiers,
  et GE 6 — corrigé ci-dessous), 0
  introuvable, 0 écart de citation, 0 version différente, 1 « abrogé / transféré ».
  Ce dernier est R. 4216-2, en abrogation différée au 2027-01-01 et déjà relevé au
  corpus par le lot 1.
- Chaque article `retenu` nomme au moins une obligation (`liensRetenusRompus`, test
  existant).

**Défaut corrigé.** GE 6 n'était pas résolu : son URL pointait une section, pas
l'article en abrogation différée. Elle pointe désormais LEGIARTI000020380169
(`3615cb33`). Relevé le 2026-09-28, `pnpm legifrance:verifier -- --ref "GE 6"` :
« [1/1] GE 6 (arrete-1980-livre-2) : OK ».

**Décision.** D15 : treize obligations citent un article `retenu` qui ne les nomme
pas. Le sens inverse du lien n'est gardé par aucun test. Un test a été écrit
pendant l'audit ; il est rouge par construction et n'est pas commité — il se pose
avec la décision.

## Maillon 2 — Référentiel : aucune obligation morte

**Vérifié, par un test** (`src/lib/matching/obligations-atteignables.test.ts`,
`88b34b80`).
- Chaque obligation d'établissement ou d'équipement naît d'au moins un dossier que
  l'inscription et le formulaire d'équipement acceptent.
- Chaque obligation de salarié est un titre déclarable.
- Les profils sont dérivés des schémas et des seuils du référentiel, pas recopiés.
- Épreuve : un refus de `estHabitation` injecté au schéma d'inscription rend
  « Tests 1 failed | 2 passed (3) », et nomme les cinq obligations d'habitation
  devenues mortes.

## Maillon 3 — Moteur : bornes des conditions

**Vérifié, par un test** (`src/lib/matching/seuils-derives.test.ts`, `360da522`).
- Chaque seuil d'effectif et chaque `personnesPresentesMin` est lu dans le
  référentiel et éprouvé juste au seuil et de part et d'autre.
- Épreuve : `n < t.effectifMin` changé en `<=` rougit sur
  `locaux-etablissement-local-restauration`.
- Les conditions d'équipement sont tenues par la garde générique du lot 1
  (`absence.test.ts`, second `describe`).

**Défaut corrigé (A1).** Un nombre de personnes déclaré sous l'effectif du site
écartait, sans rien dire, la consigne, l'alarme et les exercices de R. 4227-34
(« occupées » : 60 salariés et 40 déclarés, et la ligne tombait). Le moteur retient
désormais le plus grand des deux (`2505c5b2`). Épreuve : sans le `Math.max`, « A1 »
rougit.

**Décisions.**
- D7 : les vérifications de levage sont en double. L'art. 23 de l'arrêté du
  1er mars 2004 donne un seul rythme par appareil. Le cas écrit pendant l'audit
  n'est pas commité ; `seuils-derives.test.ts` dit en tête qu'il n'est pas tenu.
- D9 : faut-il un avertissement à la fiche quand le nombre déclaré est sous
  l'effectif ?

## Maillon 4 — Datation (`echeance-de-ligne`)

**Vérifié.** La table de `echeance-de-ligne.test.ts` tient déjà un cas par règle.
L'ordre entre les règles et le calendrier civil de Paris sont ajoutés dans
`src/lib/calendrier/echeance-ordre-calendrier.test.ts` (`360da522`), avec quatre
épreuves :
- titre > ponctuel soldé : rouge, alors que `echeance-de-ligne.test.ts` restait vert
  sous la même casse ;
- rapport > héritage > mise en service : `realisationHeritee ?? realisee` rend
  « Tests 3 failed | 100 passed (103) » sur les deux fichiers — 1 rouge dans le
  nouveau, 2 dans la table existante ;
- 29/02 en annuel et 31/03 en trimestriel : l'écrêtage de fin de mois retiré
  (`dates/index.ts:296`) rend « Tests 2 failed | 3 passed (5) » ;
- passage à l'heure d'été : le pas de six mois en UTC rend 1 rouge.

**Décision.** D8 : un ponctuel antérieur au suivi affiche des années de retard
(mise en service le 2015-03-01 : 4 228 jours au 2026-09-27, par le calcul), quand la
règle 4 écarte ce passé pour les rythmes cycliques. La sortie de la sonde n'est pas
dans le dépôt.

## Maillon 5 — Réconciliateur

**Vérifié de bout en bout** (`src/lib/calendrier/reconciliateur-bout-en-bout.test.ts`,
`d9b8c2bd` et `48417bbc`). Le fichier appelle le vrai `assurerCalendrierAJour`, la
vraie `calendrierDesynchronise` et la vraie régénération, sur le faux client.

| Demandé | Cas du fichier | Épreuve |
|---|---|---|
| Changement de version du référentiel ; **passage de `VERSION_MOTEUR_CALENDRIER`** | a/b : sceau périmé (référentiel, empreinte, moteur précédent, moteur 0) → régénère, pose le sceau, puis plus rien | sceau comparé sans sa part moteur → (b) rouge ; **`queries.test.ts` restait vert** — rejoué le 2026-09-28 sur les deux fichiers : « Tests 2 failed \| 36 passed (38) », les deux rouges dans le nouveau |
| Changement de périodicité | c : sans rapport, date recalculée depuis la mise en service ; avec rapport, dernier rapport + nouveau rythme | — |
| Disparition et retour d'un porteur : équipement | d : archivée puis rouverte, même identifiant, rapport et action intacts | `archiveLe: null` retiré d'`aMettreAJour` → rouge |
| … : salarié sorti puis revenu | d bis : même aller-retour sur un titre de salarié | même casse → « d » et « d bis » rouges |
| Rapports et actions préservés sous écriture concurrente | e : dépôt APRÈS la lecture des rapports ; trois passes sans converger | `updateMany` sans `datePrevue`/`statut` → les deux (e) rouges ; non-convergence sans `marquerCalendrierPerime` → rouge ; **`actions.test.ts` restait vert** |
| États permanents intacts | f : la régénération ne touche que ses quatre modèles | accès à `declarationEtatPermanent` → rouge |

Trois des cinq garanties éprouvées laissaient la suite existante verte une fois
cassées : la part moteur du sceau, l'écriture conditionnée et la non-convergence.
Pour l'écriture conditionnée, le crochet d'`actions.test.ts` tire avant la lecture
des rapports : le plan voit le dépôt, et l'écriture non conditionnée passe
inaperçue. Le cas (e) comble ce trou.

Il y a aussi une limite écrite, que le test caractérise sans la valider
(`chantiers-ouverts.md` § 11) : sans trace, le retard ne survit pas à l'aller-retour
d'un porteur.

**Constats des audits du 2026-09-09** (`docs/revues/constats-reconciliateur-2026-09-09.md`) :

| Constat | État | Preuve |
|---|---|---|
| Régime établi jamais relancé | clos | dissous par l'ADR-034 (§ 4, lot 5) : « en retard » est une fonction de la date. Le cas qui reste, le référentiel qui change, est le cas a/b ci-dessus |
| Mise en service dépassée au 2e passage | clos | cas g2 : une mise en service de 2015 repassée, la seconde passe n'écrit rien et le statut ne bouge pas |
| Dérive bissextile | clos | `echeance-ordre-calendrier.test.ts` : 29/02 en annuel, 31/03 en trimestriel |
| Écritures aveugles pendant une régénération | clos | cas e ; `actions.ts:269-270` conditionne l'écriture sur la date et le statut lus |

## Maillon 6 — Sorties

**Défaut corrigé.** `surfacesDe` lisait `modeDeclaration` nu. Il attribuait l'écran
« Ce qui doit être en place » à deux titres de salarié que l'écran écarte, et
inscrivait « sans surface » deux titres listés sur l'écran Équipe (`c6293641`).
Épreuve : la règle nue rétablie, le test rougit sur `elec-salarie-habilitation`.

**Marques « à confirmer ».** Portées par le lot 1 sur toutes les surfaces sauf les
bâtiments, inscrits en dette (`docs/dette-chantier-porteur-echeance.md` § 7 ter).
Au tableau de bord, un seul calcul par rendu depuis `4e07e1a2`.

**Décisions.**
- D3 : onze ponctuelles ou événementielles datées de la mise en service, dont deux
  dues seulement après une réparation.
- D4 : les événementielles sont absentes du PDF, du ZIP et du MCP.
- D5 : l'écran du registre nomme le salarié que le PDF anonymise.

## Maillon 7 — Périmètre annoncé

**Vérifié, par une sonde de session** (sortie non commitée : « ANNONCES: 25 /
non_couvert adressés page: 25 doublons: [] »). Les 25 annonces de « Ce que Rojer ne
couvre pas » correspondent exactement aux 25 articles `non_couvert` adressés à la
page. Aucune annonce n'est fausse. Aucun test ne tient cette égalité.

**Décisions.**
- D6 : 15 `obligation_manquante` qui touchent la cible ne sont dites qu'au § 7 de
  `docs/couverture-declaree-du-produit.md`, une clause des mentions légales qui
  n'existe pas encore. Le dirigeant n'en voit aucune.
- D2 (A3) : l'indice d'avancement ignore les indéterminations de couverture ; un
  dossier incomplet obtient 100 « Situation satisfaisante ».
- D1 : les lignes « à confirmer » entrent dans les retards et dans l'indice.

## 7 bis — Obligations manquantes, recherche systématique

**Méthode.** Chaque article `retenu` a été lu en entier par l'API, puis découpé en
prescriptions faites à l'exploitant : 136 articles en G1 (ERP, CCH, IGH,
habitation), 153 en G2 (Code du travail et arrêtés d'équipements et de lieux), 229
en G3 (organisation, personnes, santé). Les motifs `sans_objet` et `hors_perimetre`
ont été relus contre le texte entier, et chaque ligne du guide Qualiconsult qui
touche la cible a reçu un état.

La table complète, avec les suites données à chaque manque, est dans
`docs/revues/audit-bout-en-bout-2026-09-27-annexe-7bis.md`.

**Comptes au relevé.**
- G1 : 141 prescriptions (76 portées, 34 annoncées, 4 écartées sur un motif qui
  tient, 1 écartée sur un motif qui ne tient pas, 26 sans état).
- G3 : 229 articles, découpés en 239 lignes (66 portées, 42 annoncées, 2
  écartées, 116 motifs qui tiennent, 6 fragiles, 3 qui ne tiennent plus, 4 sans
  état).
- G2 ne donne pas de compte global. Il marque S les prescriptions sans état et S°
  celles qu'une politique sœur écrite classerait `sans_objet`.
- La plupart des sans-état de G1 ne touchent pas la cible d'après le texte : livre
  II, hôtels, IGH, habitation (PE 1 § 1). Ils sont classés, pas encodés.

**Corrigés.** Tous ont un texte relu, une politique sœur et un test éprouvé.
- `974b7916` : L. 4141-1 al. 2 (G3).
- `f67f56d5`, six prescriptions (G2) : R. 4227-38 8°, R. 4227-40, arrêté du
  4 novembre 1993 art. 14, C. env. R. 543-79, R. 4544-10 al. 2, arrêté du
  14 décembre 2011 art. 11. Le sujet du commit dit « d'articles retenus » : deux ne
  l'étaient pas avant lui — l'art. 14 était `sans_objet` et passe `retenu`, et
  R. 4227-40 entre au corpus.
- `1f4dee9c`, cinq accessoires d'articles retenus :
  - G1 n° 104, 106, 114 et 115 : CCH R. 134-6 2° d) et dernier alinéa, R. 134-7 I,
    arrêté du 18 novembre 2004 art. 4, arrêté du 7 août 2012 art. 1er ;
  - G2 M7 : arrêté du 20 novembre 2017 art. 6 III.
  La contre-lecture a relevé que ces phrases disaient plus ou moins que le texte ;
  elles sont ramenées au plus près des articles par `205199d3`.
- `9b0f735a` (Qualiconsult et GN 10) : PE 33 et PE 35 citent GN 10 ; l'URL de GN 10
  est corrigée ; l'aide de la catégorie levage ne cite plus d'appareils exclus.
- `8002ff9b` : onze affirmations périmées de `comparaison-guide-qualiconsult.md`,
  sept rayées et quatre annotées, toutes datées ; plus un motif de corpus périmé
  (arrêté du 10 septembre 2021, art. 5).

**Obligation nouvelle, sur une branche à part.** La dotation en extincteurs de
R. 4227-29, portée par l'établissement, est sur `lot/audit-obligations-nouvelles`.
Elle ne passe pas par `incendie-travail-moyens-lutte` : la note de cette obligation
la garde portée par l'équipement.

**Décisions** : D10 à D12 (guide), D16 à D24 (7 bis). D21 est à lire en premier.
Trois obligations de 5ᵉ catégorie que le texte impose (alarme PE 27 § 2, dotation
PE 26 § 1, dégagements PE 11 § 1) ne sont pas codées. La réserve de PE 27 l'interdit
tant que la classe GN 10 n'est pas tranchée : c'est une règle écrite, et ce lot la
respecte.

**Les quatre points ouverts par le lot 1.**
- Champ de la question des matières : D24, garder la question telle quelle ; le
  type 3 de l'alarme est dit (`f67f56d5`).
- Arrêté de 1993, art. 14 : requalifié `retenu` (`f67f56d5`).
- Marque des conditions d'équipement opt-out : D14. Le test écrit pendant l'audit
  suppose l'option B ; il n'est pas commité.
- A3, l'indice qui ignore les indéterminations : D2.

## 8 — GN 10, établissements existants

**Texte** (API, LEGIARTI000021231106, en vigueur depuis le 23 janvier 2010).
- § 1 : le règlement « ne s'applique pas aux établissements existants », sauf les
  dispositions administratives, les contrôles et vérifications techniques, et
  l'entretien.
- § 2 : en cas de travaux, seules les parties modifiées.
- Aucun mot sur un changement d'exploitant ou d'activité, et aucune date de
  l'« existant ».

**Ce que Rojer en fait.** La politique A6 est déjà suivie pour PE 27 : servir à tous
et le dire dans la description, puisque la sur-application est visible par qui la
subit. Elle s'étend à PE 33 et PE 35 (`9b0f735a`) ; le test dérivé exige que tout
état permanent fondé sur un article PE cite GN 10, et il rougit quand on retire la
phrase de PE 33.

Filtrer par une date d'existence serait une lecture qu'aucun texte n'écrit. D13
recommande d'entériner l'option (a).

---

## Ce que ce lot ne dit pas

- La couverture n'est mesurée que contre le guide Qualiconsult et le recadrage de
  la propriétaire, pas contre le Code entier : un chapitre non lu se classe, il ne
  s'encode pas.
- Les fichiers de travail des sous-agents (extractions JSON de l'API, texte du
  guide) sont hors dépôt ; ils se refont.
- G2 ne donne pas de compte global de ses prescriptions.
- Plusieurs chiffres viennent de sondes de session, non commitées : 25 = 25 et les
  15 manques muets (D6), les scores de D2, les 42 conditions et 14 lignes de D14, le
  dossier de production de D1. Ils se refont en appelant le code ; aucun test ne les
  tient.
