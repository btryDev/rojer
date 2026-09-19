# Reprendre le projet sur un poste — mis à jour le 2026-09-19

Cette note dit ce qu'un poste qui reprend doit savoir **et que le dépôt ne dit
nulle part ailleurs**. Elle ne recopie plus l'état des chantiers : c'est ce qui
l'avait fait périmer — du 2026-09-10 au 2026-09-19 elle a annoncé une branche
« à ne pas fusionner » qui l'était depuis huit jours.

**Ce qui fait foi :**

| pour savoir… | lire |
| --- | --- |
| ce qui reste à faire, et ce qui est clos | `docs/chantiers-ouverts.md` — chaque entrée faite y est rayée et datée |
| pourquoi une décision est prise | `docs/adr/` (001 à 036) |
| ce qu'une revue a trouvé | `docs/revues/` |
| l'état d'une branche | `git branch -r` et `git log origin/main..<branche>` — jamais un tableau écrit à la main |

**Si cette note contredit le code ou la liste, c'est elle qui a tort.**

## En arrivant sur un poste

1. **Comptez les entrées de votre `MEMORY.md` avant de toucher à quoi que ce
   soit.** La mémoire de projet de Claude Code est indexée sur le chemin du
   dossier de travail, quel qu'il soit : `~/Documents/rojer-outils/rojer` sur un
   poste, `~/Documents/duerp` sur un autre. Si vous voyez des entrées, ne
   renommez rien. **Les mémoires ne voyagent pas** — elles vivent hors du dépôt,
   un `git pull` n'en apporte aucune, et deux postes en portent deux jeux
   distincts. Ce qui doit survivre à une machine s'écrit dans le dépôt.
2. **Regardez sur quelle branche est le répertoire.** Un répertoire principal
   est souvent resté sur la branche d'un lot ; quiconque y travaille sans
   regarder croit être sur `main`. Un commit a déjà atterri ainsi dans la
   branche d'une autre session.
3. **Le remote** : `git@github.com-pro:btryDev/rojer.git`. L'ancien nom
   (`testDuerp`) est redirigé par GitHub et fonctionne encore.
4. **Le `.env` local pointe une base locale** (Docker), jamais Supabase. Les
   identifiants de production ne sont dans aucun fichier du dépôt.

## Comment on livre, depuis le 2026-09-18

**Il n'y a plus de previews** (`docs/chantiers-ouverts.md` § 13) : elles
partageaient la base de production. `vercel.json` coupe le déploiement des
branches `lot/*`, `doc/*`, `fix/*`, `feat/*`, `spike/*`, `perf/*` et
`worktree-*` — **une branche dont le nom ne commence par aucun de ces préfixes
déclenche encore une preview**. Nommez vos branches en conséquence.

- **La preuve avant fusion est locale** : suite complète, `tsc --noEmit`,
  `eslint`, `next build`, plus une relecture neutre. La suite tourne en
  **`TZ=UTC`**, comme Vercel et comme l'intégration continue.
- **`main` part en production à chaque poussée**, et le build rejoue
  `prisma migrate deploy` : fusionner, c'est migrer la base de production.
- **Le contrôle visuel se fait sur la production, après, en lecture seule** —
  et ouvrir un tableau de bord ou un calendrier **écrit**
  (`assurerCalendrierAJour`) ; une fiche ou un registre, non.
- **Rien ne se fusionne dans `main` sans le mot de la propriétaire.**
- `next build` dans un worktree sans `.env` échoue sur
  `/auth/reinitialisation` (client Supabase sans URL) : c'est l'environnement,
  pas un défaut.

## Les décisions qui attendent la propriétaire

Ne pas les trancher, ne pas les contourner. Chacune est détaillée dans
`docs/chantiers-ouverts.md`.

1. **La règle de fusion N→1** (§ 11, lot 2) : quand plusieurs lignes
   d'équipement sont absorbées par une ligne d'établissement, la réalisation
   reprise est « la plus ancienne ». C'est une déduction nommée, pas un texte —
   voir `reprendreLaRealisation`. Confirmée ou infirmée, c'est une ligne à
   changer.
2. **Le lot sommeil** (`worktree-sommeil-parcours`, fini, jamais relu ligne à
   ligne). La consigne disait « la réponse du dirigeant prime » ; elle ne prime
   pas — la borne de type et le critère de sommeil se lisent en ET, donc un
   exploitant de type `N` qui déclare héberger voit sa réponse enregistrée et
   sans effet. Soit la phrase se corrige, soit la borne cède devant un « oui ».
3. **La règle de conduite « une tâche faite se raye »**, restée sur
   `garde-fous-tests` (`be09c0f`) avec deux erreurs identifiées : à reposer
   corrigée sur `main`, ou à abandonner.
4. **`garde-fous-tests-2` a été oubliée, pas abandonnée** (constat du
   2026-09-19). L'intégration continue est entrée dans `main` par un autre
   chemin (`c72930d`) ; ses deux autres lots n'y sont pas — le cloisonnement de
   `construireSnapshot` (`cf1dbb3`) et le balayage des écritures des server
   actions (`a34a297`). À reposer sur `main` sans `58c829f`, puis relecture
   neutre, puis accord.
5. **Dans Vercel** (§ 13) : `MCP_ETABLISSEMENT_ID` désigne en production un
   établissement qui n'existe plus — le serveur MCP n'est relié à aucun
   dossier ; et le stockage des fonctions dépasse le quota de l'offre, la
   rétention des déploiements étant à trente jours.

## Les pièges de la machine, appris à leurs dépens

- **Le répertoire principal est partagé** entre sessions. Un `checkout` emporte
  le non-commité d'une autre. **Se signaler avant tout `checkout`**, et prendre
  un worktree jetable pour tout travail — le sien, pas celui d'un autre : deux
  worktrees sur la même branche font apparaître comme « supprimés » les
  fichiers que l'autre vient de pousser.
- **Un `node_modules` par worktree** : un client Prisma partagé fabrique de
  fausses erreurs `tsc` que `git stash` ne montre pas.
- **`pnpm@10`, jamais `npm`.** Trois processus `npm exec vitest` sont restés
  suspendus trois heures et ont saturé un poste. La suite entière prend une
  dizaine de secondes : si un test ne rend pas en une minute, le tuer.
- **`prisma migrate dev` est interdit** — il vide la base pointée par
  `DIRECT_URL`. `migrate deploy` seulement.
- **Aucune écriture sur le Supabase de production**, et **jamais d'adresse de
  test en `@btry.fr`** : le domaine rejette les inconnus, et un seul rebond a
  suffi à faire avertir le projet.
- **Changer un secret de production coupe la production** tant qu'un nouveau
  déploiement n'a pas repris la valeur — l'ordre qui limite la coupure est au
  § 13.
- **`~/Documents/GestBAT` est un autre projet de la propriétaire, en lecture
  seule stricte.** On s'en inspire, on n'y écrit jamais, on n'en copie pas le
  code.
- **Les sessions de deux postes ne se voient que si un lien Remote Control est
  ouvert**, et leur nom affiché ne dit pas toujours leur sujet : demander à la
  propriétaire le nom de la session visée avant d'écrire à une autre.
- Le projet Vercel s'appelle toujours `test-duerp`. Sans conséquence.

## La leçon qui a coûté le plus, et que cette note a elle-même payée

**Une tâche faite se raye et se date, dans le même commit que la correction.**
Une ligne non rayée a fait relire quatre écrans déjà ouverts, redemander sept
constats clos, rapporter à la propriétaire un défaut corrigé quatre jours plus
tôt — et, ici même, annoncer pendant huit jours qu'une branche fusionnée ne
devait pas l'être. Le corollaire : **un état recopié dans un second document se
périme sans qu'aucun diff ne le touche.** D'où la forme de cette note — elle
aiguille, elle ne recopie pas.
