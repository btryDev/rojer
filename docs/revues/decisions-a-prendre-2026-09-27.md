# Décisions à prendre — lot 2, audit de bout en bout (2026-09-27)

Branche `lot/audit-bout-en-bout`, sur `lot/couverture-reponse-absente` (`1cded3d8`, après le rebase du 2026-09-27 sur les corrections de la revue du lot 1).
Tenu pendant l'absence de la propriétaire, sous la règle que la session de
coordination a transmise : ce qu'une règle déjà écrite décide, ou qu'un texte relu
par l'API Légifrance fonde clairement, est tranché et codé ; le reste est consigné
ici — obligation nouvelle de rythme ou de sens nouveau, retrait d'obligation,
changement de ce que voit le dirigeant, lecture qui n'est pas le texte.

Chaque entrée : le texte en cause, les options, une recommandation argumentée, ce
que chaque option change.

---

## ~~D1 — Les lignes « à confirmer » dans l'indice et les retards (ouverte par le lot 1)~~ — fait le 2026-09-28, option (a), `b3dd9a71` et `360a2514`

[2026-09-28, lot 3 `lot/affichage-honnete`, décision de la propriétaire : option (a).
Un prédicat, `retenueParPrudence` (`calendrier/prudence.ts`), dérivé des marques
du dossier (`marquesAConfirmerDuDossier`) ; lu par le compteur du calendrier (barre
latérale, bandeau, tableau de bord), le score, le dossier PDF (bloc « Retenues à
confirmer »), le registre (écran et PDF : « À confirmer »), la fiche de
vérification, le parc, les zones, le MCP (`a_confirmer`), et depuis `2ec8e224` les
barres et l'anneau du tableau de bord. Restent sans la marque,
nommés : la fiche équipement, les tuiles du calendrier et les compteurs de la vue
par équipement (`RegistreLigne` n'a pas d'état « à confirmer »), le filtre « en
retard seulement », le choix de la carte « Prochaine échéance » — D26.]

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

## ~~D2 — L'indice d'avancement ignore les indéterminations de couverture (A3)~~ — fait le 2026-09-28, option (a), `e685afef`

[2026-09-28, lot 3, décision de la propriétaire : option (a). `EntreeScoreConformite`
reçoit la couverture (`couvertureDuDossier`, la même entrée que la page « Ce que
Rojer ne couvre pas ») ; tant qu'une question reste ouverte, « Situation
satisfaisante » devient « Reste à renseigner », au tableau de bord et au dossier PDF.
~~Deux maillons sans test : le builder PDF qui transmet la couverture, le texte du
widget (non monté en test).~~ [2026-09-28, revue indépendante : périmé depuis
`454fb2fa` — `pdf/builders-couverture.test.ts` tient le builder PDF. Un maillon
sans test : le texte du widget (non monté en test).]

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

## ~~D7 — Les vérifications de levage en doublon~~ — fait le 2026-09-28, `215c1671`

[2026-09-28, lot 3, décision de la propriétaire : option (a) — un seul rythme de VGP
par appareil (arrêté du 1er mars 2004, art. 23, relu par l'API, LEGIARTI000006680469).
La lettre de (a) — `infirmee` sur la personne et la force humaine pour l'annuelle —
laissait deux lignes au silence (une `infirmee` est vraie sur une absence) et aurait
privé de VGP un appareil manuel sans levage de personnes : l'annuelle exige
« personnes = non » (`booleenne`), sans condition sur la force humaine ; un chariot
garde sa semestrielle. Au silence, la semestrielle « personnes » reste — la plus
exigeante des deux lignes qu'il faisait naître —, SANS marque « à confirmer » : le
canal des conditions d'équipement n'existe pas (D14). Garde sur les 27 combinaisons
(`matching/levage-un-rythme.test.ts`) ; réconciliateur : l'annuelle retirée qui porte
un rapport ou une action est archivée, sans trace supprimée. Référentiel
`2026-09-28.1`. Lectures de l'art. 23 restées ouvertes : D27.]

[2026-09-28, revue indépendante du lot 3 : la règle ci-dessus était MOINS-DISANTE
contre un texte clair. Art. 23 a) : six mois pour les appareils « listés aux II et III
de l'article 20 » ; art. 20 III (API, LEGIARTI000006680466) : ceux « non conçus
spécialement pour lever des personnes, mus par la force humaine employée
directement ». Un palan manuel recevait l'annuelle. `1f80dd26` : le texte dit six mois
pour l'appareil manuel qui ne lève pas de personnes — obligation nouvelle
`levage-vgp-semestrielle-force-humaine` (le modèle ne combine les conditions qu'en ET,
et « II ou III » est un OU) ; la question « chariot » nomme la liste entière du II ;
au silence, le rythme le plus exigeant qu'une réponse possible donnerait (trois mois
au silence complet). La garde (`levage-un-rythme.test.ts`) tient la règle du texte
(`rythmeDuTexte`), pas une table. Référentiel `2026-09-28.2`, 173 + 1 − 0 = 174 ;
moteur 6 inchangé, non livré.]

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

## ~~D8 — Un ponctuel antérieur au suivi affiche des années de retard~~ — fait le 2026-09-28, `fd4a156f`

[2026-09-28, lot 3, décision de la propriétaire. Le ponctuel OUVERT dont la mise en
service précède l'origine du suivi est daté de l'origine (règle 2 de
`echeance-de-ligne.ts`, limite de la règle 4) ; à l'origine ou après, il garde sa
date et son retard ; le ponctuel soldé n'est pas redaté. Le test « ponctuel ouvert —
mise en service passée » figeait 2015-03-01 (4 228 jours) : il attend l'origine, et
six autres tests qui figeaient la même chose sont amendés, rayés et datés.
`VERSION_MOTEUR_CALENDRIER` 5 → 6 : les dossiers concernés sont réécrits à leur
prochaine ouverture ; le réconciliateur garde l'id et l'action.]

**Constat** (maillon 4). Mise en service 2015, ponctuel : échéance au 2015-03-01, à
planifier, 4 228 jours de retard au 2026-09-27. Le même appareil en rythme
cyclique : 255 jours — la règle 4 écarte ce passé (« annoncer sept ans de
retard… serait inventer »). Le test « ponctuel ouvert — mise en service passée »
affirme le comportement actuel.

**Recommandation.** Appliquer au ponctuel la limite de la règle 4 (dater à
l'origine du suivi). Changement de ce que voit le dirigeant : décision.

## D9 — Le nombre de personnes déclaré sous l'effectif du site

Corrigé côté moteur (`2505c5b2` : on retient le plus grand des deux). **Reste à
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

**Texte** (API, arrêté du 20 novembre 2017, art. 18 I, LEGIARTI000036131133, en
vigueur depuis le 2018-01-01, relu le 2026-09-28) : « Pour les extincteurs soumis à
une pression maximale admissible de plus de 30 bar, la requalification périodique
est réalisée à l'occasion du premier rechargement effectué plus de six ans après la
requalification précédente, sans que le délai entre deux requalifications
périodiques ne puisse excéder dix ans. Les autres extincteurs ne sont pas soumis à
requalification périodique. »

**Constat.** Écartée sans être annoncée : « Le manque est donc un silence »
(`equipement-sous-pression.ts:195`). Un extincteur CO₂ est dans presque toutes les
cuisines de la cible. **Recommandation :** l'annoncer, au moins.

## ~~D12 — Écarts écrits dans une revue et pas dans le code~~ — fait en partie le 2026-09-28 ; le reste est une décision

~~CEM, VLEP, amiante, aires de jeux, systèmes thermodynamiques de plus de 70 kW,
radon (R. 4451-14), rythme annuel RPS, vérifications « sur demande » de l'autorité
(GE 8 § 3, PE 4 § 3, R. 4722-26), évaluation du risque chimique (R. 4412-5 à -10),
eaux sanitaires : leur refus n'est écrit que dans
`docs/revues/comparaison-guide-qualiconsult.md`, pas dans `EXCLUSIONS`
(`corpus/perimetre.ts`) ni au corpus. **Recommandation :** écrire chaque écart au
corpus avec son motif — une ligne de classement, pas un encodage.~~

[2026-09-28, revue indépendante du lot 2 : « du classement interne », à faire dans
le lot. **Fait** (`e193cd31`), chaque article relu par l'API et vérifié (« OK 7 ») :
R. 4722-26 `hors_perimetre` / `sans_destinataire_exploitant` et GE 8 `sans_objet`
(le § 3 sur mise en demeure classé comme l'arrêté du 21 décembre 2004, art. 7) ;
PE 4 § 3 dit dans la réserve de PE 4 ; R. 4412-5, -6, -7, -8, -10 `sans_objet`, comme
R. 4423-1. Eaux sanitaires : aucune obligation dans la ligne du guide
(« conseillé »), et l'eau chaude sanitaire des ERP est déjà au corpus (arrêté du
1er février 2010, `non_couvert`, annoncé) — rien à écrire.

**Reste, et c'est une décision, pas un classement.** CEM, VLEP, amiante, aires de
jeux, systèmes de plus de 70 kW, radon : ce sont des obligations réelles. Elles ne se
rangent qu'en `obligation_manquante`, avec un verdict `toucheLaCible` ; or un « oui »
change la liste du § 7 de `docs/couverture-declaree-du-produit.md`, que la
propriétaire a arrêtée le 2026-09-27 et que `doc-couverture.test.ts` tient égale au
corpus. R. 4412-9 (résultats de l'évaluation chimique communiqués au CSE et au
médecin du travail) est un acte distinct, pas une déclinaison. Le rythme annuel des
RPS vient d'un accord interprofessionnel, pas d'un article réglementaire : le
classer suppose de dire si l'accord étendu s'impose à la cible. **Recommandation :**
dépouiller ces textes, un par un, et soumettre à la propriétaire ceux qui touchent
la cible — même procédure que les quarante-deux du 2026-09-27.]

## D13 — GN 10 : entériner l'option (a) de A6

**Texte** (API, LEGIARTI000021231106, en vigueur depuis le 23 janvier 2010) : § 1,
le règlement « ne s'applique pas aux établissements existants » sauf dispositions
administratives, contrôles et vérifications techniques, entretien ; § 2, travaux :
seules les parties modifiées. Aucun mot sur un changement d'exploitant ou
d'activité ; aucune date de l'« existant ». **Recommandation :** entériner (a) —
servir à tous en le disant (fait pour PE 27, PE 33, PE 35 : `9b0f735a`). Filtrer par
une date serait une lecture qu'aucun texte n'écrit.

## D14 — La marque « à confirmer » des conditions d'équipement opt-out

**Constat.** 42 conditions `non_infirmee` / `infirmee` / `enum_differente` sur 23
obligations ; pour chacun des trois profils cibles, 14 lignes ne sont retenues que
par le silence (2 groupe électrogène, 1 extinction automatique, 5 ESP, 3 levage,
3 froid), sans marque. **Options :** (A) étendre `sansReponse` (grain faux : un
appareil muet marquerait son jumeau) ; (B) un canal équipement —
`proprietesSansReponse` par `equipementId` ; (C) un bandeau de dossier.
**Recommandation : (B)**, sans migration.

## ~~D15 — Le lien inverse corpus → obligation (treize cas)~~ — fait le 2026-09-28

~~**Constat** (maillon 1). Treize obligations citent un article `retenu` qui ne les
nomme pas dans `obligations` ; aucun test ne le voit (`liensRetenusRompus` ne
vérifie que l'autre sens). Certains sont des citations de contraste (GE 4 cité pour
montrer ce qu'il ne couvre pas). **Recommandation :** les rattacher un par un, et
verrouiller le sens inverse par un test — sauf les citations de contraste, qu'il
faut alors marquer comme telles.~~

[2026-09-28, revue indépendante du lot 2 : « du classement interne », à faire dans
le lot. **Fait** (`6f2e3daa`). Les treize sont rattachés : la politique écrite du
corpus nomme, dans la liste d'un article retenu, toute obligation qui le cite, en
fondement comme en contexte (L. 1311-2, R. 4463-3, R. 4227-39, arrêté du 4 novembre
1993 art. 7) — aucune n'est une citation de contraste au sens où il faudrait un
marqueur, la nature de la citation restant dans sa `note`. `renvoisManquants()` et
deux tests dans `corpus.test.ts` ferment le sens inverse ; éprouvé en retirant un
rattachement dans la source.]

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
unique d'évaluation des risques professionnels et sur ses mises à jour ».
L. 4121-3 est DÉJÀ `non_couvert` et annoncé (`code-travail-duerp.ts:141`,
`manques-annonces.ts:181`) — mais au titre d'une autre phrase : l'impact différencié
de l'exposition selon le sexe. C'est l'alinéa sur le CSE (al. 2, 1°) qui n'a ni motif
ni annonce. Cible : 11 à 50 salariés. **Recommandation :** l'écrire dans le motif de
l'entrée existante et dans l'intitulé de son annonce (domaine `document_unique`),
comme une seconde prescription non couverte du même article.

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

## D21 — Trois obligations de 5ᵉ catégorie que le texte impose, retenues par la réserve GN 10

**Textes** (API, arrêté du 25 juin 1980, livre III) :
- **PE 27 § 2** (LEGIARTI000053888118, en vigueur au 2026-05-01) : « Tous les
  établissements sont équipés d'un système d'alarme selon les modalités définies
  ci-dessous : a) L'alarme générale est donnée… par bâtiment… ; b) Le signal
  sonore… audible de tout point du bâtiment… ; c) Le personnel… doit être informé
  de la caractéristique du signal… ; d) Le choix du matériel d'alarme est laissé à
  l'initiative de l'exploitant… ; e) Le système d'alarme doit être maintenu en bon
  état de fonctionnement. » Le moteur, sur un restaurant et un commerce N5 sans
  équipement : aucune ligne d'alarme.
- **PE 26 § 1** (LEGIARTI000024766855) : « Les établissements doivent être dotés
  d'au moins un extincteur portatif… avec un minimum d'un appareil pour 300 mètres
  carrés et un appareil par niveau. » Classé `sans_objet` (« règle de dotation,
  sans récurrence ») — motif contredit par la politique sœur des états permanents.
- **PE 11 § 1** (LEGIARTI000024751142) : « aucun dépôt, aucun matériel, aucun objet
  ne doit faire obstacle à la circulation des personnes ». Classé `sans_objet`
  (« permanente et non datée ») — motif périmé depuis l'ADR-026.

**Pourquoi ce n'est pas codé.** La réserve de PE 27 au corpus
(`arrete-1980-livre-3.ts`) écrit : « N'en pas ajouter un troisième tant que la
propriétaire n'a pas tranché la classe entière (dossier des décisions, A6) » — ces
trois dispositions ne sont ni administratives, ni des contrôles, ni de l'entretien :
GN 10 § 1 les écarte pour un établissement existant. C'est une règle écrite ; ce lot
la respecte.

**Recommandation.** Trancher A6 en (a) (D13), puis encoder les trois en états
permanents d'établissement, N5, avec la mention GN 10 comme PE 27 § 4 et § 5 —
politique sœur : `incendie-travail-alarme-sonore`, `incendie-travail-extincteurs-dotation`
(branche `lot/audit-obligations-nouvelles`). Le même jour, reclasser PE 26 et PE 11
en `retenu` ; PE 27 § 2 c) se replie dans `incendie-erp-5-instruction-personnel`.

## D22 — L'éclairage de sécurité installé (R. 4227-14)

**Texte** : « Les établissements disposent d'un éclairage de sécurité ». Les deux
lignes « travail » ne naissent que d'un `BAES` déclaré : un bureau sans BAES n'a rien.
**Pourquoi ce n'est pas codé** : l'arrêté du 14 décembre 2011 (art. 5, lu hors corpus
par l'audit) dispense certains petits locaux sous trois conditions — une ligne pour
tous sur-appliquerait, et la dispense n'est pas au corpus. **Recommandation** :
dépouiller l'art. 5, puis encoder la dotation (établissement) en disant la dispense —
l'erreur resterait visible pour qui la subit.

## D23 — Corpus : motifs qui ne tiennent plus ou fragiles (7 bis)

À reclasser ou récrire, chacun avec le texte relu par l'API (tables
`docs/revues/audit-bout-en-bout-2026-09-27-annexe-7bis.md`) :
- **PE 18 § 1** (personnel présent pendant le fonctionnement des appareils de
  cuisson en salle) — sœur `elec-erp-presence-personne-qualifiee` ; mais le fait
  « îlot en salle » n'existe pas au modèle.
- **PE 24** (§ 1 fiches multiples interdites ; § 2 éclairage de sécurité
  d'évacuation) — attribut de surface à créer.
- **PE 15 § 7, PE 19, PE 21** : interdictions d'usage, motifs absents ou faux
  (« construction ») — notion nouvelle au référentiel.
- **GZ 13 `toucheLaCible`** : PE 10 B § 2 (en vigueur au 2026-07-01) fait vérifier
  selon GZ 13 les installations de gaz des « autres établissements » que ceux de
  PE 2 § 3 — dire si ces « autres » touchent la cible suppose la lecture de PE 2 § 3.
- **~~PE 4 § 3,~~ GH 5 § 4** (vérifications sur mise en demeure) : réserve au titre de
  l'ADR-035. [2026-09-28 : PE 4 § 3 dit dans la réserve de PE 4, et GE 8 § 3 classé
  (`e193cd31`, D12) ; reste GH 5 § 4, IGH, hors cible.]
- **R. 134-6 2° d)** (remplacement des moyens d'alerte d'ascenseur sur RTC/3G) :
  écarté à tort comme « couvert par le contrat d'entretien » — R. 134-7 I a)
  l'exclut du contrat. Une caractéristique d'ascenseur à créer. [2026-09-28 : le remplacement est DIT dans la description d'`ascenseur-entretien-contrat` (`1f4dee9c`) ; son échéance reste à décider.]
- **Arrêté du 4 novembre 1993, art. 5** (formation à la signalisation) : `retenu` sur
  `formation-securite-etablissement-organisation` ; **R. 4323-97** (conditions
  d'usage des EPI après consultation du CSE) : `obligation_manquante`, à trancher ;
  **R. 4323-95, R. 4321-4** (EPI fournis gratuitement, entretenus) : au moins
  `obligation_manquante` ; **R. 4323-101/-102, R. 4323-104 3° et 4°** : priorité
  faible.
- **Arrêté du 1er décembre 2025** : son `prescrit` omet PE 2, PE 7, PE 9, PE 21 et
  PE 27 § 6, qu'il modifie.

## D24 — La question des matières (point ouvert du lot 1)

R. 4227-22 vise les matières « entreposées ou manipulées » ; R. 4227-34 celles
« manipulées et mises en œuvre ». La question sert R. 4227-34 mot pour mot, son aide
dit que l'entreposage n'est pas suivi, et R. 4227-22 à -25 sont annoncés à tout
employeur quelle que soit la réponse (`manques-annonces.ts`). **Recommandation :
garder la question telle quelle** — l'élargir imposerait alarme, consigne et
exercices à qui ne fait que stocker, contre le texte ; une seconde question
rouvrirait la décision C45. Le type 3 de l'alarme au-delà de 50 personnes quand les
matières sont entreposées est désormais dit dans la description de l'alarme
(`f67f56d5`).

## D25 — Merger `lot/audit-obligations-nouvelles` ? (la dotation en extincteurs, R. 4227-29)

**Ce que fait la branche.** Elle crée `incendie-travail-extincteurs-dotation`, état
permanent porté par l'établissement, servi à TOUT employeur (`typologies: { travail:
true }`). Référentiel `2026-09-27.2`, 172 + 1 = 173. C'est une obligation nouvelle
et un changement de ce que voit le dirigeant — à la propriétaire, comme D16 et D22.

**Pourquoi elle diffère de D16 et D22.** R. 4227-29 est déjà `retenu` au corpus
(`code-travail-incendie.ts`), sans seuil ni dispense : « Le premier secours contre
l'incendie est assuré par des extincteurs en nombre suffisant et maintenus en bon
état de fonctionnement. Il existe au moins un extincteur portatif à eau pulvérisée
d'une capacité minimale de 6 litres pour 200 mètres carrés de plancher. Il existe au
moins un appareil par niveau. » (API, LEGIARTI000018532079). Rien à dépouiller
d'abord, à la différence de R. 4228-19 (D16) et de l'arrêté du 14 décembre 2011
art. 5 (D22) ; rien qui sur-applique : le texte ne connaît aucun employeur sans
extincteur.

**Le doublon qu'elle crée** (relevé par la revue indépendante). La ligne d'appareil
`incendie-travail-moyens-lutte` (`incendie.ts:202-206`) garde le libellé
« Présence et maintien en état… » et la description « doivent être dotés… » : un
établissement de N extincteurs voit N lignes « présence » ET la ligne « dotation ».
La garde anti-doublon ne le voit pas — les deux lignes n'ont pas le même premier
fondement (R. 4227-28 contre R. 4227-29).

**Options.**
- **(a)** Réduire la ligne d'appareil au maintien en état : libellé, description,
  test. Codé sur cette branche, en commit séparé, pour suivre le sort de D25. Le
  libellé entre dans `empreinteReferentiel` : version `2026-09-27.3`, régénération
  de chaque dossier à sa prochaine ouverture — mais les deux obligations sont des
  états permanents, que le générateur saute : aucune ligne de calendrier n'est
  écrite, seul le sceau change. L'écran « Ce qui doit être en place » lit le libellé
  au rendu ; les déclarations (`DeclarationEtatPermanent`) sont rangées par
  `obligationId`, pas par libellé.
- **(b)** Garder les deux libellés tels quels.

**Recommandation : merger, avec (a).** Sans la branche, un employeur qui n'a déclaré
aucun extincteur ne reçoit rien de R. 4227-29 ; avec elle mais sans (a), il lit la
dotation deux fois.

## D26 — Les lecteurs de retard que D1 n'atteint pas encore

**Constat** (lot 3). Une ligne retenue par prudence sort des retards et de l'indice,
mais des lecteurs la peignent encore comme un retard ou peuvent la choisir
(liste complétée le 2026-09-28 par la contre-lecture neutre — la première en
nommait quatre) :
la fiche équipement (`equipements/fiche.ts`, aucune marque reçue) ; les tuiles du
calendrier et les compteurs de sa vue par équipement (`RegistreLigne` n'a pas
d'état « à confirmer ») ; le filtre « en retard seulement » (`urgenceSeule`, une
clause SQL — la ligne y reste, marquée) ; le choix de la carte « Prochaine
échéance » (`prochaineEcheanceConnue` ; `prochaineDate` n'est lu par aucun
composant aujourd'hui) ; au calendrier encore, la règle annuelle
(`regle-annee.ts`, « dont N en retard »), l'en-tête rouge de chaque mois
(`nbEnRetard`, `calendrier/page.tsx`) et le mois déplié à l'arrivée (le premier
mois qui a un retard) — tous lisent `registre === "enRetard"`, comme les tuiles. **Options :** (a) un état « à confirmer »
dans `RegistreLigne` et la fiche équipement, la prudence dans le choix de la carte ;
(b) les laisser, nommés. **Recommandation : (a)** pour la fiche et les tuiles —
c'est la même affirmation « en retard » que D1 a retirée ailleurs ; le filtre peut
rester, la ligne y étant marquée.

## D27 — Levage : les lectures de l'art. 23 que D7 n'a pas tranchées

**Texte** (API, arrêté du 1er mars 2004, art. 23, LEGIARTI000006680469) : douze mois ;
« toutefois » six mois (a) ou trois mois (b). ~~Relevé par le lot 3, laissé tel quel :~~
[2026-09-28, revue indépendante du lot 3 : trois des quatre points étaient tranchés par
le texte, et sont corrigés par `1f80dd26` — voir D7.]
- ~~l'art. 23 a) vise aussi les appareils « listés au III de l'article 20 » — manuels,
  non conçus pour lever des personnes : lu ainsi, force humaine « oui » et personnes
  « non » donneraient six mois, pas les douze du référentiel ;~~ [le texte dit six
  mois (art. 20 III, LEGIARTI000006680466) : `levage-vgp-semestrielle-force-humaine`]
- ~~chariot « oui », personnes « oui », force humaine « oui » donnent six mois (le
  chariot l'emporte) quand le b) en donnerait trois ;~~ [trois mois désormais]
- ~~au silence sur la force humaine ou le chariot, le rythme retenu n'est pas le plus
  exigeant possible (trois ou six mois le seraient) ;~~ [le silence retient le rythme
  le plus exigeant qu'une réponse possible donnerait ; au silence complet, trois mois]
- `levage-examen-etat-conservation` reste annuelle et sans condition EN PLUS de
  chaque VGP, alors que l'art. 22-II fait de l'examen une partie de la VGP : un
  chariot porte une VGP semestrielle et un examen annuel — le doublon de D7, sur une
  autre ligne.

**Restent ouverts** (2026-09-28) :
- **Transport de personnes sans poste de travail.** Une seule propriété
  (`sertAuLevageDePersonnes`) couvre le transport de personnes ET l'élévation d'un
  poste de travail. Le b) ne vise que le poste : un appareil MANUEL qui transporte des
  personnes sans élever de poste reçoit la trimestrielle, là où le texte dirait six mois
  (a, III) ou douze. Sur-application, visible par qui la subit.
- **Un appareil du II, manuel, qui élève un poste de travail.** Deux dérogations
  s'appliquent (six mois par le II, trois par le b) ; la plus courte est retenue, qui
  les satisfait toutes deux. Le texte ne dit pas laquelle prime.
- L'examen de l'état de conservation, ci-dessus.

**Recommandation :** scinder `sertAuLevageDePersonnes` en « transport de personnes » et
« élévation d'un poste de travail » (le texte les distingue) ; relire l'art. 22 par
l'API pour l'examen. Chacun change un rythme en service.
