/**
 * Le faux client Prisma des tests de régénération.
 *
 * IL HONORE LES `where`, ET C'EST TOUT SON OBJET. La version précédente
 * renvoyait le contenu du magasin sans regarder la clause : `actif: true`,
 * `etablissementId`, le filtre de relation `salarie: { actif }` pouvaient être
 * retirés du code sous test sans qu'aucune assertion ne bouge. Seize garanties
 * du calendrier étaient dans ce cas — elles décrivaient un filtrage que le
 * harnais faisait à leur place, dans la fixture.
 *
 * Ce n'est pas une réimplémentation de Prisma : c'est le sous-ensemble exact
 * que `calendrier/actions.ts` emploie, et rien de plus. Toute clause qu'il ne
 * sait pas interpréter le fait ÉCHOUER — un filtre silencieusement ignoré est
 * précisément le défaut qu'on retire.
 *
 * Trois propriétés qu'il faut lui garder :
 *
 *  1. les lectures filtrent réellement (`where` + `include.<relation>.where`) ;
 *  2. les écritures sont **paresseuses**, comme les `PrismaPromise` : elles ne
 *     s'exécutent qu'au moment où on les attend, ce qui permet à
 *     `$transaction` d'exister autrement qu'en `Promise.all` ;
 *  3. `$transaction` est **atomique** : un échec en cours de lot restaure le
 *     magasin. C'est la seule façon de faire rougir le remplacement de
 *     `$transaction` par une suite d'`await`.
 */

export type EquipementFaux = {
  id: string;
  libelle?: string;
  categorie: string;
  caracteristiques?: Record<string, unknown> | null;
  actif: boolean;
  dateMiseEnService?: Date | null;
};

export type EtablissementFaux = {
  id: string;
  /** Le propriétaire, pour le prédicat `entreprise: { userId }` (ADR-005). */
  userId: string;
  effectifSurSite: number;
  estEtablissementTravail: boolean;
  estERP: boolean;
  estIGH: boolean;
  estHabitation: boolean;
  typeErp: string | null;
  categorieErp: string | null;
  classeIgh: string | null;
  familleHabitation: string | null;
  personnesPresentesHabituellement: number | null;
  manipuleMatieresR422722: boolean | null;
  comporteLocauxSommeilPublic: boolean | null;
  referentielVersionCalendrier?: string | null;
  equipements: EquipementFaux[];
  prescriptionsParticulieres: { id: string; actif: boolean }[];
};

export type SalarieFaux = {
  id: string;
  etablissementId: string;
  actif: boolean;
  nom: string;
  prenom: string;
};

export type TitreFaux = {
  obligationId: string;
  salarieId: string;
  delivreLe: Date;
  echeanceLe: Date | null;
};

export type LigneFausse = {
  id: string;
  etablissementId: string;
  equipementId: string | null;
  salarieId: string | null;
  obligationId: string;
  libelleObligation: string;
  periodicite: string;
  realisateurRequis: string[];
  datePrevue: Date;
  dateRealisee: Date | null;
  statut: string;
  prescriptionId?: string | null;
  archiveLe?: Date | null;
  /** Les rapports attachés à la ligne, avec leur résultat — ce que la
   *  réconciliation lit pour connaître la dernière réalisation (ADR-034).
   *  Indépendant de `nbRapports`, qui est le compte brut. */
  rapports?: { dateRapport: Date; resultat: string }[];
  nbRapports: number;
  nbActions: number;
};

export type Magasin = {
  etablissements: EtablissementFaux[];
  salaries: SalarieFaux[];
  titres: TitreFaux[];
  verifications: LigneFausse[];
  /**
   * Point d'injection de panne : rend `true` pour l'écriture qui doit
   * échouer. Sert à éprouver l'atomicité de la transaction — sans lui, un lot
   * appliqué en `$transaction` et un lot appliqué par des `await` successifs
   * sont indiscernables.
   */
  faireEchouer: ((operation: string) => boolean) | null;
  /**
   * Appelé juste APRÈS la lecture des lignes de calendrier, et avant que la
   * transaction ne s'ouvre. C'est la seule façon de reproduire en test la
   * fenêtre que le code doit tenir : le plan est calculé sur ce qui vient
   * d'être lu, et quelqu'un d'autre écrit avant qu'il ne s'applique.
   *
   * Remis à `null` par le magasin dès qu'il a servi : la régénération relance
   * une passe quand elle détecte l'écart, et une injection qui se répéterait
   * à chaque passe ne décrirait plus un dépôt, mais un client qui écrit sans
   * jamais s'arrêter — ce que la boucle de reprise ne prétend pas absorber.
   */
  apresLecture: (() => void) | null;
  /** Journal des clauses reçues, pour les assertions de portée. */
  journal: { operation: string; where: unknown }[];
};

export function magasinVide(): Magasin {
  return {
    etablissements: [],
    salaries: [],
    titres: [],
    verifications: [],
    faireEchouer: null,
    apresLecture: null,
    journal: [],
  };
}

/** Refus explicite : une clause non interprétée serait un filtre fantôme. */
function inconnu(operation: string, cles: string[]): never {
  throw new Error(
    `faux-prisma : ${operation} a reçu une clause non interprétée ` +
      `(${cles.join(", ")}). Le faux client doit l'honorer, sinon la garantie ` +
      `qui en dépend ne serait plus vérifiée par ce test.`,
  );
}

/**
 * Égalité de deux instants au sens de PostgreSQL, `null` compris.
 *
 * En JavaScript deux `Date` portant la même valeur ne sont pas `===`, et
 * comparer les objets ferait échouer toutes les conditions portant sur
 * `dateRealisee` — donc rendre un compte de zéro, donc faire croire à une
 * écriture conditionnée qui n'a pas pris, indéfiniment.
 */
function memeInstant(a: Date | null, b: Date | null): boolean {
  if (a === null || b === null) return a === b;
  return a.getTime() === b.getTime();
}

/** Une écriture paresseuse, à l'image d'une `PrismaPromise`. */
type Ecriture<T> = PromiseLike<T> & { executer: () => T };

function ecriture<T>(nom: string, corps: () => T): Ecriture<T> {
  let lance: Promise<T> | null = null;
  return {
    executer: corps,
    then<R1, R2>(
      ok?: ((v: T) => R1 | PromiseLike<R1>) | null,
      ko?: ((e: unknown) => R2 | PromiseLike<R2>) | null,
    ) {
      lance ??= (async () => corps())();
      return lance.then(ok, ko);
    },
    // Nommée pour que l'échec d'un lot dise laquelle a cédé.
    get [Symbol.toStringTag]() {
      return nom;
    },
  } as Ecriture<T>;
}

export function fauxPrisma(db: Magasin) {
  let seq = 0;

  const echouerSiDemande = (operation: string) => {
    if (db.faireEchouer?.(operation)) {
      throw new Error(`faux-prisma : panne injectée sur ${operation}`);
    }
  };

  /** Clé d'unicité de `Verification` — `NULLS NOT DISTINCT` compris. */
  const cle = (v: {
    etablissementId: string;
    obligationId: string;
    equipementId?: string | null;
    salarieId?: string | null;
  }) =>
    [
      v.etablissementId,
      v.obligationId,
      v.equipementId ?? "∅",
      v.salarieId ?? "∅",
    ].join("|");

  const etablissement = {
    /** `where: { id }` + `include: { <relation>: { where } }`. */
    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: Record<string, { where?: Record<string, unknown> }>;
    }) => {
      const { id, ...reste } = where;
      if (Object.keys(reste).length > 0) {
        inconnu("etablissement.findUnique", Object.keys(reste));
      }
      db.journal.push({ operation: "etablissement.findUnique", where });
      const etab = db.etablissements.find((e) => e.id === id);
      if (!etab) return null;

      const sortie: Record<string, unknown> = { ...etab };
      for (const [relation, options] of Object.entries(include ?? {})) {
        const liste = (etab as unknown as Record<string, unknown[]>)[relation];
        if (liste === undefined) {
          throw new Error(
            `faux-prisma : relation « ${relation} » absente du magasin.`,
          );
        }
        const filtre = options?.where;
        sortie[relation] =
          filtre === undefined
            ? liste
            : liste.filter((x) =>
                Object.entries(filtre).every(
                  ([champ, valeur]) =>
                    (x as Record<string, unknown>)[champ] === valeur,
                ),
              );
      }
      return sortie;
    },

    /** `where: { id, entreprise: { userId } }` — le prédicat de l'ADR-005. */
    findFirst: async ({
      where,
    }: {
      where: { id?: string; entreprise?: { userId?: string } };
    }) => {
      db.journal.push({ operation: "etablissement.findFirst", where });
      const { id, entreprise, ...reste } = where;
      if (Object.keys(reste).length > 0) {
        inconnu("etablissement.findFirst", Object.keys(reste));
      }
      const trouve = db.etablissements.find(
        (e) =>
          (id === undefined || e.id === id) &&
          (entreprise?.userId === undefined || e.userId === entreprise.userId),
      );
      return trouve ?? null;
    },

    update: ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) =>
      ecriture("etablissement.update", () => {
        echouerSiDemande("etablissement.update");
        db.journal.push({ operation: "etablissement.update", where });
        const etab = db.etablissements.find((e) => e.id === where.id);
        if (!etab) throw new Error(`Établissement ${where.id} introuvable`);
        Object.assign(etab, data);
        return etab;
      }),
  };

  const verification = {
    findMany: async ({ where }: { where: { etablissementId: string } }) => {
      const { etablissementId, ...reste } = where;
      if (Object.keys(reste).length > 0) {
        inconnu("verification.findMany", Object.keys(reste));
      }
      db.journal.push({ operation: "verification.findMany", where });
      const lues = db.verifications
        .filter((v) => v.etablissementId === etablissementId)
        .map((v) => ({
          ...v,
          _count: { rapports: v.nbRapports, actions: v.nbActions },
        }));
      // La fenêtre : le plan va être calculé sur `lues`, et quelqu'un écrit
      // avant qu'il ne s'applique. Le crochet ne sert qu'une fois.
      const crochet = db.apresLecture;
      if (crochet !== null) {
        db.apresLecture = null;
        crochet();
      }
      return lues;
    },

    /**
     * `rapports: { none: {} }` et `actions: { none: {} }` sont les conditions
     * qui empêchent une suppression d'emporter une preuve déposée APRÈS la
     * lecture du plan. Le faux client doit donc les honorer sur son propre
     * compteur (`nbRapports` / `nbActions`), sans quoi le test qui injecte un
     * dépôt entre la lecture et la transaction passerait au vert sans rien
     * prouver.
     */
    deleteMany: (args: {
      where: {
        id: { in: string[] };
        etablissementId?: string;
        rapports?: { none: Record<string, never> };
        actions?: { none: Record<string, never> };
        dateRealisee?: Date | null;
        statut?: { notIn: readonly string[] };
      };
    }) =>
      ecriture("verification.deleteMany", () => {
        echouerSiDemande("verification.deleteMany");
        db.journal.push({
          operation: "verification.deleteMany",
          where: args.where,
        });
        const {
          id,
          etablissementId,
          rapports,
          actions,
          dateRealisee,
          statut,
          ...reste
        } = args.where;
        if (Object.keys(reste).length > 0) {
          inconnu("verification.deleteMany", Object.keys(reste));
        }
        if (rapports !== undefined && Object.keys(rapports.none).length > 0) {
          inconnu("verification.deleteMany", ["rapports.none non vide"]);
        }
        if (actions !== undefined && Object.keys(actions.none).length > 0) {
          inconnu("verification.deleteMany", ["actions.none non vide"]);
        }
        const avant = db.verifications.length;
        db.verifications = db.verifications.filter(
          (v) =>
            !(
              id.in.includes(v.id) &&
              (etablissementId === undefined ||
                v.etablissementId === etablissementId) &&
              (rapports === undefined || v.nbRapports === 0) &&
              (actions === undefined || v.nbActions === 0) &&
              (dateRealisee === undefined ||
                memeInstant(v.dateRealisee, dateRealisee)) &&
              // La quatrième condition (ADR-034) : un statut réalisé est une
              // trace, et la base doit refuser d'emporter la ligne qui le
              // porte, comme elle refuse d'emporter un rapport.
              (statut === undefined || !statut.notIn.includes(v.statut))
            ),
        );
        return { count: avant - db.verifications.length };
      }),

    /**
     * `updateMany` et non `update` : c'est la forme qui accepte une condition
     * autre que l'identifiant, et qui rend un COMPTE — les deux propriétés
     * dont dépend l'écriture conditionnée d'`actions.ts`. Un `update` par id
     * écrirait sans regarder, et ne dirait pas qu'il a écrasé.
     */
    updateMany: (args: {
      where: {
        id: string;
        etablissementId?: string;
        datePrevue?: Date;
        dateRealisee?: Date | null;
        statut?: string;
      };
      data: Record<string, unknown>;
    }) =>
      ecriture("verification.updateMany", () => {
        echouerSiDemande("verification.updateMany");
        db.journal.push({
          operation: "verification.updateMany",
          where: args.where,
        });
        const { id, etablissementId, datePrevue, dateRealisee, statut, ...reste } =
          args.where;
        if (Object.keys(reste).length > 0) {
          inconnu("verification.updateMany", Object.keys(reste));
        }
        const cibles = db.verifications.filter(
          (v) =>
            v.id === id &&
            (etablissementId === undefined ||
              v.etablissementId === etablissementId) &&
            (datePrevue === undefined ||
              memeInstant(v.datePrevue, datePrevue)) &&
            (dateRealisee === undefined ||
              memeInstant(v.dateRealisee, dateRealisee)) &&
            (statut === undefined || v.statut === statut),
        );
        for (const v of cibles) Object.assign(v, args.data);
        return { count: cibles.length };
      }),

    createMany: (args: {
      data: Record<string, unknown>[];
      skipDuplicates?: boolean;
    }) =>
      ecriture("verification.createMany", () => {
        echouerSiDemande("verification.createMany");
        let poses = 0;
        for (const d of args.data) {
          const candidat = d as unknown as LigneFausse;
          const doublon = db.verifications.some(
            (v) => cle(v) === cle(candidat),
          );
          if (doublon) {
            // La contrainte d'unicité de `schema.prisma`
            // (`NULLS NOT DISTINCT`). Sans `skipDuplicates`, Prisma remonte
            // P2002 et fait échouer la transaction entière.
            if (args.skipDuplicates) continue;
            throw Object.assign(
              new Error(
                "Unique constraint failed on the fields: " +
                  "(`etablissementId`,`obligationId`,`equipementId`,`salarieId`)",
              ),
              { code: "P2002" },
            );
          }
          db.verifications.push({
            id: `v-${++seq}`,
            dateRealisee: null,
            nbRapports: 0,
            nbActions: 0,
            ...(d as object),
          } as LigneFausse);
          poses += 1;
        }
        return { count: poses };
      }),

    update: (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) =>
      ecriture("verification.update", () => {
        echouerSiDemande("verification.update");
        db.journal.push({
          operation: "verification.update",
          where: args.where,
        });
        const v = db.verifications.find((x) => x.id === args.where.id);
        if (!v) throw new Error(`Ligne ${args.where.id} introuvable`);
        Object.assign(v, args.data);
        return v;
      }),
  };

  const titreSalarie = {
    /**
     * `where: { salarie: { etablissementId, actif? } }`, `distinct`.
     *
     * Les deux périmètres de `actions.ts` passent par ici, et ils DIFFÈRENT
     * volontairement : générer ne regarde que les personnes présentes, le
     * garde-fou d'applicabilité regarde tous les titres jamais déclarés. Un
     * faux client qui ignore `actif` efface cette distinction.
     */
    findMany: async ({
      where,
      distinct,
    }: {
      where: { salarie: { etablissementId: string; actif?: boolean } };
      distinct?: string[];
    }) => {
      db.journal.push({ operation: "titreSalarie.findMany", where });
      const { etablissementId, actif, ...reste } = where.salarie;
      if (Object.keys(reste).length > 0) {
        inconnu("titreSalarie.findMany", Object.keys(reste));
      }
      const lignes = db.titres
        .map((t) => ({
          titre: t,
          salarie: db.salaries.find((s) => s.id === t.salarieId),
        }))
        .filter(
          ({ salarie }) =>
            salarie !== undefined &&
            salarie.etablissementId === etablissementId &&
            (actif === undefined || salarie.actif === actif),
        )
        .map(({ titre, salarie }) => ({
          obligationId: titre.obligationId,
          salarieId: titre.salarieId,
          delivreLe: titre.delivreLe,
          echeanceLe: titre.echeanceLe,
          salarie: { nom: salarie!.nom, prenom: salarie!.prenom },
        }));

      if (!distinct) return lignes;
      const vus = new Set<string>();
      return lignes.filter((l) => {
        const k = distinct
          .map((c) => String((l as Record<string, unknown>)[c]))
          .join("|");
        if (vus.has(k)) return false;
        vus.add(k);
        return true;
      });
    },
  };

  const rapportVerification = {
    /**
     * `where: { etablissementId, resultat: { in: [...] } }` — la lecture des
     * réalisations par la réconciliation (ADR-034). Le faux client ne stocke
     * que les rapports posés sur la ligne (`rapports` : date et résultat) :
     * c'est tout ce que la réconciliation en lit.
     */
    findMany: async ({
      where,
    }: {
      where: { etablissementId: string; resultat?: { in: readonly string[] } };
    }) => {
      db.journal.push({ operation: "rapportVerification.findMany", where });
      const { etablissementId, resultat, ...reste } = where;
      if (Object.keys(reste).length > 0) {
        inconnu("rapportVerification.findMany", Object.keys(reste));
      }
      if (resultat === undefined) {
        inconnu("rapportVerification.findMany", ["resultat absent"]);
      }
      // Le filtre sur `resultat` est HONORÉ, pas seulement exigé : les
      // rapports posés sur une ligne portent le leur, et un « non vérifiable »
      // ne doit pas ressortir comme une réalisation. Sans cela, retirer le
      // filtre du code de production ne faisait rougir aucun test.
      return db.verifications
        .filter((v) => v.etablissementId === etablissementId)
        .flatMap((v) =>
          (v.rapports ?? []).map((r) => ({
            verificationId: v.id,
            dateRapport: r.dateRapport,
            resultat: r.resultat,
          })),
        )
        .filter((r) => resultat.in.includes(r.resultat));
    },
  };

  const prisma: Record<string, unknown> = {
    etablissement,
    verification,
    titreSalarie,
    rapportVerification,
  };

  /**
   * Séquentielle et ATOMIQUE. Le `Promise.all` d'avant appliquait le lot dans
   * un ordre indéterminé et ne restaurait rien : remplacer `$transaction` par
   * une suite d'`await` ne changeait aucun résultat observable.
   */
  prisma.$transaction = async (arg: unknown) => {
    if (typeof arg === "function") {
      return (arg as (tx: unknown) => Promise<unknown>)(prisma);
    }
    const operations = arg as Ecriture<unknown>[];
    const avant = {
      verifications: db.verifications.map((v) => ({ ...v })),
      etablissements: db.etablissements.map((e) => ({ ...e })),
    };
    const sorties: unknown[] = [];
    try {
      for (const op of operations) sorties.push(op.executer());
    } catch (e) {
      db.verifications = avant.verifications;
      db.etablissements = avant.etablissements;
      throw e;
    }
    return sorties;
  };

  return prisma;
}
