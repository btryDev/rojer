# ADR-025 — Ce que Rojer sert, et ce qu'il refuse

- **Statut : tranché en réunion d'équipe le 2026-09-01.** Ce document a été
  rédigé le 2026-08-31 comme un cadrage proposé, non acquis. Il est devenu la
  décision.
- **Portée** : le périmètre du produit, donc l'onboarding, le moteur de
  matching, le module de couverture, et le contenu du référentiel.
- **Remplace ou amende** : ADR-015 (navigation), ADR-019 (bâtiment), ADR-020
  (nommer plutôt que refuser), ADR-035 (prescriptions, ex-014 ; sources), ADR-013 (MCP,
  un seul établissement) ; **rend de nouveau effective** l'ADR-001 sur le
  multi-établissements. Chacune de ces décisions a son ADR propre, listée au
  § 9 : celle-ci porte le périmètre, les autres portent les mécanismes.

## Pourquoi ce document existe

Le référentiel est passé de 85 obligations à 116 en une journée, et de 10
domaines à 17 — 121 obligations au soir du 2026-09-01, les lots du recadrage
ayant continué d'en ajouter. Tant qu'il ne servait que des équipements déclarés, son périmètre
se lisait dans ses catégories d'appareils. Depuis qu'il sert le **statut
d'employeur**, il n'a plus de bord visible : rien, dans le code, ne disait où le
produit s'arrête.

`docs/couverture-declaree-du-produit.md` dit ce que le produit **ne couvre pas**
dossier par dossier. Ce document dit ce qu'il **refuse de couvrir**, toutes
affaires cessantes.

---

## 1. Les régimes servis

**Servi** : Code du travail, ERP, habitation.

**Refusé à la création d'un dossier — deux cas, et deux seulement** (arbitré en
séance le 2026-09-01, après un premier jet beaucoup plus large) :

1. **plus de cinquante travailleurs** — au-delà, les obligations changent de
   nature (CSSCT dédiée, programme annuel présenté au CSE) et le produit ne les
   porte pas ;
2. **un ERP situé dans un immeuble de grande hauteur** — il relève du règlement
   de sécurité des IGH, jamais dépouillé.

**L'IGH seul n'est pas refusé.** Un employeur locataire de bureaux dans une tour
relève du Code du travail, que le produit sert entièrement ; les obligations du
règlement IGH pèsent sur l'exploitant de l'immeuble, pas sur lui.

**Tout le reste se déclare et ne se refuse pas** : ICPE, expositions spécialisées
(ATEX, DRPCE, CEM, CMR, amiante, plomb, radon, rayonnements ionisants), types
d'ERP non instruits (CTS, GA, PS, SG, REF, EF, OA, PA, X). Le critère qui a
prévalu : **on refuse ce qu'on ne peut pas servir, pas ce qu'on ne couvre pas
entièrement.** Une TPE qui manipule un agent CMR reste un employeur ordinaire
pour tout le reste, et lui fermer la porte lui retirerait tout au motif qu'on ne
lui donnerait pas tout.

**Refusé au niveau de l'équipement, sans refuser le dossier** : équipements sous
pression particuliers et équipements frigorifiques sous pression. Les ESP et les
installations frigorifiques **standards** restent servis — six obligations
`equipement-sous-pression.ts` et huit `froid.ts`. Le critère qui sépare les deux
n'est pas encodé aujourd'hui : il est à établir par lecture de l'arrêté du
20 novembre 2017 avant d'écrire la question qui le pose (lot B4 du plan de
recadrage).

### La différence entre refuser et déclarer, et pourquoi elle est nette

Un régime **refusé** ne crée pas de dossier : l'onboarding s'arrête et dit
pourquoi. Un régime **servi partiellement** crée le dossier et le prévient en
permanence, par le mécanisme de l'ADR-020, qui reste en vigueur pour tout ce qui
n'est pas refusé.

Le critère : on refuse ce que le produit ne sait pas servir **du tout** — un
règlement entier qu'il n'a jamais lu, une exposition qu'il ne sait pas détecter.
On déclare ce qu'il sert **incomplètement**, parce que le dirigeant y gagne quand
même quelque chose et qu'il est prévenu de ce qui manque.

### Deux frictions connues, non résolues par cette décision

- **Les neuf obligations qui portent la typologie `igh` restent, et servent.**
  Elles auraient été des lignes mortes si l'IGH avait été refusé en bloc ; le
  refus ne portant que sur le cumul ERP + IGH, elles s'appliquent à l'IGH non-ERP.
  La question de leur retrait est close.
- **Le CMR est partiellement encodé.** `stockage-dangereux.ts` cite `R. 4412-87`.
  Refuser le régime CMR suppose de décider ce que devient cette ligne — à
  trancher après relecture de l'article en première main, pas avant.

**Ce point reste le plus discutable du document.** Refuser l'amiante et le plomb
retire au produit des obligations qu'une TPE du bâtiment rencontre. Le critère
qui les exclut — ce sont des expositions que le produit ne sait pas détecter —
est juste, mais il vaut aussi pour d'autres lignes qu'on garde.

---

## 2. Les catégories d'ERP : toutes servies, et la 5ᵉ seule est couverte à ce jour

**Décision du 2026-09-01, arbitrée deux fois.** Les ERP de 1ʳᵉ à 4ᵉ catégorie
sont **servis**, comme les autres. Aucun dossier n'est refusé sur sa catégorie.

Le motif est un fait de terrain qui tranche le débat : **la catégorie mesure le
public reçu, pas l'effectif salarié.** Un restaurant de huit salariés qui reçoit
~~trois cents couverts relève de la 3ᵉ catégorie~~ peut accueillir quatre cents personnes à la fois relève de la 3ᵉ catégorie. *[Corrigé le 2026-09-26 : R. 143-19 CCH classe « d'après l'effectif du public et du personnel », majore le public du personnel, et met « 300 personnes et au-dessous » en 4ᵉ catégorie ; « trois cents couverts » était faux deux fois. La décision n'en dépend pas.]* C'est exactement la cible du
produit, et le refuser au nom d'un chiffre qui ne parle pas de ses salariés
serait une erreur de lecture du cadrage lui-même. La borne du produit est de
**cinquante salariés** ; elle ne s'applique pas au public reçu.

Une position intermédiaire a été proposée en cours de journée — différer les
catégories 1 à 4 hors du recadrage — et **elle a été écartée** par la
propriétaire. L'argument qui la portait garde sa valeur et devient une contrainte
de rythme plutôt qu'une frontière :

> Couvrir pleinement les catégories 1 à 4 suppose le livre II de l'arrêté du
> 25 juin 1980, par type d'activité, dont **aucun chapitre type-spécifique n'a
> jamais été dépouillé**. Un dépouillement bâclé ne casserait aucun test : il
> produirait un dossier d'apparence complète qui ne l'est pas.

D'où la seconde moitié de la décision, qui n'est pas un compromis mais la règle
de la maison appliquée : **`CATEGORIES_COUVERTES` reste `["N5"]` tant que le
livre II n'est pas lu.** Un ERP de 2ᵉ catégorie ouvre son dossier, reçoit tout
ce que le produit sait faire — calendrier, registre, DUERP, plan d'actions — et
lit en permanence que le règlement propre à sa catégorie n'est pas instruit. La
déclaration tombera d'elle-même quand la lecture sera faite, type par type ;
elle n'a pas à être avancée pour faire joli.

**Ce qui reste réalisable tout de suite** : les obligations par type **au sein de
la 5ᵉ catégorie** — chapitres PO (hôtels) et PU (soins) du livre III, **vingt
articles relevés dans `corpus/arrete-1980-livre-3.ts`, dont quinze `non_couvert`**
(les cinq autres : deux `retenu`, trois `obligation_manquante`). Le mécanisme qui
les portera, `typologies.erp.types`, existe et fonctionne ; il n'a qu'un seul
usage — `elec-erp-o-cat5-annuelle` dans `electricite.ts`, qui porte
`{ erp: { categories: ["N5"], types: ["O"] } }`.

**Le chantier du livre II** commencera par revérifier en première main
`docs/registre-releve-types-erp.md` — relevé du 2026-08-26 qui couvre neuf types
sur dix-neuf et déclare lui-même n'avoir lu aucun article en première main —
puis dépouillera les dix types manquants et les deux arrêtés modificatifs de
2025 (29 juillet et 1ᵉʳ septembre), jamais ouverts.

## 3. Un établissement, une zone à trois subdivisions au plus

Un utilisateur peut tenir **plusieurs établissements** — c'était déjà la cible de
l'ADR-001, refermée en août par deux contraintes d'unicité. Chaque établissement
porte **un seul lieu**, subdivisable en **trois zones** au plus.

Le mot « bâtiment » quitte l'interface. Le modèle `Batiment` reste en base sous
ce nom — il porte déjà exactement ce qu'une zone doit porter : un nom, un
complément d'adresse, des équipements — mais l'utilisateur ne lit plus que
« zone ». Voir l'ADR-029, qui remplace l'ADR-019 en en gardant l'invariant : une
zone est un lieu, elle ne porte aucun régime.

**Cette règle est plus restrictive que le modèle : l'appliquer retire une
capacité.** Le plafond de trois vaut à la création ; les dossiers qui portent
déjà plus de trois bâtiments les gardent.

---

## 4. La catégorie d'ERP est obligatoire — la famille d'habitation ne l'est plus

> ⚠ **AMENDÉ LE 2026-09-03. La seconde moitié de ce paragraphe est renversée :
> la famille d'habitation n'est plus demandée, ni à la création ni à la
> modification.** Le texte d'origine est conservé sous l'amendement, parce qu'il
> raconte pourquoi la question a été posée, et que la raison invoquée s'est
> révélée fausse une fois le texte ouvert — ce qui vaut d'être lu.
>
> **CE QUI CHANGE.** La famille d'habitation (`FamilleHabitation`) ne figure
> plus ni à l'onboarding, ni à la fiche établissement, ni dans les schémas de
> validation. La classe d'IGH (`ClasseIgh`), qui n'était pas nommée dans cette
> ADR mais obéissait à la même règle, est retirée en même temps et pour la même
> raison. Les colonnes et les énumérations restent en base.
>
> **CE QUI LE FONDE.** L'argument ci-dessous — « une obligation d'habitation
> servie sans distinction de famille est probablement fausse pour certaines
> d'entre elles » — était une hypothèse, écrite avant que l'arrêté du 31 janvier
> 1986 n'ait été ouvert. Il l'a été le 2026-09-01, puis complété le 2026-09-03 :
> **aucune** de ses obligations ne dépend de la famille. Son unique obligation
> périodique centrale, l'article 101, vise « le propriétaire » et ne mentionne
> pas les familles ; celles-ci gouvernent la CONSTRUCTION — degrés coupe-feu
> (art. 97), colonnes sèches (art. 98). Mesuré en appelant le moteur : les cinq
> familles et `null` rendent le même jeu d'obligations. Idem pour les dix
> classes d'IGH, dont l'arrêté du 30 décembre 2011 met les vérifications à la
> charge des « propriétaires » sans les moduler par classe (GH 5), et dont
> GH 66 dispose que le classement retient l'usage PRINCIPAL de l'immeuble —
> la classe déclarée d'une tour ne décrit donc pas le plateau qu'on y occupe.
>
> **LA CATÉGORIE D'ERP N'EST PAS TOUCHÉE**, et la dissymétrie est le fond de
> l'affaire : `erp: { categories }` borne réellement des obligations du
> référentiel, `habitation: { familles }` et `igh: { classes }` n'en bornent
> aucune. Une précision de régime se demande parce qu'elle décide, pas parce
> qu'elle complète.
>
> **CE QUI SURVIT DE CE PARAGRAPHE**, mot pour mot : « un dossier ne peut pas se
> créer sans que son régime soit précisé » reste vrai de l'ERP. Le régime IGH et
> le régime habitation, eux, se déclarent désormais par leur seul booléen.

*Texte d'origine, 2026-09-01 :*

Un dossier ne peut pas se créer sans que son régime soit précisé.

`Etablissement.categorieErp` reste **optionnel en base** — la contrainte vit dans
les schémas de création, pas dans la colonne, pour que les dossiers existants qui
ne l'ont pas continuent d'exister. Ils portent en revanche une indétermination
visible, qui demande de compléter.

**La famille d'habitation n'existait pas du tout.** `estHabitation` était un
booléen ; aucun champ ne portait la famille. Or **neuf obligations portent la
typologie habitation** : elles s'appliquaient sans qu'on sache à quelle famille.

Ces neuf sont douze depuis le dépouillement de l'arrêté du 31 janvier 1986 :
les sept obligations d'ascenseur portent désormais la typologie habitation en
plus de la typologie IGH, et trois lignes propres à l'habitation sont entrées.

C'est le point où le code était le plus en retard sur le cadrage, et le seul où
l'écart produisait déjà un risque : une obligation d'habitation servie sans
distinction de famille est probablement fausse pour certaines d'entre elles.
C'est pour cette raison que la famille est le **premier lot** du recadrage, et
que l'arrêté du 31 janvier 1986 — jamais ouvert — est le premier dépouillement.

---

## 5. Trois axes transversaux, et deux entrées qui n'en sont pas

L'application s'organise en trois axes : **santé-sécurité**, **équipement et
bâtiment**, **documentation**.

Le rail en portera **cinq entrées** : les trois axes, plus « À faire » et
« Paramètres ». L'écart à la lettre de la directive est assumé et il a une
raison : les trois axes sont **thématiques**, les deux autres sont
**fonctionnelles**. Le calendrier est l'écran le plus consulté du produit ;
l'enterrer dans un axe thématique le cacherait. Voir l'ADR-030, qui remplace
l'ADR-015.

---

## 6. Le DUERP est limité à cinq unités de travail

Cinq **hors** l'unité « Risques transverses », qui est créée systématiquement et
que l'écran masque déjà. Sans cette précision, les pré-remplissages sectoriels
restauration et bureau — cinq unités chacun — seraient refusés dès la première
étape.

C'est le point le plus simple à implémenter et le plus lourd de conséquences
commerciales : il fixe la taille d'entreprise que le produit accepte de servir.
Cinq postes n'est pas cinq salariés — une TPE de six personnes peut n'avoir que
deux postes, un commerce de trois peut en avoir quatre.

---

## 7. Deux questions à poser, qui n'existaient pas

**Les demandes spécifiques de l'assureur.** Un assureur impose des vérifications
que le droit n'impose pas — c'est fréquent en restauration et en commerce. Elles
entrent par le mécanisme des prescriptions particulières, sous une source
nouvelle, et portent un marquage qui les distingue du droit partout où elles
s'affichent. Voir l'ADR-032, qui amende l'ADR-035.

**Les EPI présents.** La question est posée et la réponse consignée. Ce qu'on en
fait dépend d'une lecture qui n'a jamais été faite : `R. 4323-95` à `-106` et
l'arrêté du 19 mars 1993 ne sont ouverts nulle part dans le dépôt. Si la
vérification périodique est fondée pour les EPI qu'une TPE porte — le harnais,
essentiellement —, une catégorie d'équipement la portera. Sinon la réponse reste
une consignation. **Lire avant d'encoder** : c'est un guide commercial, non une
source, qui a fait croire à une périodicité annuelle générale.

---

## 8. Deux interfaces qui disent ce qui manque

**Dans la documentation** : la liste des documents obligatoires, y compris ceux
que le produit ne produit pas.

**Dans la santé-sécurité** : ce qui est exclu du périmètre, avec des indications.
Cette page distingue **trois statuts**, et la distinction est le fond du sujet :
refusé à l'entrée / servi partiellement et prévenu (les ERP de 1re à 4e
catégorie) / hors périmètre déclaré.

C'est le point où le produit était le plus avancé : le bandeau de périmètre du
calendrier dit déjà ce qui n'est pas couvert, sur six axes au 2026-09-03
(`AxeCouverture` : `igh`, `categorie_erp`, `secteur_duerp`,
`domaine_equipement`, `famille_habitation`, `effectif` — les deux derniers sont
nés du recadrage ; un septième, `public_recu`, a été retiré le 2026-09-03 quand
le moteur a cessé d'écarter les obligations qu'il annonçait), et
`docs/couverture-declaree-du-produit.md` grave ces déclarations, sous la garde
d'un test qui échoue si le document et le corpus divergent.

---

## 9. Les ADR que cette décision déplace

| ADR | Ce qui lui arrive | Portée par |
|---|---|---|
| 001 — établissement | **Redevient effective** : le multi-site était sa cible, refermée en août | ADR-028 |
| 013 — MCP OAuth | Amendée : « la requête ne peut pas rendre deux résultats » tombe | ADR-028 |
| 035 (ex-014) — prescriptions | Amendée : une source contractuelle existe, à côté des actes d'autorité | ADR-032 |
| 015 — rail de navigation | **Remplacée** : cinq entrées deviennent trois axes + deux fonctionnelles | ADR-030 |
| 017 — opérations ponctuelles | Amendée : son entrée de rail « Opérations » disparaît, le permis de feu et le plan de prévention passent sous santé-sécurité. Sa doctrine — ni corrections ni registres — est intacte | ADR-030 |
| 019 — bâtiment lieu | **Remplacée** : la zone prend la place du bâtiment, plafonnée à trois | ADR-029 |
| 020 — couverture déclarée | Amendée : on refuse à l'entrée les régimes exclus, on nomme tout le reste | ADR-031 |

Aucune n'est supprimée : leur motif d'origine reste utile, c'est leur statut qui
change. Chacune porte en tête un renvoi vers celle qui la remplace.

~~**À trancher par la propriétaire** : deux fichiers portent le numéro ADR-014
(`014-prescriptions-particulieres.md` et `014-provenance-navigation.md`). La
collision précède ce recadrage ; elle mérite une renumérotation.~~ **Tranché le
2026-09-15** (`lot/reliquats-donnees-docs`) : la plus récente des deux, celle
des prescriptions (2026-08-25), est renumérotée **ADR-035**
(`035-prescriptions-particulieres.md`) ; la provenance (2026-08-20) garde le 014.

---

## 10. Ce que ce document ne fait pas

Il ne modifie pas `.claude/CLAUDE.md`, qui appartient à sa propriétaire. Les
lignes que ce recadrage rend fausses lui sont signalées, sans être touchées :

| Ligne | Ce qui devient faux |
|---|---|
| 42 | « Registres complémentaires (section « Mes registres » de la sidebar) » — cette section du rail n'existe plus (ADR-030) |
| 71-83 | La section Périmètre dit bien la borne de cinquante salariés, mais ignore le **refus à l'entrée** et ses deux cas (ADR-031) |
| 148 | « Équipement déclaré — **79** obligations livrées » — 80 au 2026-09-01, mesuré en appelant ; la ligne 182 du même fichier dit déjà 80 |
| 158 | « Effectif — seuils 11, **25**, 50 » — aucune obligation du référentiel ne porte de seuil 25 (11, 50, et un plafond à 49) |
| 298 | « IGH, sites industriels ; ATEX, rayonnements ionisants… hors périmètre » — l'**IGH seul est servi** (neuf obligations `igh`), et ATEX comme rayonnements ionisants se déclarent au lieu de se refuser. Seul le cumul ERP + IGH est refusé |
| 299 | La bascule ICPE en couverture partielle **reste vraie** — l'ICPE n'est pas refusée à l'entrée. Rien à corriger ici |
| 310 | « Registres non couverts : … EPI » — reste vrai ; à requalifier seulement si le dépouillement de `R. 4323-95` à `-106` change la donne (§ 7) |
| 330 | « régimes cumulables travail / ERP / IGH / habitation » — vrai encore, mais incomplet : la **famille** d'habitation entre dans le régime habitation, et le cumul **ERP + IGH** est refusé à la création |
| 339-373 | La liste des ADR s'arrête à 027 : **028 à 033 manquent** |
| 353, 355, 357, 360, 351, 339 | Les entrées 015, 017, 019, 020, 013 et 001 ne portent pas leur renvoi (respectivement 030, 030, 029, 031, 028, 028) |
| 367-368 | ADR-025 y figure comme « proposé, non tranché » |
| 397-418 | Toute la section Navigation décrit les cinq entrées de l'ADR-015. En particulier : « Opérations », « Mon établissement » et « Mes registres » n'existent plus ; « Préparer un contrôle » a quitté « À faire » pour « Documentation » ; « Paramètres » ouvre la fiche établissement et non `/connecter` ; et le guide **a retrouvé** une entrée de rail, sous « Documentation » |
| 423-424 | L'onboarding y est décrit sans la famille d'habitation, sans la catégorie d'ERP devenue obligatoire, et sans les deux refus à l'entrée |
| 37, 423-424 | Le DUERP y est décrit sans son plafond de cinq unités de travail |
| — | Rien n'y dit qu'un compte peut tenir **plusieurs établissements** (ADR-028) |

Les numéros de ligne sont ceux du fichier au 2026-09-01, 466 lignes. Ils bougent
au premier ajout : c'est la citation qui identifie le passage, pas le numéro.
