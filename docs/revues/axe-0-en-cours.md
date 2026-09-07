# Axe 0 — revue d'assemblage (de2d857..2a54efb) — journal en cours

Worktree isolé : `.claude/worktrees/agent-a05740ecfc354e470`, HEAD = `2a54efb58ed838b7e38ed13705b20cb8e4915001`.
Pas de `.env` dans ce worktree (seul `.env.example` présent) : aucune commande ne peut toucher une base réelle, prisma generate ne fait que générer le client.

## (a) Référence verte — constatée, pas relayée

### pnpm install
`pnpm install` OK, respecte le lockfile pnpm@10 (packageManager verrouillé confirmé dans package.json). `postinstall` lance `prisma generate` (génération du client uniquement, aucune commande touchant une base). Build scripts ignorés (avertissement pnpm normal pour @prisma/client, esbuild, sharp, etc., sans incidence sur generate).

### pnpm tsc --noEmit
Sortie : **vide**, code de sortie propre. `time` : `11.26s user 0.53s system 183% cpu 6.406 total`.
→ Aucune erreur TypeScript.

### pnpm test:run (vitest run, suite complète)
Sortie collée intégralement :

```
> duerp@0.1.0 test:run /Users/palomasanchezc/Documents/duerp_outils/testDuerp/.claude/worktrees/agent-a05740ecfc354e470
> vitest run


 RUN  v4.1.4 /Users/palomasanchezc/Documents/duerp_outils/testDuerp/.claude/worktrees/agent-a05740ecfc354e470


 Test Files  133 passed (133)
      Tests  1836 passed (1836)
   Start at  11:02:10
   Duration  5.46s (transform 5.02s, setup 0ms, import 13.66s, tests 4.66s, environment 629ms)
```

`time` global (incluant démarrage pnpm/vitest) : `27.08s user 6.03s system 529% cpu 6.254 total`.

**Résultat constaté : 133 fichiers de test, 1836 tests, 0 échec.** Rien à ouvrir — pas de test en échec à expliquer.

**Référence verte établie moi-même, à 2a54efb, confirmée.**

## (b) Migrations 20260831* — constats un par un

Quatre dossiers, tous présents et lus intégralement :
1. `20260831120000_realisateur_sante_travail`
2. `20260831130000_domaine_prestataire_formation_sante`
3. `20260831140000_realisateur_equipe_pluridisciplinaire`
4. `20260831180000_declaration_etat_permanent`

### Constat 1 — Ordre des timestamps
120000 < 130000 < 140000 < 180000. Ordre strictement croissant, cohérent avec l'ordre de dossier `ls`. **Conforme.**

### Constat 2 — Additivité DDL
Aucun `DROP`, aucun `ALTER COLUMN` restrictif dans les 4 fichiers. Les 3 premières migrations ne font que `ALTER TYPE ... ADD VALUE IF NOT EXISTS ... AFTER ...` (additif par nature, PG12+). La 4e crée une table neuve (`CREATE TABLE`, `CREATE UNIQUE INDEX`, `ADD CONSTRAINT` FK) — pas de colonne NOT NULL sans défaut sur une table déjà peuplée puisque la table est neuve. **Conforme, additif de bout en bout.**

### Constat 3 — Ancres AFTER vs ordre réel de l'enum `Realisateur` dans schema.prisma
Schema (`prisma/schema.prisma:575-601`), ordre réel :
`organisme_agree, organisme_accredite, personne_qualifiee, personne_competente, exploitant, fabricant, bureau_controle, medecin_travail, professionnel_sante_travail, equipe_pluridisciplinaire`.

Migrations :
- 120000 : `ADD VALUE 'medecin_travail' AFTER 'bureau_controle'` puis `ADD VALUE 'professionnel_sante_travail' AFTER 'medecin_travail'`
- 140000 : `ADD VALUE 'equipe_pluridisciplinaire' AFTER 'professionnel_sante_travail'`

Correspond exactement à l'ordre du schéma. **Conforme.**

### Constat 4 — Ancres AFTER vs ordre réel de l'enum `DomainePrestataire`
Schema (`prisma/schema.prisma:769-802`), ordre réel (fin d'enum) :
`... nettoyage, organisme_formation, service_sante_travail, autre`.

Migration 130000 : `ADD VALUE 'organisme_formation' AFTER 'nettoyage'` puis `ADD VALUE 'service_sante_travail' AFTER 'organisme_formation'`.
`autre` préexistait en fin d'enum avant cette migration (valeur terminale) ; les deux nouvelles valeurs s'insèrent avant elle sans la déplacer. **Conforme.**

### Constat 5 — Cohérence schema.prisma ↔ SQL pour `DeclarationEtatPermanent`
Modèle `prisma/schema.prisma:1486-1524` :
- `id String @id @default(cuid())`, `etablissementId String` + relation `onDelete: Cascade`, `obligationId String` (pas de FK, commenté « pas de clé étrangère : le référentiel vit en TypeScript », cohérent avec ADR-003 et le motif du commentaire SQL), `declareLe DateTime @default(now())`, `note String?`, `createdAt`/`updatedAt DateTime @updatedAt`, `@@unique([etablissementId, obligationId])`.
- SQL : colonnes identiques, mêmes types (`TEXT`, `TIMESTAMP(3)`), `declareLe` et `createdAt` avec `DEFAULT CURRENT_TIMESTAMP`, `updatedAt` NOT NULL sans défaut DB (cohérent avec le pattern `@updatedAt` de Prisma observé identique sur tout le reste du schéma — vérifié par grep, valeur posée côté application à l'écriture, pas de défaut DB nulle part pour ce champ dans ce dépôt).
- Index unique : `DeclarationEtatPermanent_etablissementId_obligationId_key` sur `(etablissementId, obligationId)` — correspond à `@@unique([etablissementId, obligationId])`.
- FK : `ON DELETE CASCADE ON UPDATE CASCADE` — correspond à `onDelete: Cascade` (onUpdate Cascade est le défaut Prisma non explicité mais cohérent).
- Relation inverse trouvée : `Etablissement.etatsDeclares DeclarationEtatPermanent[]` (schema.prisma:116).

**Conforme, schéma et SQL alignés.**

### Constat 6 — Comparaison du dossier prisma/migrations/ entre de2d857 et 2a54efb (git ls-tree)
```
git ls-tree -r --name-only de2d857 -- prisma/migrations/ | sort   # 35 entrées (34 migration.sql + migration_lock.toml)
git ls-tree -r --name-only 2a54efb  -- prisma/migrations/ | sort  # 39 entrées (38 migration.sql + migration_lock.toml)
comm -23 before after   # RIEN retiré
comm -13 before after   # 4 fichiers ajoutés, exactement les 4 migrations 20260831* listées ci-dessus
```
**Aucune migration présente à `de2d857` n'a disparu à `2a54efb`.** Aucune migration déjà en prod ne manque du dossier. Seul ajout net : les 4 migrations du 2026-08-31. **Conforme.**

### Constat 7 — Pas de `@default(Realisateur.xxx)` ni `@default(DomainePrestataire.xxx)` dans le schéma
`grep` sur `Realisateur\b` dans schema.prisma : seuls usages hors la définition de l'enum sont `realisateurRequis Realisateur[]` (2 occurrences, sans `@default`). Aucun risque qu'une valeur par défaut de colonne s'appuie sur une position d'enum qui aurait changé. `migration_lock.toml` inchangé (`provider = "postgresql"`), cohérent avec les 4 migrations. **Conforme.**

## Conclusion (b)
Les 4 migrations sont additives, dans le bon ordre, cohérentes avec `schema.prisma` (positions AFTER vérifiées valeur par valeur pour les deux enums), et aucune migration antérieure n'a disparu du dossier entre `de2d857` et `2a54efb`. Aucun constat contraire trouvé après lecture intégrale des 4 fichiers SQL et des sections concernées de `schema.prisma`.

## Ce qui n'est pas encore vérifié
- Le contenu des ADR-024 à 027 n'a pas été relu en détail (uniquement leurs renvois dans les commentaires SQL et le CLAUDE.md).
- Aucune vérification Légifrance des références citées dans les commentaires SQL n'a été refaite (hors périmètre : lecture statique uniquement, demandé explicitement de ne pas exécuter de commande touchant une base — la vérification des sources est mentionnée dans les commentaires mais je ne l'ai pas recroisée moi-même sur Légifrance).
- Pas d'examen du reste des 148 fichiers / 83 commits (hors périmètre de l'axe 0, qui porte sur (a) le vert et (b) les 4 migrations).
