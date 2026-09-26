# Instruction des quatre sujets « D » — 2026-09-26

Brief : session `rojer-missing-items-plan`, section D de
`docs/revues/decisions-en-attente-2026-09-20.md`. Lecture et rapport, aucun
code touché. Base : `main` local `48129b9`, référentiel `2026-09-21.1`,
159 obligations (valeurs rendues par un appel au code, pas relevées au grep).

**Rien ici n'est décidé.** Chaque sujet suit le même plan : (a) le code,
(b) le texte, (c) l'écart et qui le subit, (d) les options, avec une
recommandation.

**Méthode.** Textes : WebFetch sur la page propre de l'article. Première requête
en aveugle (« combien de paragraphes, quel est le dernier »), puis requêtes
ciblées. Chaque formulation décisive a été confirmée par une seconde requête.
Chiffres : mesurés en appelant `determineObligationsApplicables` et
`genererProchainesVerifications` dans un worktree à part
(`revue/sujets-d`, script jetable, non commité).

**À reverser par qui tient le référentiel** (AGENTS.md, règle 2 — le brief
m'interdit `src/lib/referentiels/`) : le verbatim de `PE 20 § 2`, qui n'a pas de
`citationCle` au corpus (`arrete-1980-livre-3.ts:248`), et la liste complète de
`PE 4 § 2`, que la `citationCle` du corpus tronque (`:79`). Les deux sont
relevés au sujet 1.

---

## 1. La scission `CH 57` / `CH 58`

### (a) Le code

`aeration-erp-chauffage-ventilation-annuelle`
(`src/lib/referentiels/conformite/aeration.ts:297`) :

- une ligne `annuelle`, `personne_qualifiee` ;
- fondement `CH 58 § 2`, contexte `CH 57` ;
- `typologies: { erp: true }` (`:329`), sans borne de catégorie ;
- `categoriesEquipement: ["VMC", "CTA"]` (`:330`).

La scission est argumentée dans ses `notesInternes` et proposée depuis le
2026-09-01 (corpus `arrete-1980-livre-2.ts:33`, réserve de `CH 57`). La
question posée jusqu'ici est : faut-il une ligne « ramonage » à côté de la
ligne « vérification » ?

Mesuré en appelant le moteur, avec une VMC déclarée :

| Établissement | Ligne `CH 58` annuelle | `PE 4` triennale |
|---|---|---|
| Restaurant N5 | **oui** | oui |
| Restaurant N3 | oui | non |

Les catégories d'équipement du référentiel ne comptent **aucun appareil à
combustion, aucune chaudière, aucun conduit de fumée**. Liste lue dans
`CATEGORIES_EQUIPEMENT` : 23 valeurs, dont `VMC`, `CTA` et `HOTTE_PRO`.

### (b) Le texte

Lu le 2026-09-26, page propre de chaque article.

- **`PE 1 § 1`** (en vigueur depuis le 27/08/1990), deux requêtes :
  « Les dispositions du livre II ne sont pas applicables sauf celles relevant
  d'articles expressément mentionnés dans la suite du présent livre. »
- **`PE 20`** (en vigueur depuis le 22/05/2004), deux paragraphes, deux
  requêtes. § 2 : « Toutefois, les installations autorisées dans les
  établissements de 4e catégorie sont également autorisées dans les
  établissements de 5e catégorie du même type. Dans ce cas, leur mise en
  œuvre devra être réalisée dans les conditions définies au livre II, titre
  Ier, chapitre V. » Les mots « entretien », « vérification(s) » et
  « ramonage » n'y figurent pas.
- **`PE 4 § 2`** (en vigueur depuis le 01/07/2026), trois paragraphes, deux
  requêtes : « Tous les trois ans au plus, l'exploitant doit procéder, ou faire
  procéder, par des techniciens compétents, aux opérations d'entretien et de
  vérification des installations et des équipements techniques de son
  établissement (chauffage, éclairage, installations électriques,
  installations de gaz, appareils de cuisson, circuits d'extraction […],
  ascenseurs, moyens de secours, etc.). » Le mot « ramonage » n'y figure pas.
- **`CH 57` et `CH 58`** : non relus. Leur verbatim est au corpus
  (`agent_verbatim`, 2026-09-01), et la question ne porte pas sur leur contenu.

### (c) L'écart

**La scission est la seconde question. La première est la portée.**

1. **En 5ᵉ catégorie, la cible couverte, `CH 57` et `CH 58` ne s'appliquent
   pas au titre du règlement ERP**, à moins que `PE 20 § 2` compte comme un
   « article expressément mentionné ». Il renvoie à un chapitre, pas à des
   articles, et pour la « mise en œuvre » des installations, pas pour leur
   entretien ou leur vérification. C'est une lecture, et je la signale comme
   telle : je ne tranche pas.
   - Pour un N5, l'entretien et la vérification du chauffage relèvent de
     `PE 4 § 2`, **triennal**, qui nomme le chauffage. Le produit le sert déjà.
   - Il sert en plus une **annuelle** fondée sur `CH 58`. C'est une
     sur-application : un N5 muni d'une VMC reçoit deux rythmes pour le même
     objet.
   - Le corpus du Livre II annonce que « la sur-application est documentée
     obligation par obligation » (`portee`). Pour cette ligne, elle ne l'est
     pas : ni ses `notesInternes` ni le journal (§ 4, « Sur-couvertures
     possibles ») n'en parlent.
2. **Le ramonage n'a pas de déclencheur possible.** `CH 57` vise « les conduits
   de fumée, les cheminées et tous les appareils ». Une VMC ou une CTA n'ont
   pas de conduit de fumée, et aucune catégorie ne dit « appareil à
   combustion ». Une ligne « ramonage » née de la scission se déclencherait
   donc sur les mauvais appareils, ou supposerait une catégorie neuve. La
   catégorie est un enum Prisma (`schema.prisma:509`), donc la catégorie neuve
   demande une migration additive, sur le patron de
   `20260902120000_categorie_compacteur_presse_dechets`.
3. **Le motif de `PE 31` au corpus est inexact.** Il écrit « le ramonage, lui,
   est dû ailleurs et le référentiel le porte »
   (`arrete-1980-livre-3.ts:366`). Le seul endroit où le référentiel le
   « porte » est la ligne ci-dessus, dont la `note` dit elle-même que le
   ramonage « n'est PAS l'acte que cette obligation planifie ».
4. Détail périmé : le point (4) des `notesInternes` chiffre la scission à
   « une obligation de plus (117) ». Le référentiel en compte 159.

**Qui subit l'écart.**

- Le dirigeant d'un N5 muni d'une VMC ou d'une CTA voit un rendez-vous annuel
  de technicien que le règlement ERP ne lui impose pas en 5ᵉ catégorie. C'est
  visible, et il peut le contester. Il paie peut-être une visite de trop.
- Le dirigeant d'un N1–N4 qui a une chaudière voit une ligne qui a l'air de
  couvrir le ramonage et ne le couvre pas. Personne ne s'en aperçoit : c'est
  l'argument (3) des `notesInternes`, et il tient.

Autres fondements possibles du ramonage (règlement sanitaire départemental,
autres codes) : **non ouverts**. Je n'en cite aucun.

### (d) Options

| | Option | Effet |
|---|---|---|
| A | Statu quo | Deux défauts restent : la sur-application en N5, que rien ne documente, et un ramonage qui n'existe que dans une note. |
| B | Scission telle que proposée (ramonage `CH 57` et vérification `CH 58`, deux lignes) | Ne résout rien sans une catégorie « appareil à combustion ». Sans elle, le ramonage naît sur des VMC. |
| C | **Borner la ligne `CH 58` aux catégories N1 à N4** (`erp: { categories: [...] }`, déjà utilisé par `CH 39 § 3` et `MS 69`), et laisser `PE 4 § 2` servir le N5 | Retire une ligne annuelle à chaque N5 équipé d'une VMC ou d'une CTA. C'est un retrait, donc silencieux, mais la ligne triennale qui reste nomme le chauffage. |
| D | C, puis la scission **en N1–N4 seulement**, avec une catégorie « appareil de chauffage à combustion » (migration additive) | La seule forme de la scission qui déclenche le ramonage là où le texte le vise. |

**Recommandation : trancher d'abord la lecture de `PE 20 § 2`, ensuite
seulement la scission.**

- **Si `PE 20 § 2` n'est pas un renvoi exprès pour l'entretien**, la
  recommandation est **C**. La règle « l'erreur visible par qui la subit »
  pousse d'ordinaire à garder la sur-application. Ici, elle joue moins fort :
  le N5 garde une ligne sur le même objet (`PE 4 § 2`, triennale, qui nomme le
  chauffage), donc il ne perd pas toute trace. À faire avec un contre-relecteur
  (retrait sur toute la cible).
- **D ensuite, sans urgence.** Il ne touche que les catégories 1 à 4, hors de
  la cible couverte (A1 du dossier du 20).
- **B seul est à écarter.**
- Dans tous les cas, **corriger le motif de `PE 31`**, qui affirme une
  couverture qui n'existe pas.

À savoir pour le sujet 3 : une scission par `succedeA` ne met pas en jeu la
règle « la plus ancienne », car il n'y a qu'un prédécesseur. En revanche, la
ligne qui adopte la rangée existante garde la réalisation de celle-ci.
Garder l'id actuel pour la vérification `CH 58` et créer le ramonage **sans**
`succedeA` fait naître le ramonage « à planifier ». On évite ainsi de le dater
d'une visite de CTA.

---

## 2. La divergence sur `R. 146-35` CCH entre les deux PDF

### (a) Le code

- `src/lib/pdf/DossierConformiteDocument.tsx:621` imprime, en dur, pour tout
  établissement : « Registre de sécurité : R. 4323-25 et R. 4323-26 CT,
  R. 143-44 CCH (ERP), R. 146-35 CCH (IGH). »
- `src/lib/pdf/RegistreDocument.tsx:730` imprime, en dur : « Tenue du registre
  (R. 143-44 CCH · R. 4323-25 et R. 4323-26 CT) ». Le commentaire `:695–726`
  dit pourquoi `R. 146-35` en est sorti et renvoie la divergence à la
  propriétaire.
- Aucun des deux blocs ne lit le régime de l'établissement. Pourtant le dossier
  le connaît (`regimesTexte`, `:31`). Un bureau hors ERP lit donc
  « R. 143-44 CCH » dans les deux PDF.
- La même référence est portée « pour information » par
  `incendie-registre-securite` (`conformite/incendie.ts:418`), donc par la
  fiche de cette obligation chez tout employeur. C'est hors de ma zone (je ne
  touche pas au référentiel), je le note seulement.

Mesuré en appelant le référentiel :

- **onze** obligations portent la typologie `igh` ;
- une seule, `incendie-igh-charge-calorifique-quinquennale`, est portée par
  l'établissement ;
- huit sont des obligations d'ascenseur.

Le commentaire du registre dit « le produit ne porte du régime IGH que deux
obligations » : ce chiffre ne correspond pas à ce que rend le code.

### (b) Le texte

`R. 146-35` CCH, page propre, lu le 2026-09-26, en vigueur au 01/07/2026. Deux
phrases d'introduction et six items. Première phrase confirmée par une seconde
requête : « Il doit être tenu, **par le propriétaire**, un registre de sécurité
sur lequel sont portés les renseignements indispensables au contrôle de la
sécurité. » Dernier item : « 6° L'état et les plans de situation des moyens de
secours mis à disposition du service de sécurité. » C'est conforme au corpus
(`cch-registre-securite.ts:70`, `premiere_main`, 2026-09-01), qui l'écrit
déjà : « le PROPRIÉTAIRE — et non l'exploitant ».

### (c) L'écart

Le débiteur de `R. 146-35` est le **propriétaire de l'IGH**. L'utilisateur de
Rojer est un employeur, ou l'exploitant d'un ERP. En IGH, c'est typiquement un
locataire, puisque l'ERP en IGH est refusé (ADR-031).

- **Le dossier de conformité cite donc, à tout lecteur, un article qui ne vise
  pas celui qui présente le document.** C'est le défaut que le commentaire du
  registre nomme lui-même : « une référence qui ne vise pas son lecteur ».
- **Qui le subit** : le tiers qui lit le ZIP (inspection, assureur, bailleur).
  Il reçoit deux documents qui ne citent pas les mêmes fondements pour le même
  registre, et l'un des deux vise un autre débiteur. Le dirigeant ne le voit
  pas.
- Écart voisin, du même ordre et dans les deux PDF : `R. 143-44` est imprimé
  pour un établissement qui n'est pas un ERP.

### (d) Options

| | Option | Effet |
|---|---|---|
| A | Aligner le dossier sur le registre : retirer `R. 146-35` | Une ligne de JSX. La divergence disparaît. |
| B | Remettre `R. 146-35` dans le registre | Aligne les deux documents, mais sur la mauvaise cible : l'article ne vise pas l'utilisateur. |
| C | **A, et conditionner les deux blocs au régime** : `R. 143-44` seulement si ERP ; `R. 146-35` jamais, tant que le produit ne sert pas un propriétaire d'IGH | Petit changement dans les deux composants : le dossier reçoit déjà le régime, et le registre doit le recevoir. |

**Recommandation : C, ou A à défaut.**

- **Le texte tranche la question** : il nomme le propriétaire. La divergence
  n'est donc pas une affaire de goût entre deux documents. L'un des deux cite
  un débiteur qui n'est pas le lecteur.
- **B est à écarter.**
- **C règle en plus `R. 143-44` hors ERP**, et c'est le même défaut. Il ne
  demande aucune qualification juridique : il supprime des citations, il n'en
  ajoute pas.
- **Le chiffre du commentaire est à corriger** dans le même geste.

---

## 3. La règle de fusion « la plus ancienne »

### (a) Le code

- **La règle** : `reprendreLaRealisation`
  (`src/lib/calendrier/generateur.ts:1026`). Quand N lignes d'obligations
  retirées sont absorbées par une seule, l'absorbante hérite de la **plus
  ancienne** réalisation connue. Une ligne sans réalisation ne lègue rien.
- **L'adoption de rangée** : la même règle s'applique entre plusieurs
  prédécesseurs, dans `plusAncienne` (`:1042`) et `adopter` (`:1194`).
- **L'héritage** est recalculé à chaque passe (`heritageDesRetirees`,
  `:1075`), à partir de toutes les lignes de l'établissement, **archivées
  comprises** (`calendrier/passe.ts:127`).
- **« Propre, sinon héritée »** : dès que la ligne absorbante porte un rapport
  à elle, l'héritage ne compte plus (`echeance-de-ligne.ts:230`).

Où la règle s'exerce aujourd'hui (`OBLIGATIONS_RETIREES`,
`conformite/index.ts:238–257`) :

| Retirée | Absorbante | Fusion N→1 ? |
|---|---|---|
| `elec-erp-cat5-quinquennale` | `incendie-erp-pe4-entretien-installations-techniques` | oui (équipements → établissement) |
| `cuisson-gaz-installations-triennale` | idem | oui |
| `aeration-travail-entretien-annuel` | `aeration-controle-installations-r4222-20` | oui (une ligne par VMC/CTA → une ligne) |
| `incendie-erp-cat1-4-visite-commission` | `…-cat1-2-triennale` | non (un seul prédécesseur) |

L'ADR-022 et `index.ts` écrivent qu'aucune ligne réalisée ne portait un id
retiré au moment du retrait (« vérifié en base »). Je ne l'ai pas revérifié :
le brief exclut toute lecture en production. **L'effet actuel est donc
présumé nul. La règle vaut pour la prochaine absorption N→1.**

### (b) Le texte

Les deux absorbantes, sur leur page propre, lues le 2026-09-26 :

- **`R. 4222-20`** CT, une phrase : « L'employeur maintient **l'ensemble** des
  installations mentionnées au présent chapitre en bon état de fonctionnement
  et en assure régulièrement le contrôle. »
- **`PE 4 § 2`** (cité au sujet 1) : « Tous les trois ans **au plus** […] des
  installations et des équipements techniques de son établissement
  (chauffage, […], installations électriques, installations de gaz, […]). »

Aucun des deux textes ne dit d'où part l'intervalle quand plusieurs
installations sont suivies sous une seule ligne. Le commentaire de
`reprendreLaRealisation` le dit déjà (« une déduction, pas une phrase de
texte »), et c'est exact.

### (c) L'écart

**Il n'y a pas d'écart au texte. La déduction tient** :

- « tous les trois ans au plus » et « l'ensemble » font du plus ancien élément
  celui qui commande ;
- prendre la plus récente ferait afficher « à jour » un parc contrôlé en
  partie.

Deux limites, qui ne sont pas dans la règle mais à côté :

1. **Dès qu'un rapport propre existe, la règle cesse de servir.** Un rapport
   qui ne couvre que le gaz fait rouler toute la ligne `PE 4`, électricité
   comprise. Une ligne unique ne sait pas quelle installation un rapport
   couvre. C'est le modèle de l'ADR-022 qui en est la cause, pas la règle de
   fusion.
2. Comme l'héritage lit aussi les lignes archivées, la ligne d'un appareil
   **mis hors service mais non supprimé** peut encore vieillir la date
   héritée. L'erreur va vers « à refaire » : elle se voit.

**Qui subit.** Personne aujourd'hui (effet présumé nul). Demain, l'exploitant
dont un appareil ancien vieillit la ligne. Il le voit, et un rapport propre
remet la ligne à jour.

### (d) Options

| | Option | Effet |
|---|---|---|
| A | **Garder « la plus ancienne »** | Conforme à « l'ensemble » et à « au plus ». Se trompe vers « à refaire ». |
| B | La plus récente | Affiche « à jour » un parc contrôlé en partie. Erreur invisible. |
| C | Ne rien reprendre | Affiche « à planifier » un acte fait. Visible, mais c'est le défaut que le lot 2 du § 11 a corrigé. |

**Recommandation : A.** C'est la recommandation du 2026-09-17, et je la
confirme après avoir relu les deux textes. Une décision « ok » suffit, et
elle permet de rayer :

- la ligne de `docs/REPRISE.md` (« Les décisions qui attendent », 1) ;
- la phrase de l'amendement de l'ADR-022 ;
- le point correspondant de l'ADR-036 § 8.

La limite (1) est d'une autre nature. Elle se range, si on veut la suivre, sous
la dette de l'ADR-022, pas sous cette décision.

---

## 4. § 15 — « un dossier qui n'a rien déclaré rend des listes vides »

### (a) Le code

**La prémisse du § 15 est fausse, mesurée en appelant le moteur.** Un dossier
qui n'a rien déclaré ne rend pas un calendrier vide. Pour un employeur ou un
ERP, il rend **un calendrier partiel qui a l'air complet**. Sans aucun
équipement :

| Profil | Obligations applicables | Lignes de calendrier générées |
|---|---|---|
| Bureau, 6 salariés | 31 | **4** |
| Restaurant N5, 8 salariés | 36 | **6** |
| Commerce M5, 3 salariés | 36 | **6** |
| ERP N5 sans salarié | 4 | 1 (`PE 4`) |
| Habitation seule | 3 | 1 |
| IGH seul | 1 | 1 |

- **Les quatre lignes du bureau** : `R. 4222-20` annuelle, liste des postes à
  risques annuelle, et deux lignes de signalisation.
- **Le N5 en ajoute deux** : `PE 4` triennale et l'exercice semestriel.
- **Ce qui manque** : pour le même bureau, déclarer une
  `INSTALLATION_ELECTRIQUE` fait passer le calendrier de 4 à 7 lignes. La
  vérification électrique annuelle (`R. 4226-16`, portée par l'équipement)
  n'existe pas tant que rien n'est déclaré.
- **Tout dossier neuf est dans ce cas** : le parcours d'accueil compte trois
  étapes, identité, typologie et résumé (`WizardShell.tsx:39`), sans
  déclaration d'équipement, puis renvoie au tableau de bord. La phrase de
  `CLAUDE.md` « Onboarding : … → déclaration guidée des équipements → … » ne
  décrit plus le code.

Ce que les surfaces disent de l'inventaire vide :

- **Dans l'application**, plusieurs endroits le disent déjà :
  - tableau de bord (`widgets/impl/board.tsx:1194`,
    `widgets/impl/simples.tsx:325`, `widgets/impl/score.tsx:239`) ;
  - guide « Chez vous » (`guide/ChezVous.tsx:117`) ;
  - page de l'établissement (`etablissements/[id]/page.tsx:187`, « Déclarer
    vos équipements ») ;
  - outil MCP de la fiche (`mcp/tools.ts:125`, `:355`).
- **Dans les sorties remises à un tiers**, le grep ne trouve rien qui le dise :
  PDF de dossier et de registre (`src/lib/pdf/`), ZIP de contrôle
  (`api/etablissements/[id]/controle-zip`), écran « Préparer un contrôle »
  (`etablissements/[id]/controle`). Un contrôle au grep, pas une lecture
  surface par surface.
- **`perimetre/couverture.ts`** : l'axe `domaine_equipement` ne s'allume que
  pour des équipements déclarés sans obligation.

### (b) Le texte

Sans objet : c'est une décision de produit, aucun texte ne la règle. Seul le
principe « calcule, il n'avise pas » s'applique à la phrase qu'on écrirait. Elle
doit dire un fait (« aucun équipement n'est déclaré ») et non un état juridique.

### (c) L'écart

**Le § 15 pose une mauvaise question.** Il cherche « le seuil de lignes à
partir duquel on dit que la liste est vide ». Or la liste n'est jamais vide
pour la cible, donc un seuil sur le **calendrier** ne se déclencherait jamais.
Le fait qui manque se lit sur **l'inventaire** : zéro équipement déclaré. Le
§ 15 et le commentaire de `fraicheur.ts:37` le disent tous deux (« ne se lit
pas sur le sceau du calendrier mais sur l'inventaire ») ; il manque seulement
la mesure qui montre que la liste n'est pas vide.

**Qui le subit.**

- **Le tiers qui reçoit le ZIP ou les PDF** d'un dossier sans équipement. Il
  voit un calendrier de quatre à six lignes propres, sans électricité ni
  extincteurs, et rien ne lui dit que l'inventaire est vide. C'est le faux vert
  que le lot « fraîcheur des sorties » voulait fermer, sous une autre forme.
- **Le dirigeant l'est moins** : l'application le lui dit déjà à plusieurs
  endroits.

**Un bureau qui n'a vraiment aucun appareil** n'existe pas en pratique pour un
local de travail : il y a au moins une installation électrique. Le « faux
rouge » que redoute le § 15 (« lui annoncer un doute ») n'a donc pas de cas
réel. Ce point est un raisonnement, pas une mesure.

### (d) Options

| | Seuil | Effet |
|---|---|---|
| A | Rien | Le faux vert reste dans les sorties remises à un tiers. |
| B | **Zéro équipement déclaré en service** : un manque sur un nouvel axe de `couverture.ts` (ou un cas de `domaine_equipement`), repris par les sorties qui lisent déjà la couverture | Un fait, sans qualification : « Aucun équipement n'est déclaré : les vérifications qui naissent d'un appareil n'apparaissent pas. » Il s'éteint au premier équipement. |
| C | Zéro équipement **d'une catégorie attendue** (par exemple pas d'`INSTALLATION_ELECTRIQUE` chez un employeur) | Plus fin, mais c'est une déduction : il faudrait dire quelles catégories sont « attendues ». C'est l'étape d'après, et `pre-remplissage.ts` en porte déjà une ébauche par NAF. |

**Recommandation : B.**

- **Le seuil, c'est zéro équipement, pas zéro ligne.** C'est un fait que
  l'outil observe sans rien déduire, et il n'a pas de cas où il se trompe.
- **Il rejoint un mécanisme existant** (la couverture), plutôt que l'union
  `FraicheurCalendrier`, que le § 15 a eu raison de garder fermée.
- **C est à instruire après**, si B ne suffit pas.
- **Dans le même geste** : corriger la phrase « onboarding » de `CLAUDE.md`,
  et réécrire le § 15 sur la mesure ci-dessus.

---

## En une ligne chacun

1. **`CH 57` / `CH 58`** : la scission est la seconde question. En 5ᵉ
   catégorie, `PE 1 § 1` écarte le Livre II, et `PE 20 § 2` ne renvoie au
   chapitre CH que pour la mise en œuvre. La ligne annuelle sur-applique donc
   au N5 (où `PE 4 § 2`, triennal, nomme le chauffage), et aucune catégorie
   d'équipement ne peut déclencher un ramonage. Recommandation : trancher la
   portée (borner aux N1–N4), puis scinder en N1–N4 avec une catégorie
   « appareil à combustion ».
2. **`R. 146-35`** : le texte vise le propriétaire de l'IGH, jamais le lecteur
   du dossier. Recommandation : le retirer du dossier de conformité, et
   conditionner au régime les références du registre dans les deux PDF.
3. **« La plus ancienne »** : conforme à « l'ensemble » (`R. 4222-20`) et à
   « au plus » (`PE 4 § 2`), et l'erreur se voit. Recommandation : la garder.
   La vraie limite est ailleurs : un rapport propre fait rouler toute la ligne,
   quelle que soit l'installation qu'il couvre.
4. **§ 15** : la prémisse est fausse. Un dossier vierge rend 4 à 6 lignes, pas
   zéro, sans l'électricité. Recommandation : le seuil est « zéro équipement
   déclaré », dit comme un fait par la couverture et repris dans les sorties
   remises à un tiers.
