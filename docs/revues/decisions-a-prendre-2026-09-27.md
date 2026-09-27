# Décisions à prendre — lot 2, audit de bout en bout (2026-09-27)

Branche `lot/audit-bout-en-bout`, sur `lot/couverture-reponse-absente` (`285e084`).
Tenu pendant l'absence de la propriétaire, sous la règle que la session de
coordination a transmise : ce qu'une règle déjà écrite décide, ou qu'un texte relu
par l'API Légifrance fonde clairement, est tranché et codé ; le reste est consigné
ici — obligation nouvelle de rythme ou de sens nouveau, retrait d'obligation,
changement de ce que voit le dirigeant, lecture qui n'est pas le texte.

Chaque entrée : le texte en cause, les options, une recommandation argumentée, ce
que chaque option change.

---

## D1 — Les lignes « à confirmer » dans l'indice et les retards (ouverte par le lot 1)

**Constat** (contre-lecture du lot 1). Avec `VERSION_MOTEUR_CALENDRIER` à 5, un
établissement de travail de moins de cinquante et une personnes, muet sur les
matières de R. 4227-22, reçoit la ligne semestrielle
`incendie-travail-exercice-semestriel` sans rapport. `calendrier/etats.ts:559-560`
la tient « en retard » ; `dashboard/score.ts:179-200` la compte dans l'indice sans
lire la marque ; le dossier PDF l'imprime « en retard » à côté de « À confirmer ».
Un dossier concerné en production au comptage du 2026-09-27.

**Options.**
- **(a)** Une ligne que seul le silence de la fiche retient n'entre ni dans les
  retards ni dans l'indice : elle s'affiche, marquée, sans pénaliser. Change :
  l'indice et le compteur de retards de ces dossiers ; le PDF n'imprime plus
  « en retard » sur elle.
- **(b)** Accepter : la ligne est traitée comme toute ligne due. Ne change rien.

**Recommandation : (a).** La règle du non-renseigné veut que la ligne SOIT affichée
— pas qu'elle soit comptée comme un manquement. L'erreur « en retard » sur une
obligation que le dirigeant ne doit peut-être pas est une affirmation qu'aucun texte
ne fonde, dans un document remis à un tiers. (a) garde la couverture et retire
l'affirmation. Un lot court : un prédicat « retenue par prudence », lu par le
compteur de retards et le score.

---

## D2 — L'indice d'avancement ignore les indéterminations de couverture (A3)

**Constat, par appel** (maillon 7). Même restaurant, tout à jour, tout déclaré en
place : catégorie N5 → 45 applicables, 0 indétermination, score 100 « Situation
satisfaisante » ; sans catégorie → 42 applicables, 1 indétermination
(`categorie_erp`), score 100 « Situation satisfaisante ». `EntreeScoreConformite`
n'a aucun champ de couverture ; le tableau de bord n'appelle pas `couverture*`.
(La contrainte CHECK du lot 1 rend l'indétermination `categorie_erp` impossible
pour un dossier neuf ; d'autres axes subsistent.)

**Options.** (a) L'entrée du score reçoit les indéterminations ; « satisfaisante »
devient « Reste à renseigner » tant qu'il en reste — même mécanisme que l'écran
« en place ». (b) Le bandeau de couverture au tableau de bord, score inchangé. (c)
Les deux.

**Recommandation : (a).** Une note de 100 sur un dossier incomplet est
l'affirmation la plus lue du produit.

## D3 — Onze obligations ponctuelles ou événementielles datées de la mise en service

**Constat** (maillon 6). Six ponctuelles et cinq événementielles portent
`mise_en_service_uniquement` et naissent au calendrier pour chaque appareil. Pour
`esp-intervention-reparation` et `levage-remise-en-service-apres-reparation`, le
texte ne rend l'acte dû qu'après une réparation ou une intervention notable ;
leurs `notesInternes` disent « pis-aller, à affiner étape 12 ».

**Options.** (a) Garder le pis-aller. (b) Basculer les deux « après réparation »
vers la fiche équipement (nature événementielle, périodicité `autre`, surface
« Quand ça arrive » / fiche), comme `ADR-037` le fait pour les autres faits.

**Recommandation : (b)** pour ces deux-là : une échéance datée d'un acte qui n'est
dû qu'après un fait est une affirmation fausse. Les neuf autres, à relire une par
une dans le même lot.

## D4 — Les événementielles absentes des exports

**Constat** (maillon 6). Le dossier PDF, le ZIP et le MCP ne contiennent ni les 16
obligations événementielles (13 « Quand ça arrive », 1 fiche équipement, 2 fiche
salarié), ni l'unique obligation sans surface ; le MCP ne rend pas non plus les 56
lignes de l'écran « en place ». L'ADR-037 ne traite pas les exports.

**Options.** (a) Une section « Ce qu'un fait rend dû » dans le dossier PDF (donc
le ZIP), et un outil MCP en lecture. (b) Rien.

**Recommandation : (a)**, section courte : le document remis à un inspecteur doit
pouvoir montrer qu'on connaît ses obligations de fait.

## D5 — Le registre et les lignes des salariés

**Constat** (maillon 6). Le registre PDF imprime les lignes salarié « en attente »,
anonymisées « Un salarié » ; l'écran du registre liste les rapports avec
`libellePorteur`, qui NOMME la personne (`registre/page.tsx:400`).

**À décider.** Les titres et visites des salariés relèvent-ils du registre de
sécurité ? Et l'écran doit-il anonymiser comme le PDF ?

**Recommandation.** Anonymiser l'écran comme le PDF (rien ne justifie la
différence) ; la question du périmètre du registre est à trancher avec les textes
qui le fondent (L. 4711-1 à -5).

## D6 — Quinze manques cibles muets tant que la clause des mentions légales n'existe pas

**Constat** (maillon 7). Les 25 annonces de la page « Ce que Rojer ne couvre pas »
correspondent exactement aux 25 articles `non_couvert` adressés à la page ; aucune
annonce fausse. Mais les 15 `obligation_manquante` qui touchent la cible ne sont
cités qu'au § 7 de `docs/couverture-declaree-du-produit.md`, « clause générale des
mentions légales (à rédiger) ». Tant qu'elle n'existe pas, le dirigeant n'en voit
aucun.

**Recommandation.** Rédiger la clause (chantier « mentions légales et cadre »,
déjà ouvert), ou, d'ici là, les porter sur la page de non-couverture.

## D7 — Les vérifications de levage en doublon

**Constat** (maillon 3). `levage-vgp-annuelle-charges` n'exclut que
`estChariotOuGerbeur` (`levage.ts:181`). Sans aucune réponse : annuelle +
semestrielle « personnes » ; force humaine « oui » : annuelle + trimestrielle ;
chariot « oui » et personnes non renseigné : deux semestrielles. L'arrêté du
1er mars 2004, art. 23 : « douze mois. Toutefois, cette périodicité est de : a)
Six mois… b) Trois mois… » — un seul rythme par appareil ; le commentaire
d'`engine.test.ts` (~l. 1016) l'écrit lui-même.

**Options.** (a) Ajouter à l'annuelle des conditions `infirmee` sur
`sertAuLevageDePersonnes` et `estMuParForceHumaine`, et partitionner chariot /
personnes ; au silence, la ligne la plus exigeante reste. (b) Garder le doublon,
corriger le commentaire.

**Recommandation : (a).** C'est un changement de rythme sur des lignes en service
— d'où la décision : il retire une ligne à des appareils qui en portent deux.

## D8 — Un ponctuel antérieur au suivi affiche des années de retard

**Constat** (maillon 4). Mise en service 2015, ponctuel : échéance au 2015-03-01, à
planifier, 4 228 jours de retard au 2026-09-27. Le même appareil en rythme
cyclique : 255 jours — la règle 4 écarte ce passé (« annoncer sept ans de
retard… serait inventer »). Le test « ponctuel ouvert — mise en service passée »
affirme le comportement actuel.

**Recommandation.** Appliquer au ponctuel la limite de la règle 4 (dater à
l'origine du suivi). Changement de ce que voit le dirigeant : décision.

## D9 — Le nombre de personnes déclaré sous l'effectif du site

Corrigé côté moteur (`c70a069` : on retient le plus grand des deux). **Reste à
décider** : la fiche doit-elle refuser un nombre déclaré inférieur à l'effectif
du site ? Recommandation : un avertissement, pas un refus — le moteur est déjà
juste.

## D10 — La vérification annuelle des ascenseurs et monte-charges par l'employeur

**Constat** (guide Qualiconsult). Le guide la fonde sur R. 4323-23 et l'arrêté du
29 décembre 2010, absent du dépôt. Lu par l'API (LEGITEXT000023448205) : l'article
1 vise ascenseurs, monte-charges et élévateurs installés à demeure dans un lieu de
travail ; l'article 6 : « a lieu tous les douze mois. Les ascenseurs sont dispensés
de cette vérification l'année au cours de laquelle s'effectue le contrôle
technique ». Les obligations `ascenseur-*` relèvent du CCH (entretien et contrôle
quinquennal du propriétaire), pas de cette vérification due par l'employeur.

**Recommandation.** Dépouiller l'arrêté et l'encoder (obligation nouvelle de
rythme : décision) — c'est le seul manque du guide qui touche la cible sur un
texte en vigueur. Il faudra dire comment porter la dispense l'année du contrôle
technique.

## D11 — La requalification des extincteurs CO₂ (plus de 30 bar)

**Constat.** Écartée sans être annoncée : « Le manque est donc un silence »
(`equipement-sous-pression.ts:195`). Un extincteur CO₂ est dans presque toutes les
cuisines de la cible. **Recommandation :** l'annoncer, au moins.

## D12 — Écarts écrits dans une revue et pas dans le code

CEM, VLEP, amiante, aires de jeux, systèmes thermodynamiques de plus de 70 kW,
radon (R. 4451-14), rythme annuel RPS, vérifications « sur demande » de l'autorité
(GE 8 § 3, PE 4 § 3, R. 4722-26), évaluation du risque chimique (R. 4412-5 à -10),
eaux sanitaires : leur refus n'est écrit que dans
`docs/revues/comparaison-guide-qualiconsult.md`, pas dans `EXCLUSIONS`
(`corpus/perimetre.ts`) ni au corpus. **Recommandation :** écrire chaque écart au
corpus avec son motif — une ligne de classement, pas un encodage.

## D13 — GN 10 : entériner l'option (a) de A6

**Texte** (API, LEGIARTI000021231106, en vigueur depuis le 23 janvier 2010) : § 1,
le règlement « ne s'applique pas aux établissements existants » sauf dispositions
administratives, contrôles et vérifications techniques, entretien ; § 2, travaux :
seules les parties modifiées. Aucun mot sur un changement d'exploitant ou
d'activité ; aucune date de l'« existant ». **Recommandation :** entériner (a) —
servir à tous en le disant (fait pour PE 27, PE 33, PE 35 : `56c35fc`). Filtrer par
une date serait une lecture qu'aucun texte n'écrit.

## D14 — La marque « à confirmer » des conditions d'équipement opt-out

**Constat.** 42 conditions `non_infirmee` / `infirmee` / `enum_differente` sur 23
obligations ; pour chacun des trois profils cibles, 14 lignes ne sont retenues que
par le silence (2 groupe électrogène, 1 extinction automatique, 5 ESP, 3 levage,
3 froid), sans marque. **Options :** (A) étendre `sansReponse` (grain faux : un
appareil muet marquerait son jumeau) ; (B) un canal équipement —
`proprietesSansReponse` par `equipementId` ; (C) un bandeau de dossier.
**Recommandation : (B)**, sans migration.

## D15 — Le lien inverse corpus → obligation (treize cas)

**Constat** (maillon 1). Treize obligations citent un article `retenu` qui ne les
nomme pas dans `obligations` ; aucun test ne le voit (`liensRetenusRompus` ne
vérifie que l'autre sens). Certains sont des citations de contraste (GE 4 cité pour
montrer ce qu'il ne couvre pas). **Recommandation :** les rattacher un par un, et
verrouiller le sens inverse par un test — sauf les citations de contraste, qu'il
faut alors marquer comme telles.

## D16 — R. 4228-19 : l'interdiction de prendre ses repas dans les locaux de travail

**Texte** (API) : « Il est interdit de laisser les travailleurs prendre leur repas
dans les locaux affectés au travail. » Non dépouillé ; R. 4228-23 al. 3 (retenu)
en porte la dérogation. Touche la cible (repas en cuisine, en réserve, au
comptoir). **Options :** un état permanent d'établissement propre (sens nouveau :
décision) ; ou une référence de contexte sur l'emplacement de restauration — mais
l'interdiction vaut aussi au-delà de cinquante. **Recommandation :** état permanent
propre, pour tout employeur.

## D17 — L. 4121-3 : le CSE consulté sur le document unique

**Texte** (API) : « Le comité social et économique est consulté sur le document
unique d'évaluation des risques professionnels et sur ses mises à jour ». Ni motif
ni annonce. Cible : 11 à 50 salariés. **Recommandation :** écrire l'écart au corpus
(politique sœur EPI) et l'annoncer dans le domaine `document_unique`.

## D18 — R. 4512-3 et R. 4512-4 (plan de prévention)

Classés `sans_objet` ; ils créent pourtant des démarches (délimiter le secteur,
matérialiser les zones, communiquer ses consignes à l'entreprise extérieure) que
Rojer n'accomplit pas — l'argument qui a fait reclasser R. 4512-12. **Recommandation
:** `non_couvert`, annoncé sur la fiche du plan de prévention.

## D19 — Échelles et escabeaux (R. 4323-81 à -88)

Motif « sans échéance » fragile : la politique sœur encode des états sans date.
**Recommandation :** étendre la phrase d'annonce du domaine `travail_en_hauteur`.

## D20 — Deux reclassements hors cible

D. 4622-2 al. 2 (service autonome, seuil de 500 salariés par D. 4622-5) : une
réserve « hors cible ». R. 4451-57 (classement des travailleurs exposés aux
rayonnements) : un acte, pas une définition ; son motif récent (audit E8) est
argumenté — à confirmer ou reclasser.
