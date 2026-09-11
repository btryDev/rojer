# Où en est le projet — arrêté au 2026-09-09

Cette note existe pour qu'une machine qui n'a pas suivi la journée puisse
reprendre sans rien reconstituer de mémoire. **Elle est datée : si elle contredit
le code, c'est le code qui a raison.**

## À faire en premier sur une machine qui reprend

1. **Ne renommez rien avant d'avoir vérifié que la mémoire se charge.**
   ⚠ **Ce point disait le contraire jusqu'au 2026-09-09, et le conseil était
   dangereux.** Il tenait pour acquis que toutes les machines portaient
   l'arborescence `duerp_outils/testDuerp`, renommée ce jour-là en
   `rojer-outils/rojer`. **C'est faux** : un second poste porte le dépôt en
   `~/Documents/duerp`, chemin qui n'a jamais changé — y appliquer le renommage
   ou le lien symbolique aurait rendu sa mémoire **invisible au lieu de la sauver**.

   La règle juste : **la mémoire de projet de Claude Code est indexée sur le chemin
   du dossier de travail, quel qu'il soit.** Comptez d'abord les entrées de votre
   `MEMORY.md`. Si vous en voyez, ne touchez à rien. Si vous en voyez zéro **et**
   que votre dossier a été renommé, alors seulement posez un lien symbolique de
   l'ancien chemin vers le nouveau.

   **Et sachez que les mémoires ne voyagent pas** : elles vivent hors du dépôt, un
   `git pull` n'en apporte aucune. Le poste d'origine en portait quarante-quatre,
   un second quinze — ce sont deux jeux distincts, et il n'existe aucun moyen de
   les réunir depuis l'un ou l'autre. Ce qui doit survivre à une machine s'écrit
   **dans le dépôt**, c'est la raison d'être de cette note.
2. **Le remote**, si besoin — GitHub redirige un dépôt renommé, donc l'ancien
   fonctionne encore :
   `git remote set-url origin git@github.com-pro:btryDev/rojer.git`
3. **Regarder sur quelle branche est le répertoire.** Sur la machine d'origine il
   est resté sur `garde-fous-tests-2` toute la journée, et **quiconque y
   travaille sans regarder croit être sur `main`**. C'est comme ça qu'un commit
   a atterri dans la branche d'une autre session.
4. **Lire `docs/chantiers-ouverts.md`** — c'est la liste de ce qui reste. Le
   § 11 est le sujet du moment.

## Le sujet du moment : le réconciliateur de calendrier

C'est la pièce qui, à chaque changement du dossier ou du référentiel, compare le
calendrier enregistré à ce que le moteur vient de calculer et décide ligne par
ligne : garder, réaligner, créer, archiver, supprimer. Elle existe pour ne pas
perdre l'historique — ce qui a été fait, quand, avec quelle preuve.

**C'était la pièce la moins regardée du dépôt** : sur une quarantaine de revues,
aucune ne l'avait prise pour sujet, quand le moteur de matching l'a été quatre
fois. On avait beaucoup vérifié *ce qui s'applique*, jamais *ce que devient une
ligne déjà posée*.

Quatre passes le 2026-09-09 — une revue à froid, deux contre-expertises, un
audit, une passe sur base réelle — rendent **seize constats**, dont **deux pertes
de données reproduites**. Verdict d'alors : **pas de refonte** ; le cœur est
juste, ce sont les bords qui cèdent — le câblage, la lecture, les tests.

**Ce verdict a été amendé le 2026-09-10, et il faut le lire avec sa limite.** Il
portait sur la LOGIQUE du réconciliateur, que les quatre passes ont trouvée
juste — et elle l'est. Aucune n'a questionné le MODÈLE qu'il réconcilie : une
rangée `Verification` qui est à la fois une échéance en cours et un porteur
d'historique. C'est de là que descendent tous les constats du lot 3, une part du
lot 2 et la moitié du lot 5. **L'ADR-034 a tranché ce point le 2026-09-10** : la
ligne ne porte plus que l'échéance ouverte, l'historique est dans les rapports
(la variante « une rangée par occurrence » a été proposée puis écartée). Ne pas
lire « pas de refonte » comme « le modèle est bon » : ce n'est pas ce qui a été
mesuré.

- le plan, en six lots ordonnés par dépendance : **`docs/chantiers-ouverts.md` § 11**
- les constats bruts, avec leurs observables : `docs/revues/constats-reconciliateur-2026-09-09.md`
- le banc qui mesure les garanties : `docs/revues/banc-mutation-reconciliateur.py`

**Où en est le plan, au 2026-09-10** — le § 11 fait foi, ceci n'est qu'un
repère :

- **Lot 0, le harnais de test : fait** (2026-09-09). C'était le prérequis de
  tous les autres — quinze garanties restaient vertes quand on retirait ce
  qu'elles prétendaient vérifier. Elles rougissent.
- **Lot 1, l'écriture aveugle : fait** (2026-09-10). Les deux pertes de données
  sont fermées par des écritures conditionnées sur ce que la lecture a vu, plus
  une relance quand le compte rendu par PostgreSQL est plus court que le plan.
  Le faux client sait désormais écrire ENTRE la lecture et la transaction, donc
  les deux pertes ont un test qui les reproduit.
- **Lot 2, le grain de la clé : fait** (2026-09-10). La ligne gelée d'un appareil
  retiré est archivée ou supprimée au lieu d'être comptée en retard à
  perpétuité ; `absorbePar` a enfin un lecteur, et une obligation qui change de
  nom voit sa rangée REPRISE en place, rapport compris, au lieu d'être barrée
  pendant qu'une ligne neuve et urgente apparaît. La règle de fusion N→1 est
  posée à « la plus ancienne » — une déduction nommée, pas un texte : elle
  attend confirmation, et c'est une ligne à changer.
- **Lot 3, le classifieur unique : moitié fait** (2026-09-10). Le marqueur
  d'archivage se lit à la racine et ne se contourne plus (champ requis, sept
  surfaces corrigées). L'autre moitié est **sortie du lot** : elle descend d'un
  défaut de MODÈLE — une rangée qui est à la fois une échéance et un historique —
  et se traite par l'ADR-034 (la ligne ne porte plus que l'échéance ouverte,
  l'historique est dans les rapports), pas par un correctif.
- **Lot 4, l'arithmétique des dates : fait** (2026-09-10). Les fonctions locales
  du générateur sont supprimées ; `calendrier/periodicite.ts` compose
  `lib/dates` avec une table calendaire. Cinq ans après le 1er juin, c'est le
  1er juin. C'est ce qui a fait passer au vert le test rouge exprès de `ge4r`.
- **Lot 5 : prenable**, mais à ne pas faire avant l'ADR-034, qui en dissout la
  moitié (le passage du temps) et ne laisse que le référentiel qui change.

Une remarque sur l'ordre, apprise en chemin : `worktree-ge4-r-hebergement`
n'était PAS retenue par la décision N→1 — elle ajoute deux identifiants et en
rétrécit un troisième, c'est une scission, pas une fusion. Elle attendait le
lot 2 **et** le lot 4, ce que personne n'avait vu ; les deux faits, son test
rouge exprès est vert. Elle vit désormais dans `ge4r-succession`.

## Ce qui reste, en dehors du réconciliateur

Le § 11 est le sujet du moment, **ce n'est pas la liste entière**. `docs/chantiers-ouverts.md`
en porte douze autres, et les lire évite de redécouvrir ce qui est déjà tranché.
Ce sommaire est un aiguillage, jamais un substitut : chaque entrée porte son
observable et sa raison, et plusieurs ont été rayées depuis.

**Prêt à prendre, rien ne bloque :**
- **§ 2 — la date de remise de l'attestation de vigilance.** Le compteur des six
  mois de `D. 8222-5` repart **à chaque écriture** sur la fiche du prestataire :
  la borne n'arrive jamais, l'écran reste vert indéfiniment. Il le *dit* depuis le
  2026-09-02 — c'est le palliatif, pas le remède. Un champ, donc une migration.
- **§ 8 — `GH 61 § 5`**, la vérification quinquennale de la charge calorifique que
  le texte met à la charge des **occupants** d'un IGH, c'est-à-dire l'utilisateur
  même du produit. Le corpus en donnait une raison de non-encodage **fausse**.

**Décisions, pas développement (§ 4) :**
- **La vigilance prestataires est servie et hors périmètre déclaré** : le produit a
  un module entier et vingt citations dessus, alors que le chapitre relève du
  travail illégal. L'assumer, ou déclarer le module hors référentiel.
- **Le type `R` n'est pas subdivisé**, et la lettre le veut. L'encodage met tout `R`
  de 4ᵉ catégorie à trois ans là où le tableau met `R` sans hébergement à cinq :
  **sur-application assumée, du côté court**. Le blocage invoqué est levé depuis le
  2026-09-02 ; la branche `worktree-ge4-r-hebergement` porte le correctif et ne doit
  pas être fusionnée avant le lot 2 du § 11.
- **Les 60 `obligation_manquante` du corpus.** Le § 4 les range comme « pas une
  liste de tâches » — la plupart demandent un attribut de modèle et se *déclarent*.
  **La propriétaire a demandé le 2026-09-08 qu'on s'en occupe** : ce cadrage est donc
  à rouvrir, il n'est plus l'état de la décision.

**Le plus gros, et il n'est pas de l'encodage (§ 8) :**
- **Plus l'établissement est grand, plus la couverture est mince — et rien ne le dit
  au dirigeant.** Un ERP de 3ᵉ catégorie reçoit 28 obligations, un de 5ᵉ en reçoit 32.
  En droit c'est correct ; mais le Livre III (5ᵉ catégorie) est au corpus en
  **intégral, 59 articles**, quand le Livre II (catégories 1 à 4) n'y est qu'en
  **18 articles cités**. Un restaurant de 3ᵉ catégorie voit un dossier qui a l'air
  complet. **Premier geste : mesurer le dénominateur du Livre II** — on sait qu'on en
  cite dix-huit, on ne sait pas combien il en compte.

**Décidé, pas commencé :**
- **§ 10 — le cycle de signature et de contre-signature du plan de prévention.**
  Tranché le 2026-09-07, ordonnancé après les corrections en cours. Six garanties
  à obtenir y sont écrites, dont trois que Rojer ne tient nulle part. Il suppose un
  chemin de modification d'un plan, qui n'existe pas non plus (§ 6 bis).
- **Éclaircir les trous « mécaniques ».** Demandé le 2026-09-08. Les trous de
  *couverture réglementaire* sont bien signalés — 60 obligations marquées au corpus,
  quatre clés d'exclusion, une page dans le produit. Les trous de *mécanique*, non :
  celui du réconciliateur ne vivait que dans un paragraphe d'ADR, écrit par le lot
  qui l'avait créé. Il manque un endroit unique où un lot déclare le manque qu'il
  laisse.

**Bas de liste :**
- **§ 1** — `manipuleMatieresR422722` absent lu « non ». Ne retire rien aujourd'hui.
- **§ 6** — trente adresses de section au lieu d'adresses d'article au corpus ;
  deux comptes de test gardés volontairement en production, un troisième créé par
  erreur et à supprimer.
- **§ 7** — quatre constats visuels sur onze restent ouverts, dont deux jamais
  vérifiés (le guide bloqué à « étape 4 sur 6 », un aplat noir sur la page d'accueil
  qui **ne se mesure pas en développement**).
- **§ 7 bis** — les équipements de protection : un dirigeant ne peut déclarer ni
  casque, ni harnais, ni chaussures de sécurité.
- **§ 9 bis** — `GHW`, une classe d'immeuble qui n'existe pas au CCH ; retrait
  préparé, en attente d'un comptage en production.

**Ce qui est clos et qu'il ne faut pas rouvrir** : le § 3, le § 5 (le contrôle
visuel est terminé, plus aucun écran n'est resté sans données), le § 9 (les sept
listes fermées ont été confrontées à leur texte, trois étaient fausses, corrigées
et tenues par des tests).

## L'état des branches au 2026-09-09

| branche | état |
| --- | --- |
| `main` | **fusionnée le 2026-09-11** depuis `ge4r-succession`, en avance rapide : les lots 1 à 4, l'ADR-034 tranchée, `ge4-r` et sa déclaration de succession. 192 fichiers, 2511 tests. Déployée en production par Vercel |
| `worktree-ge4-r-hebergement` | remplacée par `ge4r-succession`, intacte ; à supprimer quand la propriétaire le dira |
| `ge4r-succession` | **dans `main`**. Reste comme branche de travail ; l'ADR-034 se bâtit sur une branche neuve issue de `main` |
| `worktree-lot1-ecriture-conditionnee` | **dans `main`** via `ge4r-succession` |
| `worktree-sommeil-parcours` | fini, jamais relu ; attend un arbitrage |
| `garde-fous-tests-2` | trois lots de garde-fous, à relire et fusionner |
| `garde-fous-tests` | ancienne branche ; ne diffère que par un commit de règle de conduite, à reposer corrigé sur `main` ou à abandonner |

**`worktree-ge4-r-hebergement` ne devait pas être fusionnée avant le lot 2 du
§ 11 — et, on l'a découvert en chemin, pas avant le lot 4 non plus.** Les deux
sont faits le 2026-09-10 et intégrés dans `ge4r-succession`, où le test
`continuite-identite.test.ts` passe au vert sans avoir été touché sur le fond
(une assertion alignée sur celle de son voisin, rien d'autre). Ce qui suit
décrit ce qui bloquait. Le lot est bon sur tout ce que deux revues ont vérifié, mais il **renomme
un identifiant d'obligation**, et le calendrier rapproche ses lignes par cet
identifiant. Fusionner ferait, pour un internat de 4ᵉ catégorie visité en 2025 :
ligne barrée « Ne s'applique plus », et ligne neuve « à planifier, urgent,
aujourd'hui ». Le test `src/lib/calendrier/continuite-identite.test.ts` de cette
branche le reproduit — il est **rouge exprès**, il devient vert quand la
continuité est corrigée.

## Les décisions qui attendent la propriétaire

Ne pas les trancher, ne pas les contourner.

0. ~~**L'ADR-034**~~ — **tranchée le 2026-09-10**, dans sa variante « une ligne
   ouverte, l'historique dans les rapports », après débat contradictoire avec la
   session GestBAT et lecture de sept GMAO. La variante « une rangée par
   occurrence » est écartée : la loi (`D. 4711-3`, `R. 4323-25/26`) fait tenir
   les rapports, jamais les dates prévues ; l'historique des échéances manquées
   est dérivable et sans lecteur. Le plan est N1–N5 dans l'ADR.
1. **Lot 2 du § 11** — quand N lignes d'équipement sont absorbées par une ligne
   d'établissement, laquelle garde l'historique ? L'ADR-022 dit lui-même que ce
   n'est pas tranché. Posé à « la plus ancienne » le 2026-09-10, en déduction
   nommée et non en texte — voir `reprendreLaRealisation`. **Confirmé ou
   infirmé, c'est une ligne à changer.**
2. **Lot sommeil** — la consigne disait « la réponse du dirigeant prime ». Elle
   ne prime pas : la borne de type et le critère de sommeil se lisent en ET, donc
   un exploitant de type `N` qui déclare héberger voit sa réponse **enregistrée
   et sans effet**. Soit la phrase se corrige, soit la borne cède devant un
   « oui ».
3. **La règle de conduite** de `.claude/CLAUDE.md`, restée sur `garde-fous-tests`
   avec deux erreurs identifiées : à reposer corrigée sur `main`, ou à
   abandonner.

## Les pièges de la machine, appris à leurs dépens

- **Le répertoire principal est partagé** entre sessions. Un `checkout` emporte le
  non-commité d'une autre, et un commit peut atterrir sur sa branche. **Se
  signaler avant tout `checkout`**, et prendre un worktree jetable pour tout
  travail.
- **Un `node_modules` par worktree** : un client Prisma partagé fabrique de
  fausses erreurs `tsc` que `git stash` ne montre pas.
- **`pnpm@10`, jamais `npm`.** Trois processus `npm exec vitest` sont restés
  suspendus **trois heures** et ont saturé la machine, au point qu'un audit a mis
  une heure au lieu de dix minutes. La suite entière prend 7 s : si un test ne
  rend pas en une minute, le tuer.
- **`prisma migrate dev` est interdit** — il vide la base pointée par
  `DIRECT_URL`. `migrate deploy` seulement.
- **Aucune écriture sur le Supabase de production**, et **jamais d'adresse de test
  en `@btry.fr`** : le domaine rejette les inconnus, et un seul rebond a suffi à
  faire avertir le projet.
- **`~/Documents/GestBAT` est un autre projet de la propriétaire, en lecture seule
  stricte.** On s'en inspire, on n'y écrit jamais, on n'en copie pas le code.
- Le projet Vercel s'appelle toujours `test-duerp`. Sans conséquence : `main` part
  en production comme avant.

## La leçon de la semaine, parce qu'elle a coûté trois fois

**Une tâche faite se raye et se date, dans le même commit que la correction.** Une
ligne non rayée a fait relire quatre écrans déjà ouverts, redemander sept
constats clos, et **rapporter à la propriétaire un défaut corrigé quatre jours
plus tôt**. Le corollaire coûte autant : **une raison de non-encodage est une
ligne comme les autres** — une note qui dit « l'attribut n'existe pas » reste
vraie dans le texte longtemps après avoir cessé de l'être en base, et bloque
alors un encodage que plus rien ne bloque.

Et le défaut de fond découvert le 2026-09-09 : **au moins six promesses d'ADR sont
plus larges que ce que le code tient**, dont une qui déclare impossible ce qui
vient d'être reproduit. C'est ce qui a fait passer le réconciliateur pour sûr — il
était bien documenté, et la documentation était en avance sur la réalité.
