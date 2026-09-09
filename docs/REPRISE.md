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
de données reproduites**. **Verdict : pas de refonte.** Le cœur est juste ; ce
sont les bords qui cèdent — le câblage, la lecture, les tests.

- le plan, en six lots ordonnés par dépendance : **`docs/chantiers-ouverts.md` § 11**
- les constats bruts, avec leurs observables : `docs/revues/constats-reconciliateur-2026-09-09.md`
- le banc qui mesure les garanties : `docs/revues/banc-mutation-reconciliateur.py`

**Le lot 0 — réparer le harnais de test — bloque tous les autres.** Seize
garanties sur trente-deux restent vertes quand on retire ce qu'elles prétendent
vérifier, dont le contrôle de propriété entre clients. Le code est juste ; c'est
le faux Prisma des tests qui ignore les `where`, et les fixtures qui pré-filtrent
ce que le code devrait filtrer. Corriger avant, c'est valider avec des tests
aveugles.

## L'état des branches au 2026-09-09

| branche | état |
| --- | --- |
| `main` | à jour, déployée en production par Vercel |
| `worktree-ge4-r-hebergement` | **ne pas fusionner en l'état** — voir ci-dessous |
| `worktree-sommeil-parcours` | fini, jamais relu ; attend un arbitrage |
| `garde-fous-tests-2` | trois lots de garde-fous, à relire et fusionner |
| `garde-fous-tests` | ancienne branche ; ne diffère que par un commit de règle de conduite, à reposer corrigé sur `main` ou à abandonner |

**`worktree-ge4-r-hebergement` ne doit pas être fusionnée avant le lot 2 du
§ 11.** Le lot est bon sur tout ce que deux revues ont vérifié, mais il **renomme
un identifiant d'obligation**, et le calendrier rapproche ses lignes par cet
identifiant. Fusionner ferait, pour un internat de 4ᵉ catégorie visité en 2025 :
ligne barrée « Ne s'applique plus », et ligne neuve « à planifier, urgent,
aujourd'hui ». Le test `src/lib/calendrier/continuite-identite.test.ts` de cette
branche le reproduit — il est **rouge exprès**, il devient vert quand la
continuité est corrigée.

## Les décisions qui attendent la propriétaire

Ne pas les trancher, ne pas les contourner.

1. **Lot 2 du § 11** — quand N lignes d'équipement sont absorbées par une ligne
   d'établissement, laquelle garde l'historique ? L'ADR-022 dit lui-même que ce
   n'est pas tranché. **Sans réponse, ce lot ne démarre pas.**
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
