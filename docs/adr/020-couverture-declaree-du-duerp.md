# ADR-020 — Ce qu'un DUERP ne couvre pas se déclare, et se grave avec lui

> **Amendée le 2026-11-11 par l'ADR-060.** Un « oui » à une activité hors
> référentiel ajoute désormais au DUERP les risques à évaluer qu'elle appelle
> (non cotés), dans une unité dédiée ou une unité type existante. La mention
> de couverture partielle s'imprime toujours, inchangée.

> **Amendée le 2026-09-01 par l'ADR-031.** Le mécanisme décrit ici — ce qui n'est
> pas couvert se déclare, se grave avec la version, et ne se refuse pas — reste
> entier. L'ADR-031 ajoute en amont une classe de cas traitée autrement : les
> régimes que le produit ne sait pas servir *du tout* sont refusés à la création
> du dossier, au lieu d'être déclarés.

Date : 2026-08-21
Statut : accepté

Prolonge l'ADR-003 (référentiels en TypeScript versionné) et s'appuie sur
l'ADR-012 (conservation des preuves, régénération idempotente).

## Contexte

Un supermarché relève du code NAF 47.11. Rojer lui charge donc le référentiel
commerce, qui a quatre unités types — réception et stockage, mise en rayon,
vente et caisse, locaux — et aucun atelier. Son DUERP ne dira rien de la
boucherie : ni les machines de découpe, ni le travail au froid, ni les TMS de
désossage. Et rien, nulle part, ne le signale.

Le document qui en sort a les mêmes colonnes, les mêmes cotations et le même
en-tête que celui d'une supérette qui, elle, est réellement couverte. Il a
l'air complet. C'est le pire cas de figure du produit : un silence qui prend
l'apparence d'une réponse, sur une pièce que le dirigeant présentera à un
inspecteur, à un assureur, à un bailleur ou à un acquéreur.

Deux commits ont traité la même maladie un cran plus bas, et leur doctrine est
le point de départ de celui-ci. Une unité de travail sans `referentielUniteId`
est signalée à l'écran et dans le PDF, parce qu'une liste de risques types vide
ne doit pas se lire « il n'y a rien à évaluer ici ». Un équipement dont le
moteur ne calcule aucune échéance porte une phrase, parce qu'une ligne muette
ressemblait à un appareil à jour. Il manquait le cas où c'est **l'unité entière
qui n'existe pas** : le dirigeant n'a pas créé d'unité « Boucherie », donc il
n'y a même pas de ligne à annoter.

L'outil, lui, ne peut pas le deviner. Le NAF ne dit pas qu'il y a une boucherie,
l'effectif non plus, le nom du commerce encore moins — et le déduire d'un texte
libre serait de l'analyse par LLM, exclue du produit. Le seul qui sache est le
dirigeant. On le lui demande.

## Décision

**Ce que le dossier ne couvre pas est une donnée déclarée par l'employeur,
figée dans la version validée, et imprimée dans le document.**

Quatre points, indissociables.

1. **Le mécanisme est déclaratif et fermé.** Chaque référentiel sectoriel porte
   une liste d'`ActiviteNonCouverte` (`src/lib/referentiels/types.ts`) : un
   identifiant, un libellé, une question fermée, ce qui manquera si la réponse
   est « oui », et pourquoi le référentiel s'arrête là. On pose la question, on
   lit la réponse. Aucune détection, aucune heuristique, aucune inférence depuis
   le NAF, les équipements déclarés ou le nom de l'établissement. Sur un
   document à valeur légale, une couverture devinée serait pire qu'une
   couverture ignorée.

2. **Trois états, jamais deux.** `Duerp.reponsesActivitesNonCouvertes` est un
   `Json?` de forme `Record<string, boolean>` : `true`, `false`, et **clé
   absente**. L'absence n'est pas un « non ». C'est la règle déjà tenue par
   `estHorsReferentiel` sur `referentielUniteId` et par
   `QuestionTransverseRow` à l'écran ; elle vaut ici pour la même raison — il
   n'y a pas de réponse par défaut à une question que personne n'a lue.

3. **La couverture est un fait figé à la validation, jamais recalculé.** Le
   snapshot de version porte un champ `couverture` qui **recopie** le libellé,
   le « ce qui manque » et le « pourquoi » de chaque activité, avec la réponse
   donnée ce jour-là. Le référentiel sera réécrit, complété, réordonné ; une version
   relue dans trente ans doit citer ce qui a été déclaré, pas ce que le code
   contient au moment de la relecture. Le snapshot est le document, pas une
   clé étrangère vers lui.

4. **L'absence du champ dans un snapshot ancien n'est pas une couverture
   complète.** `couverture` est optionnel. Les versions validées avant son
   introduction sont conservées 40 ans et régénérées à l'identique : elles ne
   portent aucune mention, ni de manque, ni de complétude. Muet veut dire
   muet. Ce contrat est vérifié par `snapshot-compat.test.ts` et n'est pas
   négociable — et il vaut, un cran plus bas, pour `pourquoi`, optionnel à
   l'intérieur de `couverture` : une version figée entre l'introduction de la
   couverture et celle de l'explication cite sa mention sans son pourquoi, et
   se régénère ainsi. On ne va jamais chercher la phrase manquante dans le
   référentiel d'aujourd'hui.

Le « pourquoi » mérite sa propre justification, parce qu'il a été ajouté après
coup. `cequiManque` dit ce que le document ne traite pas ; seul, il se lit comme
l'aveu d'une lacune du produit. Un référentiel sectoriel est pourtant bâti sur
une activité type documentée par une source précise, et c'est le code NAF qui
ratisse plus large qu'elle — l'INRS lui-même publie des outils distincts pour la
boucherie, la poissonnerie, la boulangerie ou la restauration collective, parce
que les familles de risques n'y sont pas les mêmes. Le lecteur tiers a besoin de
cette phrase pour savoir s'il regarde un oubli ou un bord connu. D'où sa règle de
rédaction, tenue par un test : elle **nomme la source qui traite l'activité
ailleurs**, jamais l'état d'avancement du produit — qui ne veut rien dire pour ce
lecteur et vieillirait mal sur une pièce conservée quarante ans.

Côté produit, la déclaration est **informative et jamais bloquante** : elle
~~n'ajoute ni ne retire aucun risque,~~ [2026-11-11, ADR-060 : un « oui »
ajoute à évaluer, non cotés, les risques que l'activité appelle, et un retour
au « non » retire ceux que le dirigeant n'a pas touchés] elle n'empêche pas de valider une version,
et elle ne produit ni score, ni pourcentage de complétude — un chiffre
laisserait croire à une mesure de la qualité de l'évaluation. Le registre reste
descriptif de bout en bout : on nomme l'activité et ce que le document ne
traite pas à son sujet, on ne dit ni « incomplet », ni « non conforme », ni
l'inverse rassurant.

## Options écartées

- **Une colonne booléenne par activité, ou une table `ActiviteDeclaree` avec
  clé étrangère.** Les activités vivent dans le référentiel TypeScript
  (ADR-003) : la liste bouge à chaque instruction d'un secteur, et chaque
  mouvement aurait coûté une migration. Une table n'aurait pas non plus pu
  porter de contrainte d'intégrité vers une liste qui n'est pas en base.

- **Ne stocker que les identifiants dans le snapshot** et résoudre les libellés
  à la relecture. C'est un lien vers un référentiel mouvant : un identifiant
  supprimé ou renommé rendrait le document illisible ou, pire, le ferait citer
  un autre libellé que celui qui avait été montré au dirigeant.

- **Déduire la couverture de ce qui est en base** — une unité « Boucherie »
  créée à la main, un équipement de découpe déclaré. C'est une heuristique sur
  du texte libre, donc hors du principe zéro IA ; et elle échouerait
  précisément dans le cas qui motive l'ADR, celui où le dirigeant n'a rien
  créé parce qu'il ne savait pas que le référentiel ne couvrait pas son
  atelier.

- **Refuser la création du dossier** quand le secteur ne couvre pas tout. Un
  refus d'onboarding est plus dangereux qu'un document qui dit ses limites :
  le dirigeant repart sans DUERP du tout.

- **Étendre le référentiel commerce à la boucherie.** C'est le vrai remède,
  activité par activité, et il reste ouvert. Mais il n'est jamais terminé : un
  référentiel a toujours un bord, et le produit doit savoir dire où il est.

## Ce que cette décision ne tranche pas

Ce que le dirigeant fait de la réponse. Un « oui » l'invite à créer une unité
de travail dédiée, qui sera alors signalée « hors référentiel sectoriel » à
l'écran et dans le PDF — mais rien ne l'y oblige et rien ne le vérifie. Relier
les deux (une activité déclarée sans unité correspondante) supposerait un
appariement par le nom, c'est-à-dire l'heuristique que le point 1 écarte.

## Conséquences

- Une liste `activitesNonCouvertes` vide ne veut pas dire « ce secteur couvre
  tout » : elle veut dire que la liste n'a pas encore été instruite. L'étape de
  questions ne s'affiche alors pas, et le document reste muet — c'est le
  comportement voulu, mais il impose de ne jamais lire une liste vide comme une
  garantie.
- Instruire une nouvelle activité pour un secteur ne coûte ni migration ni
  reprise de données : les versions déjà validées gardent la question telle
  qu'elle se posait chez elles, les prochaines poseront la nouvelle.
- Instruire le « pourquoi » d'une activité est un travail de sourçage, pas de
  rédaction : la phrase doit citer l'outil OiRA, la brochure ED ou le dossier
  INRS qui traite l'activité hors de ce référentiel. Le test qui l'exige rend
  la règle exécutable plutôt que déclarative.
- Le PDF a désormais deux mentions voisines qui nuancent la même phrase de
  méthodologie — les unités évaluées hors référentiel, et les activités
  déclarées hors référentiel. Elles restent au même endroit : les disperser
  obligerait le lecteur à recoudre lui-même l'origine des données.
- Le calcul de l'état de couverture est pur et vit à part
  (`src/lib/duerps/couverture.ts`), sans accès base ni horloge, ce qui le rend
  testable ligne à ligne — comme les autres règles métier critiques.
