import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MARQUEUR_NON_APPLICABLE } from "@/lib/calendrier/marqueur";

/**
 * Non-régression sur les invariants de base qui ne vivent PAS dans le client
 * Prisma généré.
 *
 * Le langage Prisma ne sait pas exprimer une CHECK constraint. La contrainte
 * `Action_origine_xor` — « une action a exactement une origine, un risque du
 * DUERP ou une vérification, jamais les deux, jamais aucune » (ADR-002) —
 * n'existe donc que dans le SQL d'une migration. Elle est invisible dans
 * schema.prisma, invisible dans les types générés, et un `prisma db push`
 * (dev, CI) recrée la table `Action` SANS elle : plus rien ne détecterait sa
 * disparition.
 *
 * Ce test est le filet : il relit les fichiers de migration et échoue si la
 * contrainte n'y est plus déclarée, ou si une migration ultérieure la retire.
 * Il ne touche pas à la base — il lit des fichiers, il tourne partout et coûte
 * quelques millisecondes.
 */

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOSSIER_MIGRATIONS = join(RACINE, "prisma", "migrations");

/** Contenu de chaque migration.sql, indexé par nom de dossier (donc trié chronologiquement). */
function lireMigrations(): { nom: string; sql: string }[] {
  return readdirSync(DOSSIER_MIGRATIONS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((nom) => ({
      nom,
      sql: readFileSync(join(DOSSIER_MIGRATIONS, nom, "migration.sql"), "utf8"),
    }));
}

/** Écrase les retours à la ligne et les espaces multiples : le SQL est formaté librement. */
function normaliser(sql: string): string {
  return sql.replace(/\s+/g, " ");
}

describe("contraintes SQL non représentables dans schema.prisma", () => {
  const migrations = lireMigrations();

  it("trouve au moins une migration à analyser", () => {
    // Garde-fou du test lui-même : si le chemin est faux, les assertions
    // suivantes passeraient à vide et le filet serait silencieusement percé.
    expect(migrations.length).toBeGreaterThan(0);
  });

  it("déclare la contrainte XOR d'origine des actions (ADR-002)", () => {
    const declarations = migrations.filter((m) =>
      normaliser(m.sql).includes('CONSTRAINT "Action_origine_xor"'),
    );

    expect(
      declarations.length,
      "Aucune migration ne déclare `Action_origine_xor`. Cette CHECK constraint est le seul garde-fou du XOR risque/vérification (ADR-002) : elle n'est pas exprimable en Prisma et n'existe que dans le SQL.",
    ).toBeGreaterThan(0);
  });

  it("conserve l'expression exacte du XOR (risqueId <> verificationId)", () => {
    // On vérifie l'expression et pas seulement le nom : une contrainte
    // renommée mais vidée de son sens passerait le test précédent.
    const sqlComplet = migrations.map((m) => normaliser(m.sql)).join(" ");

    expect(sqlComplet).toContain(
      'CHECK (("risqueId" IS NULL) <> ("verificationId" IS NULL))',
    );
  });

  it("ne retire jamais la contrainte XOR dans une migration ultérieure", () => {
    const suppressions = migrations.filter((m) =>
      /DROP\s+CONSTRAINT\s+(IF\s+EXISTS\s+)?"Action_origine_xor"/i.test(
        normaliser(m.sql),
      ),
    );

    expect(
      suppressions.map((m) => m.nom),
      "Une migration retire `Action_origine_xor` sans la rétablir. Si la table Action est recréée, le CHECK doit être réappliqué dans la même migration.",
    ).toEqual([]);
  });

  /**
   * L'unicité du calendrier, depuis que `Verification.equipementId` peut être
   * `null` (ADR-022).
   *
   * Prisma ne sait pas exprimer `NULLS NOT DISTINCT` : le `@@unique` du schéma
   * a cédé la place à un `@@index`, et l'unicité n'existe plus que dans le SQL
   * de la migration `porteur_etablissement`. Sans la clause, PostgreSQL
   * considère deux `NULL` comme distincts, et le même couple (établissement,
   * obligation) porté par l'établissement s'insérerait à chaque régénération
   * du calendrier — une ligne de plus par ouverture de page.
   *
   * Ce test lit des FICHIERS de migration : il attrape une migration qui
   * oublierait la clause, ou qui la retirerait. Il n'attrape pas un
   * `prisma db push`, qui contourne les migrations et recréerait l'index
   * d'après le seul schéma — donc sans la clause. Contre celui-là, il n'y a
   * pas de filet ici : `db push` n'a pas sa place sur une base qui porte des
   * données.
   */
  /**
   * La dernière migration qui pose l'index d'unicité du calendrier.
   *
   * Chercher dans l'historique CUMULÉ ne prouve rien : une occurrence ancienne
   * satisfait l'assertion pour toujours. Le test l'a fait pendant quelques
   * heures le 2026-08-27 — le regex avait été desserré pour absorber le
   * renommage de l'index, et il acceptait dès lors la clause posée par une
   * migration antérieure. Un index neuf qui aurait perdu `NULLS NOT DISTINCT`
   * serait passé au vert.
   *
   * Ce qui compte est la dernière définition en date : c'est elle qui vaut en
   * base.
   */
  function dernierIndexUnique(): { nom: string; sql: string } {
    const posees = migrations.filter((m) =>
      /CREATE UNIQUE INDEX "Verification_etablissementId_obligationId_equipement[^"]*_key"/i.test(
        normaliser(m.sql),
      ),
    );
    expect(
      posees.length,
      "Aucune migration ne pose l'index d'unicité du calendrier.",
    ).toBeGreaterThan(0);
    const derniere = posees[posees.length - 1];
    const m = normaliser(derniere.sql).match(
      /CREATE UNIQUE INDEX "Verification_etablissementId_obligationId_equipement[^;]*;/i,
    );
    return { nom: derniere.nom, sql: m ? m[0] : "" };
  }

  it("pose l'unicité du calendrier en NULLS NOT DISTINCT (ADR-022)", () => {
    const dernier = dernierIndexUnique();

    expect(
      dernier.sql,
      `La DERNIÈRE migration qui pose l'index d'unicité du calendrier (${dernier.nom}) le fait sans \`NULLS NOT DISTINCT\`. Sans cette clause, PostgreSQL considère deux NULL comme distincts : les échéances portées par l'établissement ou par un salarié cessent d'être contraintes et se dupliquent à chaque régénération.`,
      // Sur la DERNIÈRE migration qui pose l'index, pas sur l'historique
      // cumulé — voir `dernierIndexUnique` et le commentaire qui l'accompagne.
    ).toMatch(/NULLS NOT DISTINCT/);
  });

  /**
   * Un porteur, pas deux (ADR-023).
   *
   * `equipementId` et `salarieId` sont tous deux nullables ; les deux nuls
   * ensemble signifient « porté par l'établissement ». Ce que la contrainte
   * interdit est de les renseigner ENSEMBLE — une ligne qui désignerait à la
   * fois un appareil et une personne n'aurait pas de clé de réconciliation
   * univoque.
   *
   * Comme le XOR des actions, elle n'est pas exprimable en Prisma et n'existe
   * que dans le SQL. Un `db push` la perdrait sans bruit.
   */
  it("pose et conserve le XOR de porteur sur les vérifications (ADR-023)", () => {
    const sqlComplet = migrations.map((m) => normaliser(m.sql)).join(" ");

    expect(
      sqlComplet,
      "Aucune migration ne déclare `Verification_porteur_xor`. Sans elle, une ligne peut désigner un équipement ET un salarié, et sa clé de réconciliation devient ambiguë (ADR-023).",
    ).toContain('CONSTRAINT "Verification_porteur_xor"');

    expect(
      sqlComplet,
      "La contrainte `Verification_porteur_xor` a été renommée ou vidée de son sens : l'expression attendue autorise les deux nuls (porteur établissement) et interdit les deux renseignés.",
    ).toContain(
      'CHECK ("equipementId" IS NULL OR "salarieId" IS NULL)',
    );

    const suppressions = migrations.filter((m) =>
      /DROP\s+CONSTRAINT\s+(IF\s+EXISTS\s+)?"Verification_porteur_xor"/i.test(
        normaliser(m.sql),
      ),
    );
    expect(
      suppressions.map((m) => m.nom),
      "Une migration retire `Verification_porteur_xor` sans la rétablir.",
    ).toEqual([]);
  });

  it("ne rétablit jamais un @@unique ordinaire sur le triplet (ADR-022)", () => {
    // Une migration générée par Prisma après un retour de `@@unique` dans le
    // schéma poserait `ADD CONSTRAINT ... UNIQUE`, sans la clause. Elle
    // compilerait, passerait la CI, et laisserait la duplication revenir.
    const fautives = migrations.filter((m) =>
      /ADD CONSTRAINT "Verification_etablissementId_obligationId_equipementId_key" UNIQUE/i.test(
        normaliser(m.sql),
      ),
    );

    expect(
      fautives.map((m) => m.nom),
      "Une migration repose l'unicité du triplet en contrainte Prisma ordinaire. Il faut un CREATE UNIQUE INDEX ... NULLS NOT DISTINCT (ADR-022).",
    ).toEqual([]);
  });

  /**
   * La moitié qui compte : le RETRAIT.
   *
   * Le test ci-dessus cherche la clause dans la concaténation de tout
   * l'historique. Une migration ultérieure qui ferait
   * `DROP INDEX "…_key";` sans la recréer laisserait le texte du `CREATE`
   * intact dans son ancien fichier : le test passerait, et l'unicité aurait
   * disparu. C'est exactement le trou que le test frère d'`Action_origine_xor`
   * ferme depuis toujours, et qui n'avait pas été repris ici.
   *
   * La règle : une migration a le droit de déposer l'index, à condition de le
   * reposer dans le même fichier — c'est ce que fait `porteur_etablissement`
   * lui-même, qui commence par un `DROP INDEX IF EXISTS`.
   */
  it("ne retire jamais l'index unique du calendrier sans le reposer (ADR-022)", () => {
    // Le nom évolue avec les colonnes (ADR-023 en a ajouté une). La règle,
    // elle, ne bouge pas : une migration a le droit de déposer l'index unique
    // du calendrier, à condition d'en reposer un — avec la clause — dans le
    // MÊME fichier. C'est ce que font `porteur_etablissement` et
    // `porteur_salarie`.
    const orphelines = migrations.filter((m) => {
      const sql = normaliser(m.sql);
      const retire =
        // Le suffixe `_key` est déterminant : c'est celui des index
        // d'UNICITÉ. La migration `index_redondant` dépose un `_idx`, index
        // ordinaire et sans clause — la déposer est justement ce qu'elle vient
        // faire, et elle n'a rien à reposer.
        /DROP\s+INDEX\s+(IF\s+EXISTS\s+)?"Verification_etablissementId_obligationId_equipement[^"]*_key"/i.test(
          sql,
        );
      if (!retire) return false;
      const repose =
        /CREATE UNIQUE INDEX (IF NOT EXISTS )?"Verification_[^"]*"[^;]*NULLS NOT DISTINCT/i.test(
          sql,
        );
      return !repose;
    });

    expect(
      orphelines.map((m) => m.nom),
      "Une migration retire l'index unique du calendrier sans le recréer avec `NULLS NOT DISTINCT` dans le même fichier. Les échéances portées par l'établissement se dupliqueraient à chaque régénération (ADR-022).",
    ).toEqual([]);
  });
});

/**
 * Le test inverse (ADR-028).
 *
 * Il n'y en avait pas à retourner : l'unicité de `Etablissement.entrepriseId`
 * n'a jamais été gardée ici, alors même qu'elle est de la même famille que ce
 * que ce fichier surveille — un invariant de base dont dépendait du code
 * applicatif, et qu'un `db push` aurait pu perdre en silence. Elle a vécu trois
 * semaines sans filet.
 *
 * Ce qu'on garde maintenant est la décision inverse, et elle a besoin d'un
 * filet pour la même raison exactement : le retour du `@unique` ne serait pas
 * bruyant. Prisma le régénère au premier `prisma migrate dev` lancé sur un
 * schéma où quelqu'un l'aurait remis « pour faire propre » — l'attribut a l'air
 * anodin sur une relation 1-1 apparente —, et le symptôme ne serait pas une
 * erreur mais un dirigeant à deux commerces qui ne peut plus créer le second,
 * avec un message Prisma parlant de contrainte unique.
 *
 * Le couple des deux assertions dit la décision entière, et c'est ce qui rend
 * le test lisible : `Etablissement.entrepriseId` NON, `Entreprise.userId` OUI.
 * Retirer la seconde par symétrie ferait tomber la racine de tenancy de
 * l'ADR-005.
 */
describe("plusieurs établissements par entreprise (ADR-028)", () => {
  const migrations = lireMigrations();
  const schema = readFileSync(join(RACINE, "prisma", "schema.prisma"), "utf8");

  function corpsDuModele(nom: string): string {
    const m = schema.match(new RegExp(`\\bmodel\\s+${nom}\\s*\\{([\\s\\S]*?)\\n\\}`));
    expect(m, `modèle ${nom} introuvable dans schema.prisma`).not.toBeNull();
    return m![1];
  }

  it("la migration qui lève l'unicité existe, et repose l'index simple", () => {
    // Reposer l'index n'est pas cosmétique : lister les établissements d'un
    // compte devient une lecture de chaque rendu du sélecteur.
    const migration = migrations.find((m) =>
      m.nom.endsWith("_multi_etablissements"),
    );
    expect(migration, "la migration de l'ADR-028 est absente").toBeDefined();

    const sql = normaliser(migration!.sql);
    expect(sql).toMatch(
      /DROP\s+INDEX\s+(IF\s+EXISTS\s+)?"Etablissement_entrepriseId_key"/i,
    );
    expect(sql).toMatch(
      /CREATE INDEX (IF NOT EXISTS )?"Etablissement_entrepriseId_idx" ON "Etablissement"\("entrepriseId"\)/i,
    );
  });

  it("aucune migration ne repose l'unicité sur Etablissement.entrepriseId", () => {
    // L'historique cumulé ne peut pas servir : la migration d'août POSE cette
    // unicité, légitimement. Seul ce qui vient APRÈS le retrait compte.
    const retrait = migrations.find((m) => m.nom.endsWith("_multi_etablissements"));
    const fautives = migrations.filter(
      (m) =>
        retrait !== undefined &&
        m.nom > retrait.nom &&
        /(CREATE UNIQUE INDEX|ADD CONSTRAINT)\s+(IF NOT EXISTS\s+)?"Etablissement_entrepriseId[^"]*"/i.test(
          normaliser(m.sql),
        ),
    );

    expect(
      fautives.map((m) => m.nom),
      "Une migration rétablit l'unicité de `Etablissement.entrepriseId`. Elle " +
        "interdirait le second établissement d'un compte — et le symptôme " +
        "serait une erreur de contrainte unique au moment de la création, pas " +
        "une régression visible en revue (ADR-028).",
    ).toEqual([]);
  });

  it("Etablissement.entrepriseId n'est plus @unique au schéma", () => {
    const corps = corpsDuModele("Etablissement");
    const ligne = corps.match(/^\s*entrepriseId\s+String.*$/m);

    expect(ligne, "champ `entrepriseId` introuvable").not.toBeNull();
    expect(
      ligne![0],
      "Le `@unique` est revenu sur `Etablissement.entrepriseId`. Une " +
        "entreprise porte autant d'établissements qu'elle en a (ADR-028).",
    ).not.toContain("@unique");
  });

  it("Entreprise.userId reste @unique — la racine de tenancy ne bouge pas", () => {
    // La moitié qu'on n'a PAS décidée. Un compte reste une entreprise : c'est
    // ce qui permet aux dix helpers de `auth/scope.ts` de borner par
    // `entreprise.userId`, et au serveur MCP de résoudre `jeton.sub` sans
    // ambiguïté sur le premier maillon.
    const corps = corpsDuModele("Entreprise");
    const ligne = corps.match(/^\s*userId\s+String.*$/m);

    expect(ligne, "champ `userId` introuvable").not.toBeNull();
    expect(
      ligne![0],
      "`Entreprise.userId` a perdu son `@unique`. L'ADR-028 ne décide PAS le " +
        "multi-utilisateur : sans cette unicité, `jeton.sub → Entreprise` " +
        "cesse d'être univoque et tout le cloisonnement applicatif avec lui.",
    ).toContain("@unique");
  });
});

describe("conservation 40 ans du DUERP (art. R. 4121-4 CT)", () => {
  /**
   * Une DuerpVersion figée ne peut pas être détruite avant 40 ans. Le garde-fou
   * est le `onDelete: Restrict` sur les deux maillons Etablissement → Duerp →
   * DuerpVersion : la base refuse la suppression tant qu'un DUERP versionné
   * existe. Repasser l'un des deux en Cascade rendrait à nouveau possible
   * l'effacement silencieux de toutes les versions archivées depuis une simple
   * suppression d'établissement.
   *
   * Contrairement au XOR, cet invariant est bien exprimé dans schema.prisma —
   * c'est donc ce fichier qu'on relit.
   */
  const schema = readFileSync(join(RACINE, "prisma", "schema.prisma"), "utf8");

  /** Extrait le corps d'un modèle Prisma par son nom. */
  function corpsDuModele(nom: string): string {
    const m = schema.match(new RegExp(`\\bmodel\\s+${nom}\\s*\\{([\\s\\S]*?)\\n\\}`));
    expect(m, `modèle ${nom} introuvable dans schema.prisma`).not.toBeNull();
    return m![1];
  }

  // Le garde-fou de conservation porte sur le maillon qui porte la preuve, pas
  // sur la coquille : un DUERP ouvert mais jamais validé n'a rien à conserver.
  // `Duerp.etablissement` reste donc en Cascade — le Restrict de DuerpVersion
  // suffit à faire échouer toute la transaction dès qu'une version figée existe.
  // Le mettre en Restrict rendrait l'établissement indélébile sans motif légal.
  it("Duerp.etablissement reste en Cascade — le refus vient de DuerpVersion", () => {
    const corps = corpsDuModele("Duerp");
    const relation = corps.match(/etablissement\s+Etablissement\s+@relation\([^)]*\)/);

    expect(relation).not.toBeNull();
    expect(relation![0]).toContain("onDelete: Cascade");
  });

  it("DuerpVersion.duerp est en Restrict, pas en Cascade", () => {
    const corps = corpsDuModele("DuerpVersion");
    const relation = corps.match(/duerp\s+Duerp\s+@relation\([^)]*\)/);

    expect(relation).not.toBeNull();
    expect(relation![0]).toContain("onDelete: Restrict");
  });
});

describe("le bâtiment est un lieu, jamais un régime (ADR-019)", () => {
  /**
   * Deux invariants, deux filets.
   *
   * En base : tout équipement est dans un bâtiment (`batimentId` NOT NULL), et
   * supprimer un bâtiment ne peut pas emporter un équipement — donc ses
   * vérifications et ses rapports (ADR-012). La migration doit backfiller
   * AVANT de poser le NOT NULL, sans quoi elle échoue sur toute base qui a
   * déjà des équipements.
   *
   * Dans le schéma : `Batiment` ne porte aucun champ de régime. Un `estERP`
   * posé « par réflexe » sur le bâtiment classerait chaque corps séparément,
   * ce qui sous-catégorise un ERP contigu — pire que l'approximation actuelle.
   */
  const schema = readFileSync(join(RACINE, "prisma", "schema.prisma"), "utf8");
  const migrations = lireMigrations();
  const migration = migrations.find((m) => m.nom.endsWith("_batiment_lieu"));

  function corpsDuModele(nom: string): string {
    const m = schema.match(new RegExp(`\\bmodel\\s+${nom}\\s*\\{([\\s\\S]*?)\\n\\}`));
    expect(m, `modèle ${nom} introuvable dans schema.prisma`).not.toBeNull();
    return m![1];
  }

  it("la migration existe", () => {
    expect(migration).toBeDefined();
  });

  it("backfille un bâtiment principal et rattache les équipements AVANT le NOT NULL", () => {
    const sql = normaliser(migration!.sql);
    const insertion = sql.indexOf('INSERT INTO "Batiment"');
    const rattachement = sql.indexOf('UPDATE "Equipement"');
    const nonNul = sql.indexOf('ALTER COLUMN "batimentId" SET NOT NULL');

    expect(insertion, "pas de création de bâtiment principal").toBeGreaterThan(-1);
    expect(rattachement, "les équipements ne sont pas rattachés").toBeGreaterThan(insertion);
    expect(nonNul, "le NOT NULL manque").toBeGreaterThan(rattachement);
  });

  it("Equipement.batiment est requis et ne se supprime jamais en cascade", () => {
    const corps = corpsDuModele("Equipement");
    expect(corps).toMatch(/\bbatimentId\s+String\b(?!\?)/);
    const relation = corps.match(/batiment\s+Batiment\s+@relation\([^)]*\)/);
    expect(relation).not.toBeNull();
    // NoAction, pas Restrict : même garantie, contrôlée en fin d'instruction.
    // Restrict, vérifié ligne à ligne, faisait échouer la suppression d'un
    // établissement selon l'ordre des cascades — cf. _batiment_fk_no_action.
    expect(relation![0]).toContain("onDelete: NoAction");

    const fk = migrations.flatMap(
      (m) =>
        normaliser(m.sql).match(
          /"Equipement_batimentId_fkey"[^;]*REFERENCES "Batiment"[^;]*/gi,
        ) ?? [],
    );
    expect(fk.length, "aucune migration ne pose la FK").toBeGreaterThan(0);
    // La dernière migration qui touche la FK fait foi.
    expect(fk.at(-1)).toContain("ON DELETE NO ACTION");
  });

  it("supprimer un bâtiment reste impossible tant qu'il contient un équipement", () => {
    // L'invariant ADR-019 ne tient plus par la base seule une fois la FK en
    // NoAction sur une suppression d'établissement : c'est `supprimerBatiment`
    // qui déplace le contenu avant, et la FK qui refuse en fin d'instruction
    // si quelque chose a été oublié. Les deux doivent rester en place.
    const actions = readFileSync(
      join(RACINE, "src", "lib", "batiments", "actions.ts"),
      "utf8",
    );
    for (const table of ["equipement", "pointReleve", "permisFeu", "planPrevention"]) {
      expect(actions, `${table} n'est pas déplacé avant la suppression`).toContain(
        `tx.${table}.updateMany(deplacement)`,
      );
    }
    expect(actions.indexOf("tx.batiment.delete")).toBeGreaterThan(
      actions.indexOf("tx.planPrevention.updateMany"),
    );
  });

  it("aucune migration ultérieure ne repasse Equipement.batimentId en CASCADE", () => {
    const fautives = migrations.filter(
      (m) =>
        m.nom > migration!.nom &&
        /"Equipement_batimentId_fkey"[^;]*ON DELETE CASCADE/i.test(normaliser(m.sql)),
    );
    expect(fautives.map((m) => m.nom)).toEqual([]);
  });

  it("Batiment ne porte aucun régime ni catégorie", () => {
    const corps = corpsDuModele("Batiment");
    for (const champ of [
      "estERP",
      "estIGH",
      "estHabitation",
      "estEtablissementTravail",
      "typeErp",
      "categorieErp",
      "classeIgh",
      "effectif",
    ]) {
      expect(corps, `\`${champ}\` n'a rien à faire sur Batiment (ADR-019)`).not.toContain(champ);
    }
  });

  it("les rattachements optionnels sont en SetNull, pas en Cascade", () => {
    for (const modele of ["PointReleve", "PermisFeu", "PlanPrevention"]) {
      const corps = corpsDuModele(modele);
      const relation = corps.match(/batiment\s+Batiment\?\s+@relation\([^)]*\)/);
      expect(relation, `${modele}.batiment manquant`).not.toBeNull();
      expect(relation![0]).toContain("onDelete: SetNull");
    }
  });
});

describe("Verification.salarieId — Restrict, comme DuerpVersion.duerp", () => {
  /**
   * Le schéma affirme : « C'est le même garde-fou que `DuerpVersion.duerp`, et
   * la même forme. » `DuerpVersion.duerp` a son test ici depuis longtemps ;
   * `Verification_salarieId_fkey` n'y figurait pas. La parité était donc
   * affirmée sans être vérifiée — et c'est elle qui empêche qu'une suppression
   * de salarié emporte la preuve qu'il était habilité au moment où il a opéré
   * (`docs/rgpd.md` § 4.3).
   */
  const schema = readFileSync(join(RACINE, "prisma", "schema.prisma"), "utf8");

  it("la relation est déclarée en Restrict au schéma", () => {
    const m = schema.match(/\bmodel\s+Verification\s*\{([\s\S]*?)\n\}/);
    expect(m, "modèle Verification introuvable").not.toBeNull();
    const relation = m![1].match(/salarie\s+Salarie\?\s+@relation\([^)]*\)/);
    expect(
      relation,
      "la relation `Verification.salarie` est introuvable",
    ).not.toBeNull();
    expect(relation![0]).toContain("onDelete: Restrict");
  });
});


describe("les locaux à sommeil sont nullables, et c'est une décision (lot A11)", () => {
  /**
   * Même filet que la famille d'habitation ci-dessous, et pour un enjeu plus
   * direct : cette colonne décide de QUATRE lignes de calendrier — PE 4 § 1,
   * PE 33, PE 35 et PE 37 de l'arrêté du 25 juin 1980.
   *
   * Un `NOT NULL DEFAULT false` posé plus tard « pour faire propre »
   * répondrait « je n'ai pas de chambres » à la place de chaque hôtelier qui
   * n'a pas encore lu la question, et lui retirerait sa visite de commission
   * quinquennale en silence. C'est exactement l'affirmation fausse que la
   * règle du non-renseigné existe pour empêcher : `null` veut dire « pas
   * encore répondu », jamais « non ».
   *
   * Le moteur, lui, ne retire rien en attendant : il retient l'obligation et
   * la marque « à confirmer » (`evaluerLocauxSommeil`, `matching/engine.ts`).
   */
  const schema = readFileSync(join(RACINE, "prisma", "schema.prisma"), "utf8");
  const migrations = lireMigrations();

  it("crée la colonne dans une migration dédiée", () => {
    const migration = migrations.find((m) =>
      m.nom.endsWith("_locaux_sommeil"),
    );
    expect(
      migration,
      "La migration `_locaux_sommeil` a disparu. La colonne ne peut pas naître d'un `db push`.",
    ).toBeDefined();
    const sql = normaliser(migration!.sql);
    expect(sql).toContain(
      'ALTER TABLE "Etablissement" ADD COLUMN "comporteLocauxSommeilPublic"',
    );
  });

  it("ne pose ni NOT NULL ni valeur par défaut", () => {
    // Les deux sont vérifiés, et séparément : un `DEFAULT false` seul suffit à
    // répondre à la place du dirigeant, même sans contrainte NOT NULL, parce
    // que toute ligne existante reçoit la valeur.
    const migration = migrations.find((m) =>
      m.nom.endsWith("_locaux_sommeil"),
    );
    const sql = normaliser(migration!.sql);
    expect(
      sql,
      "La colonne a été posée NOT NULL : `null` est la réponse « pas encore répondu », et aucune autre ne peut être inventée pour les dossiers antérieurs.",
    ).not.toContain('"comporteLocauxSommeilPublic" BOOLEAN NOT NULL');
    expect(
      sql,
      "Un DEFAULT répondrait « non » à la place du dirigeant sur tous les dossiers existants, et retirerait quatre obligations en silence.",
    ).not.toMatch(/comporteLocauxSommeilPublic[^;]*DEFAULT/i);
  });

  it("garde la colonne optionnelle dans le schéma Prisma", () => {
    const m = schema.match(/\bmodel\s+Etablissement\s*\{([\s\S]*?)\n\}/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/comporteLocauxSommeilPublic\s+Boolean\?/);
  });
});


describe("la famille d'habitation est nullable, et c'est une décision (ADR-025 § 4)", () => {
  /**
   * Ce que ce filet garde n'est pas la présence du champ — le client Prisma
   * la signalerait — mais son **absence de contrainte NOT NULL**.
   *
   * Un `NOT NULL` posé plus tard « pour faire propre » exigerait un défaut, et
   * le seul défaut possible serait une famille inventée pour des immeubles
   * dont personne n'a lu le dossier. C'est exactement l'affirmation fausse que
   * ce champ existe pour retirer : neuf obligations d'habitation étaient déjà
   * servies sans distinction de famille.
   *
   * L'exigence vit dans les schémas Zod de création, où elle ne met en défaut
   * que les dossiers neufs.
   */
  const schema = readFileSync(join(RACINE, "prisma", "schema.prisma"), "utf8");
  const migrations = lireMigrations();

  it("crée l'enum et la colonne dans une migration dédiée", () => {
    const migration = migrations.find((m) =>
      m.nom.endsWith("_famille_habitation"),
    );
    expect(
      migration,
      "La migration `_famille_habitation` a disparu. La colonne ne peut pas naître d'un `db push`.",
    ).toBeDefined();
    const sql = normaliser(migration!.sql);
    expect(sql).toContain('CREATE TYPE "FamilleHabitation"');
    expect(sql).toContain('ALTER TABLE "Etablissement" ADD COLUMN "familleHabitation"');
    expect(
      sql,
      "La colonne a été posée NOT NULL : les dossiers d'habitation antérieurs n'ont pas de famille, et aucun défaut ne peut être inventé pour eux.",
    ).not.toContain('"familleHabitation" "FamilleHabitation" NOT NULL');
  });

  it("garde la colonne optionnelle dans le schéma Prisma", () => {
    const m = schema.match(/\bmodel\s+Etablissement\s*\{([\s\S]*?)\n\}/);
    expect(m).not.toBeNull();
    expect(m![1]).toMatch(/familleHabitation\s+FamilleHabitation\?/);
  });

  it("scinde la 3ᵉ famille en A et B", () => {
    // La distinction porte des obligations différentes. La rattraper après
    // coup supposerait de redemander sa famille à chaque dossier déjà saisi.
    const m = schema.match(/enum\s+FamilleHabitation\s*\{([\s\S]*?)\n\}/);
    expect(m, "enum FamilleHabitation introuvable").not.toBeNull();
    expect(m![1]).toContain("TROISIEME_A");
    expect(m![1]).toContain("TROISIEME_B");
  });
});

// ---------------------------------------------------------------------------
// ADR-034, lot N1 — `archiveLe` et `echeanceHonoree`
// ---------------------------------------------------------------------------
describe("la ligne ne porte que l'échéance ouverte (ADR-034, N1)", () => {
  const schema = readFileSync(join(RACINE, "prisma", "schema.prisma"), "utf8");
  const migration = lireMigrations().find((m) =>
    m.nom.endsWith("_ligne_ouverte_archive_echeance_honoree"),
  );

  it("pose les deux colonnes, nullables, dans une migration dédiée", () => {
    expect(migration, "La migration du lot N1 a disparu.").toBeDefined();
    const sql = normaliser(migration!.sql);
    expect(sql).toContain(
      'ALTER TABLE "Verification" ADD COLUMN IF NOT EXISTS "archiveLe" TIMESTAMP(3);',
    );
    expect(sql).toContain(
      'ALTER TABLE "RapportVerification" ADD COLUMN IF NOT EXISTS "echeanceHonoree" TIMESTAMP(3);',
    );
    expect(schema).toMatch(/\n\s+archiveLe\s+DateTime\?\n/);
    expect(schema).toMatch(/\n\s+echeanceHonoree\s+DateTime\?\n/);
  });

  it("rétro-remplit sur le préfixe EXACT du marqueur", () => {
    // Le SQL recopie le préfixe à la main — une migration ne peut pas importer
    // de TypeScript. Un tiret simple à la place du cadratin, une espace en
    // moins, et le rétro-remplissage ne toucherait aucune ligne, sans erreur.
    const echappe = MARQUEUR_NON_APPLICABLE.replace(/'/g, "''");
    expect(migration!.sql).toContain(
      `starts_with("libelleObligation", '${echappe}')`,
    );
  });
});
