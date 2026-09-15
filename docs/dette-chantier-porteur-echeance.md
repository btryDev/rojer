# Ce que le chantier « porteur d'échéance » laisse ouvert

**Arrêté au 2026-08-27**, à l'issue des trois lots (porteur établissement,
porteur salarié, écran Équipe) et de la migration de charte du même jour.
Commits `ede4a3c..HEAD`.

Ce document existe pour une raison précise : tout ce qui suit a été **déclaré
plutôt que caché**, et c'est ce qui rend le lot défendable. Mais c'était
éparpillé entre des messages de commit, trois ADR et des notes internes. Un
seul endroit vaut mieux — on ne peut être tranquille sur ce qui est sain qu'en
sachant ce qui ne l'est pas encore.

Rien ici n'est un défaut du code livré. Ce sont des **limites connues**, des
**promesses non tenues** et des **décisions repoussées**. Chacune porte sa
raison, et ce qu'il faudrait pour la lever.

---

## 1. Ce qui est promis quelque part et n'existe pas

C'est la catégorie la plus dangereuse : un document affirme au présent une
chose que le code ne fait pas. Le lecteur suivant s'y fiera.

### 1.1 L'export **et la suppression** du titulaire du compte — `docs/rgpd.md` § 5.1

**Ce qui manque est l'outil, pas le droit.** Les articles 15, 17 et 20 donnent
un droit réel, et il est servi : par demande à `contact@btry.fr`, traitée à la
main dans le délai d'un mois de l'article 12.3. Ce qui n'existe pas, c'est le
libre-service. La nuance commande la rédaction : un document qui supprimerait
la ligne dirait, en creux, que le droit n'existe pas — ce serait remplacer une
contre-vérité par une autre.

Deux manques, pas un. Le second a été manqué à la première rédaction de cette
section, le 2026-08-27, qui ne recensait que l'export :

**a) L'export complet (art. 15 et 20).** Aucune route, aucune action serveur.
Vérifié le 2026-08-27 sur `src/app`, `src/lib`, `src/components`, et de
nouveau le 2026-08-28 : `src/app/api/` porte dix routes, dont une seule
d'extraction. À ne pas confondre avec l'extraction **par salarié** (§ 5.2),
livrée avec l'écran Équipe.

*Pour le lever* : une route sur le modèle de
`api/etablissements/[id]/equipe/[salarieId]/donnees`, élargie à l'entreprise,
ses établissements, ses équipements et ses documents. Reste à trancher : ce
qu'on fait des fichiers déposés (`attestationCle`, `agendaAdapCle`, rapports
en stockage) — les inclure, ou n'en donner que l'inventaire.

**b) La suppression de compte (art. 17).** Aucune action non plus. Vérifié le
2026-08-28 : rien ne répond à `supprimerCompte`, `deleteAccount` ni
`deleteUser` dans `src/`.

*Ce n'est pas une route à écrire, c'est une décision produit à prendre.* Les
versions de DUERP se conservent 40 ans au titre d'une obligation légale
(`rgpd.md` § 4.2) : la suppression ne peut être que **partielle**, et personne
n'a encore décidé ce qu'elle emporte, ce qu'elle laisse, ni ce que
l'utilisateur en lit au moment où il la demande. La livrer sans cette décision
produirait soit un effacement qui détruit une preuve légale, soit un bouton
qui ne supprime pas grand-chose et le dit mal.

**Ce qui a été corrigé le 2026-08-28** : `rgpd.md` § 5.1 annonçait les deux au
présent, comme des fonctionnalités. Le § 5.3 démentait l'export 34 lignes plus
bas ; la suppression n'était démentie nulle part. Les deux disent désormais par
quel chemin le droit s'exerce.

**Ce qui reste à corriger** : `.claude/CLAUDE.md` règle 9 porte la même promesse
au présent — « RGPD : hébergement UE, politique de rétention explicite, export
et suppression **possibles à tout moment** » — et n'est démentie nulle part. Le
pointeur de `CLAUDE.md:134` ne vise que l'export. Cette ligne n'a pas été
touchée avec les autres : `CLAUDE.md` est le document qui gouverne le travail
sur ce dépôt, et sa modification revient à sa propriétaire, pas à la session
qui corrige les autres documents. La correction attendue est la même que
celle du § 5.1 : dire par quel chemin le droit s'exerce, sans retirer le droit.

### 1.2 Le cinquième déclencheur — l'activité réellement exercée

`.claude/CLAUDE.md` le liste parmi les cinq déclencheurs. Il **n'est pas
implémenté**, et c'est ce qui explique la forme de l'écran Équipe : rien ne dit
au moteur qui, dans l'effectif, opère au voisinage de pièces nues sous tension.
L'employeur déclare donc les titres à la main.

C'est une limite assumée, pas un oubli : la déduire d'un intitulé de poste
serait de l'analyse de texte, que le produit s'interdit (principe fondateur
« zéro IA »). Mais tant qu'elle tient, **l'outil ne peut pas dire à un
employeur qu'il lui manque une habilitation** — seulement suivre celles qu'il a
déclarées.

---

## 2. Le référentiel : ce qui est encodé, ce qui ne l'est pas

**85 obligations** livrées, vérifié contre le code : **82 portées par un
équipement, 2 par l'établissement, 1 par un salarié.** Ces chiffres sont exacts
au 2026-08-27 et `.claude/CLAUDE.md` les porte correctement.

### 2.1 Dix-neuf obligations salarié sur vingt ne sont pas encodées

Une seule est livrée : l'attestation médicale quinquennale de `R. 4544-11-1`.
Manquent notamment le SST, le CACES, l'autorisation de conduite, et les
formations à la sécurité de `R. 4141-*`. Le corpus n'a **rien** sur
`R. 4141-*`, `R. 4624-*`, le SST ni le CACES.

*Pourquoi* : le cliquet de `corpus.test.ts` interdit d'encoder une obligation
sur un texte que personne n'a lu en première main. C'est la garantie qui fait
la valeur du référentiel ; elle a pour prix que la couverture avance à la
vitesse du dépouillement.

*Ce qui est fait pour que ça ne trompe personne* : l'écran Équipe **annonce
lui-même** que son catalogue n'est pas exhaustif et dit à l'utilisateur de
continuer à suivre les autres titres par ses moyens habituels.

### 2.2 Six articles restent `obligation_manquante` au corpus

Relevés dans `arrete-1980-livre-3.ts` (cinq) et
`arrete-2018-02-23-gaz-habitation.ts` (un). Ce statut signifie : l'article est
lu et son verbatim est relevé, mais aucune obligation du référentiel ne s'y
adosse.

PE 4 et R. 4222-20 **sont sortis** de cette liste avec le lot 1 — c'est ce qui
a éteint les cinq lignes `FONDEMENT_NON_RETENU` de
`docs/relecture-referentiel-par-reference-2026-08-27.md`, sans qu'on y touche.

### 2.3 Neuf sur-applications assumées — six dans `incendie.ts`, trois dans `electricite.ts`

Neuf obligations sont appliquées
plus largement que le texte ne l'exige, pour éviter un faux négatif. C'est un
choix — mieux vaut annoncer une vérification de trop qu'en taire une due — mais
c'en est un, et il n'a pas été rerevu article par article depuis que PE 4 § 2
existe.

*Pour le lever* : une passe de relecture juridique, avec la skill
`veille-reglementaire`, pour retirer celles que PE 4 § 2 couvre désormais.
**Chacune se retire séparément, avec sa note.**

### 2.4 `ED 6298` n'est pas dépouillé

Le lot de contenu attendu porte onze formations, pas treize comme annoncé
ailleurs. Non commencé.

---

## 3. Les natures d'échéance : une sur quatre n'a pas de représentation

L'ADR-022 pose quatre natures. **Seule « récurrente » est livrée.**

L'« état permanent à constituer puis maintenir » n'a aucune représentation
calendaire : il retombe sur `periodicite: "autre"`, que le générateur saute. Le
cas type est l'habilitation électrique elle-même — `R. 4544-10` renvoie à des
modalités qu'il **qualifie lui-même de recommandées**, et le triennal usuel
vient de la norme NF C 18-510, pas du Code.

*Conséquence visible* : un titre sans terme écrit s'affiche « sans terme
écrit » et ne produit pas de ligne de calendrier. C'est juste — décréter une
échéance inventerait une non-conformité — mais ce n'est pas satisfaisant :
l'utilisateur n'a aucun rappel sur un titre qu'il devrait tout de même
réexaminer.

Les natures « ponctuelle » et « événementielle » sont nommées dans l'ADR sans
mécanisme.

---

## 4. La règle du non-renseigné n'est pas appliquée partout

L'ADR-022 pose : *l'incertitude ne réduit jamais la couverture*. `null` ne vaut
pas « non ».

**Deux attributs d'établissement faisaient l'inverse**, et étaient recensés dans
l'ADR :

- `manipuleMatieresR422722` — absent, lu « non ». **Reste.**
- `personnesPresentesHabituellement` — absent, retombant sur `effectifSurSite`.
  **Corrigé le 2026-09-03** : le nombre manquant n'est plus remplacé, il est
  borné par le bas (catégorie d'ERP, puis effectif salarié), et l'obligation est
  retenue « à confirmer » quand la borne ne tranche pas et que l'établissement
  reçoit du public.

Toute condition **nouvelle** suit la règle. Celle qui reste est antérieure ; elle
ne retire aujourd'hui aucune obligation, sa branche n'en ajoutant qu'à un champ
déjà ouvert par le seuil de personnes présentes. Elle en retirerait le jour où une
obligation s'appuierait sur elle seule.

Le canal d'affichage manque toujours à l'écran d'échéances : `tone` est binaire
dans `src/lib/calendrier/echeances.ts`. Le « à confirmer » vit dans les `raisons`
du moteur, que le guide « Comprendre » affiche sous « pourquoi chez vous » ; il
n'a pas de couleur au calendrier.

---

## 5. Décisions repoussées, avec leur raison

### 5.1 Le porteur bâtiment — non retenu, et le DTA reste sans porteur

L'ADR-019 refuse explicitement un `batimentId` sur `Verification` et `Action` :
le bâtiment est un **lieu**, le bâtiment d'une échéance se lit en remontant la
chaîne.

Aucune obligation des lots livrés n'en avait besoin. Mais le **DTA** (dossier
technique amiante) se déclenche sur l'année du permis de construire — une
propriété physique du bâtiment. Il reste **hors lot, porteur non tranché**, et
surtout **pas assimilé à `EnsembleClasse`**, que l'ADR-019 réserve aux
*régimes* (flags ERP/IGH, catégorie, effectif accueilli).

`Batiment` n'a d'ailleurs pas d'`anneePermisConstruire`.

### 5.2 `locauxSommeil`, et donc PE 4 § 1 et PE 37

`Etablissement.locauxSommeil` n'existe pas. Seul
`Equipement.caracteristiques.dessertLocauxSommeil` existe, ce qui n'est pas la
même chose : un établissement peut avoir des locaux à sommeil sans qu'aucun
équipement déclaré ne les desserve.

Sans cet attribut, **PE 4 § 1** (contrat annuel d'entretien du SDI en présence
de locaux à sommeil) et **PE 37** ne peuvent pas être encodés.

### 5.3 Le sixième déclencheur « événement » — nommé, non retenu

Un accident, une embauche ou un chantier **datent** une obligation, ils ne la
font pas naître. Les seules lignes réellement événementielles recensées sont
hors périmètre (déclaration d'AT, registre des accidents bénins) ou déjà
servies par le module `PlanPrevention`. L'axe est nommé dans l'ADR-022, sans
mécanisme, et c'est délibéré.

### ~~5.4 Le doublon d'ADR 014~~ — FERMÉ LE 2026-09-15

~~`014-prescriptions-particulieres.md` et `014-provenance-navigation.md` portent
le même numéro. Les deux sont en vigueur ; `.claude/CLAUDE.md` n'en indexe
qu'un. **Collision à trancher, elle ne l'est pas.**~~ Tranché dans
`lot/reliquats-donnees-docs` : la plus récente, celle des prescriptions
(2026-08-25), est renumérotée **ADR-035** (`035-prescriptions-particulieres.md`)
et indexée dans `.claude/CLAUDE.md` ; la provenance (2026-08-20) garde le 014.

---

## 6. Ce que la migration de charte a laissé ouvert

### 6.1 La dette papier est loin d'être soldée

Inventaire du 2026-08-27 : **1311 occurrences sur 126 fichiers** au départ. Les
lots livrés ce jour (prestataires, chrome, kit partagé, auth, onboarding,
équipe) en retirent une part ; **le DUERP (307) et le guide « Comprendre »
(163) restent entiers**, et sont les deux plus gros.

Le DUERP demande **deux arbitrages avant d'être touché** : le sort de son
`max-w-5xl` documenté (`duerp/[id]/layout.tsx`, « préserver la lecture de type
document »), et un **patron de tableau dense**, que la charte board n'a pas et
que le DUERP est le seul module à réclamer.

### 6.2 Ce que la charte ne dit pas, et qu'il a fallu trancher

Relevé par les agents de migration, à verser dans `docs/charte-board.md` :

- **Pas de patron « écran d'entrée »** à côté des patrons liste / fiche /
  formulaire. Un formulaire d'auth de 460 px garde `mx-auto max-w-*`, contre la
  règle de la gouttière, et c'est justifié — mais ce n'est écrit nulle part.
- **Pas de motif d'erreur pleine largeur.** La charte ne décrit que l'erreur
  sous un champ. Or une erreur d'authentification ne doit s'accrocher à aucun
  champ (elle ne doit pas dire lequel est faux), et le blocage d'un wizard
  barre le passage sans se rattacher à rien. Deux agents ont inventé le même
  motif indépendamment (`--board-signal-wash`) ; à entériner ou à corriger.
- **Rien sur le registre inversé** (rail sombre), qui existe pourtant
  (`AppSidebar`).
- **`--paper` sur un bandeau d'en-tête** : la table dit `--board-canvas`, mais
  tous les écrans migrés prennent `--board-card`. L'exception est réelle, elle
  n'est pas écrite.

### 6.3 Deux libellés de statut divergent entre liste et fiche

*(L'écart de référence Légifrance qui figurait ici est **corrigé** — la
vérification a conclu que c'était l'URL qui était morte, pas les étiquettes, et
elle a mis au jour deux erreurs de fond plus graves. Voir le commit
« Trois erreurs de droit dans le plan de prévention ».)*

Deux libellés de statut divergent — « Terminé » /
« Travaux terminés », « Validé » / « Prêt à démarrer ». Les unifier est une
décision de contenu, pas un effet de bord de migration.

### 6.4 `ComplianceTimeline` est du code mort — confirmé, non supprimé

Aucun appelant dans tout le dépôt : deux occurrences seulement, sa définition
et sa ré-export du barrel. Il est le seul appelant de `.filet-vertical`. Il
porte aussi deux couleurs hors palette et peint « en retard » en ambre — dans
le board, l'ambre dit « proche ».

Laissé en place volontairement : une suppression est une décision, pas un
effet de bord de revue.

### 6.5 Deux blocs d'erreur sans annonce accessible

Les blocs d'erreur des écrans d'auth n'ont ni `role="alert"` ni `aria-live` :
l'erreur apparaît après soumission sans être annoncée. Identifié et non
corrigé — c'est un changement de comportement, hors du mandat d'une migration
de style.

*Pour le lever* : dans `ChampBoard` et un bloc d'erreur de formulaire partagé,
qui n'existe pas encore.

---

## 7. Dettes de plomberie

### 7.0 `DROP INDEX` sans `IF EXISTS` — vérifié, risque écarté

Une revue a signalé que `20260827140000_porteur_salarie` fait
`DROP INDEX "Verification_etablissementId_obligationId_equipementId_key"` sans
`IF EXISTS`, là où sa migration sœur l'écrit — et qu'un index absent sous ce nom
ferait échouer `prisma migrate deploy`, donc le déploiement entier.

**Vérifié le 2026-08-27, et le risque n'existe pas :**

- l'index est créé sur `main` par `20260810120000_integrite_et_conservation`,
  sous exactement ce nom ;
- `20260827120000_porteur_etablissement`, qui s'exécute **juste avant** dans la
  même branche, le supprime et **le recrée sous le même nom** (en y ajoutant
  `NULLS NOT DISTINCT`) ;
- quand `_porteur_salarie` s'exécute, l'index existe donc par construction.

`_porteur_salarie` est par ailleurs **absente de `main`** : la production, qui
déploie `main`, ne l'a jamais appliquée. Le premier déploiement qui la portera
exécutera d'abord `_porteur_etablissement`, dans l'ordre.

Le fichier n'est donc pas modifié — ce qui est de toute façon la bonne
conduite : il est appliqué sur la base locale, et changer une migration
appliquée casse son empreinte.

*(Ce paragraphe affirmait le contraire jusqu'au 2026-08-27 : j'avais recopié le
constat de la revue sans le vérifier. Une dette qui se trompe sur elle-même
envoie corriger ce qui n'est pas cassé.)*

**Le point du nom d'index se referme aussi.** `Verification_etablissementId_obligationId_equipementId_sala_key`
fait exactement **63 caractères**, mesuré — soit la limite d'identifiant de
PostgreSQL, et donc précisément ce que produit la troncature de Prisma. Il n'y
a pas de dérive à craindre.

Ce paragraphe n'a donc plus de point ouvert.

### 7.1 Autres

- **Ordre d'horodatage des migrations à surveiller.** Le lot bâtiment
  (`20260821130000_batiment_lieu`, `20260821160000_batiment_fk_no_action`)
  précède des migrations appliquées plus tôt en production ; à recouper avec
  le point suivant avant toute nouvelle migration. 34 migrations au dépôt.
- **Quatre migrations appliquées en production, absentes de `main`** (mémoire
  du 2026-08-26, à recouper).
- **`Intervention` / `CommentaireIntervention`** restent au schéma sans aucun
  code qui les lise : le module a été retiré (ADR-018), le `drop` attend une
  migration dédiée.
- **`ui/select.tsx` et `ui/card.tsx` : zéro importateur.** Code mort probable.
- **Le `.env` pointe la base de production.** Il n'y a pas de base locale :
  toute commande Prisma écrit sur la production. Une session a déjà vidé cette
  base avec un `prisma migrate diff --from-migrations` — la commande exige une
  base d'ombre, qu'elle **vide** avant de rejouer les migrations. `.env.example`
  porte désormais la liste des commandes qui écrivent.

---

## 7 bis. Dette de veille — le décret n° 2026-253, dépouillé le 2026-09-01

*Ajouté le 2026-08-31 au soir, soldé le 2026-09-01 (lot D2). Numéroté « 7 bis »
plutôt qu'inséré en renumérotant : les renvois à ce document désignent des
sections par leur numéro. La section est conservée plutôt que supprimée — ce
qu'elle disait de faux importe autant que ce qu'elle demandait.*

**Le décret a été ouvert article par article sur Légifrance. Réponse : AUCUNE
obligation encodée n'est fausse à cause de lui.**

Objet réel du décret : valeurs limites d'exposition professionnelle pour le
plomb, les diisocyanates et les émissions de moteurs diesel — transposition de
la directive (UE) 2024/869 du 13 mars 2024. Sept articles, **treize articles de
code touchés** :

| Art. du décret | Article de code | Effet |
|---|---|---|
| 1 | `R. 4412-149` (tableau VLEP) | modifié |
| 2 | `R. 4412-152` (valeurs limites biologiques) | remplacé |
| 3, 1° | `R. 4412-160` | **abrogé** |
| 3, 2° | `R. 4624-23`, I, 2° | sept mots supprimés |
| 4 | `R. 4721-6` à `R. 4721-10` | modifiés (mise en demeure, « mesures correctrices » au lieu de « plan d'action ») |
| 5 | `R. 4724-14`, + création de `R. 4724-14-1` et `R. 4724-14-2` | mesurages d'empoussièrement amiante |
| 6 | `R. 717-16` code rural et de la pêche maritime, II, 2° | mots supprimés |

Croisé mécaniquement — et non au grep — contre les 116 obligations et les 237
articles des 33 corpus : **un seul point de contact**, `R. 4624-23`, cité par le
corpus `code-travail-sante-travail` et par l'obligation
`sante-travail-etablissement-liste-postes-risques`. Les douze autres articles ne
sont cités nulle part, ni au numéro ni au sujet (VLEP, valeur limite,
empoussièrement, diisocyanate, mise en demeure, plan d'action, arrêt temporaire).

**Et `R. 4624-23` est encodé juste.** L'article a été relevé verbatim le
2026-09-01 dans sa version en vigueur : ses I, II, III et IV correspondent mot
pour mot à ce que le corpus en dit. Le décret ne touche ni le III — qui fonde
l'obligation — ni le IV.

### Ce que cette section elle-même affirmait de faux

Le tableau qui figurait ici disait que le décret avait **réécrit** `R. 4624-23`
et que « c'est cette réécriture qui porte le `II` élargissant l'assiette du suivi
renforcé ». **Les deux sont faux**, et c'était le seul endroit du dépôt à le
dire :

- il ne l'a pas réécrit. Verbatim de l'art. 3 : « Au 2° du I de l'article
  R. 4624-23, les mots : "dans les conditions prévues à l'article R. 4412-160"
  sont supprimés. » Sept mots dans un alinéa. Légifrance affiche « Modifié par » ;
- le `II` ne vient pas de lui. Il est en vigueur depuis le **28/04/2022**
  (décret n° 2022-679 du 26 avril 2022, art. 2) — vérifié sur la version
  antérieure de l'article, en vigueur du 28/04/2022 au 10/04/2026, qui le porte
  déjà mot pour mot. La date de 2026 est celle de la version courante de
  l'article, pas celle du paragraphe. Trois fichiers avaient repris cette
  confusion ; ils sont corrigés.

**Ce que le décret a réellement fait, et qui n'était consigné nulle part** : le
I 2° lisait « Au plomb dans les conditions prévues à l'article R. 4412-160 » ; il
lit désormais « Au plomb ; ». `R. 4412-160`, abrogé le même jour, subordonnait le
suivi renforcé à des seuils — 0,05 mg/m³ dans l'air, ou une plombémie de
200 µg/l pour les hommes et 100 µg/l pour les femmes. **L'assiette du suivi
renforcé s'est donc élargie pour le plomb**, sans seuil désormais. Sans effet sur
le produit, qui ne dérive jamais qui relève du suivi renforcé.

**Une troisième affirmation fausse, trouvée en passant et sans Légifrance** :
trois fichiers appelaient `R. 4624-23` « l'article le plus récemment modifié de
tout le référentiel ». Les données du corpus le démentent seules — douze articles
portent une `versionEnVigueur` postérieure au 2026-04-10, jusqu'au 2026-07-01
(`PE 4`, `PE 10`, `CCH R. 143-44`, `CCH R. 141-10`, `CCH R. 141-11`,
`CCH R. 146-35`, `Arrêté 2025-12-01`, `L. 4141-5`, `L. 2315-17`,
`CCH R. 134-11`, `Arrêté 2012-08-07`, `PE 27`). Corrigé aux trois endroits.

### Ce qui reste, et qui dépasse ce décret

Le mécanisme qui manque est le sens inverse de `versionConstatee` : celui-ci
détecte qu'un article qu'on cite a bougé, il ne détecte pas qu'un texte qu'on ne
cite pas a bougé nos articles. Ce décret-ci est soldé ; rien ne dit qu'il était
le seul, et les deux occurrences qui l'ont fait découvrir l'avaient été à la
main.

**Deux voisins non ouverts**, signalés parce que le dépouillement les a croisés
sans les lire : l'**arrêté du 8 avril 2026** publié avec ce décret, et l'arrêté
ministériel désignant l'organisme national de `R. 4724-14-2`. Ni l'un ni l'autre
n'a d'accroche dans le référentiel aujourd'hui.

**Un dernier constat de même classe, laissé en l'état** :
`conformite.test.ts` décrit `L. 2315-17` comme « le deuxième texte le plus
récent du référentiel après `R. 4225-2` ». Ce classement est faux lui aussi
(sept articles au 2026-07-01 le précèdent), mais il ne relève pas de ce décret.
Ces superlatifs se périment à chaque dépouillement : **aucun ne devrait être
écrit à la main.**

---

## 8. Ce qui n'est PAS de la dette

Pour que la liste ci-dessus garde son sens, il faut dire ce qui n'y est pas.

- **Les PDF** ne portent aucun jeton papier. `src/lib/pdf/styles.ts` recopie
  les jetons `--board-*` en littéral, parce qu'un PDF ne lit pas de CSS.
- **La page publique** (`src/components/landing/`, `src/app/page.tsx`) est
  intégralement board, avec son propre jeu `.lp-*`. Zéro occurrence papier.
- **`SelecteurBatiment`** est bicharte **par conception** : il prend une prop
  de charte et sert les deux côtés. C'est un pont, il disparaîtra quand ses
  appelants papier seront passés.
- **L'écran Équipe ne dérive rien**, et c'est correct. Un employeur qui n'a
  déclaré personne ne voit aucune obligation salarié — parce qu'aucun fait ne
  dit qui opère sur quoi. Une page vide y est un constat juste, pas un défaut.
