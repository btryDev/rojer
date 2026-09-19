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

/**
 * Un rapport posé sur une ligne. `dateRapport` et `resultat` suffisent à la
 * réconciliation ; les autres champs servent au DÉPÔT et au RETRAIT d'un
 * rapport (`rapports/actions.ts`), qui passent depuis la bascule de l'ADR-036
 * par le même recalcul que la régénération (`recalcul-ligne.ts`) — donc par ce
 * même magasin.
 */
export type RapportFaux = {
  dateRapport: Date;
  resultat: string;
  id?: string;
  /** Départage deux rapports du même jour, comme en base. Absent = ordre de
   *  pose (le magasin le complète). */
  createdAt?: Date;
  echeanceHonoree?: Date | null;
  fichierCle?: string;
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
  statut: string;
  prescriptionId?: string | null;
  archiveLe?: Date | null;
  /** Depuis quand Rojer suit la ligne (ADR-036, D2). `NOT NULL` en base, donc
   *  requis ici : une ligne sans origine n'existe pas. */
  suiviDepuis: Date;
  /** Les rapports attachés à la ligne, avec leur résultat — ce que la
   *  réconciliation lit pour connaître la dernière réalisation (ADR-034).
   *  Indépendant de `nbRapports`, qui est le compte brut. */
  rapports?: RapportFaux[];
  nbRapports: number;
  nbActions: number;
};

/**
 * Les COLONNES de `Verification` que le magasin sait servir à un `select`. Les
 * autres champs de `LigneFausse` — `rapports`, `nbRapports`, `nbActions` — sont
 * l'outillage du test, pas des colonnes : un `select` qui les nommerait décrit
 * une colonne qui n'existe pas en base.
 */
const COLONNES_LIGNE: ReadonlySet<string> = new Set([
  "id",
  "etablissementId",
  "equipementId",
  "salarieId",
  "obligationId",
  "libelleObligation",
  "periodicite",
  "realisateurRequis",
  "datePrevue",
  "statut",
  "prescriptionId",
  "archiveLe",
  "suiviDepuis",
]);

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
  /** Les requêtes brutes reçues (`$queryRaw`) — les verrous `FOR UPDATE`, dans
   *  l'ordre. Un faux client n'a pas de concurrence : on tient la présence du
   *  verrou et son rang, pas son effet. */
  verrous: string[];
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
    verrous: [],
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
 * `datePrevue` — donc rendre un compte de zéro, donc faire croire à une
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

  /**
   * La projection `select` d'une ligne, HONORÉE (2026-09-18, ADR-036 lot 2a).
   *
   * Jusque-là `findMany` rendait la ligne entière quel que soit le `select`, et
   * c'était un filtre fantôme de la même espèce que les `where` ignorés : une
   * colonne retirée du `select` de production — `suiviDepuis`, `archiveLe` —
   * ne faisait rougir aucun test, puisque le faux client la fournissait quand
   * même. Ici seules les clés demandées sortent ; une clé que le magasin ne
   * connaît pas est refusée — elle décrirait une colonne qui n'existe pas, et
   * Prisma la refuserait aussi.
   *
   * `_count` est la seule clé composée : `{ select: { rapports, actions } }`,
   * servie depuis les compteurs bruts de la ligne.
   */
  const projeter = (
    v: LigneFausse,
    select: Record<string, unknown>,
  ): Record<string, unknown> => {
    const sortie: Record<string, unknown> = {};
    for (const [cle, demande] of Object.entries(select)) {
      if (demande === false || demande === undefined) continue;
      if (cle === "_count") {
        const sous = (demande as { select?: Record<string, boolean> }).select ?? {};
        const compte: Record<string, number> = {};
        for (const [relation, voulu] of Object.entries(sous)) {
          if (!voulu) continue;
          if (relation === "rapports") compte.rapports = v.nbRapports;
          else if (relation === "actions") compte.actions = v.nbActions;
          else inconnu("verification.findMany", [`_count.${relation}`]);
        }
        sortie._count = compte;
        continue;
      }
      if (!COLONNES_LIGNE.has(cle)) {
        inconnu("verification.findMany", [`select.${cle}`]);
      }
      // Une colonne nullable absente de la fixture sort `null`, comme en base.
      sortie[cle] = (v as unknown as Record<string, unknown>)[cle] ?? null;
    }
    return sortie;
  };

  const verification = {
    /** `where: { id }` + `select` honoré — la lecture du dépôt et du recalcul. */
    findUnique: async ({
      where,
      select,
    }: {
      where: { id: string };
      select?: Record<string, unknown>;
    }) => {
      const { id, ...reste } = where;
      if (Object.keys(reste).length > 0) {
        inconnu("verification.findUnique", Object.keys(reste));
      }
      db.journal.push({ operation: "verification.findUnique", where });
      const v = db.verifications.find((x) => x.id === id);
      if (!v) return null;
      return select === undefined ? { ...v } : projeter(v, select);
    },

    findMany: async ({
      where,
      select,
    }: {
      where: { etablissementId: string };
      select?: Record<string, unknown>;
    }) => {
      const { etablissementId, ...reste } = where;
      if (Object.keys(reste).length > 0) {
        inconnu("verification.findMany", Object.keys(reste));
      }
      db.journal.push({ operation: "verification.findMany", where });
      const lues = db.verifications
        .filter((v) => v.etablissementId === etablissementId)
        .map((v) =>
          select === undefined
            ? { ...v, _count: { rapports: v.nbRapports, actions: v.nbActions } }
            : projeter(v, select),
        );
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
        statut?: string;
        periodicite?: string;
        prescriptionId?: string | null;
        /** `{ not: null }` = « encore archivée » : la condition de la
         *  réouverture, qui sans elle ne détectait aucune écriture
         *  concurrente (relecture du 2026-09-13). */
        archiveLe?: Date | null | { not: null };
      };
      data: Record<string, unknown>;
    }) =>
      ecriture("verification.updateMany", () => {
        echouerSiDemande("verification.updateMany");
        db.journal.push({
          operation: "verification.updateMany",
          where: args.where,
        });
        const {
          id,
          etablissementId,
          datePrevue,
          statut,
          periodicite,
          prescriptionId,
          archiveLe,
          ...reste
        } = args.where;
        if (Object.keys(reste).length > 0) {
          inconnu("verification.updateMany", Object.keys(reste));
        }
        const archiveLeCorrespond = (v: { archiveLe?: Date | null }) => {
          if (archiveLe === undefined) return true;
          if (archiveLe !== null && typeof archiveLe === "object" && "not" in archiveLe) {
            return (v.archiveLe ?? null) !== archiveLe.not;
          }
          return memeInstant(v.archiveLe ?? null, archiveLe);
        };
        const cibles = db.verifications.filter(
          (v) =>
            v.id === id &&
            (etablissementId === undefined ||
              v.etablissementId === etablissementId) &&
            (datePrevue === undefined ||
              memeInstant(v.datePrevue, datePrevue)) &&
            (statut === undefined || v.statut === statut) &&
            (periodicite === undefined || v.periodicite === periodicite) &&
            (prescriptionId === undefined ||
              (v.prescriptionId ?? null) === prescriptionId) &&
            archiveLeCorrespond(v),
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
          // `suiviDepuis` est `NOT NULL DEFAULT CURRENT_TIMESTAMP` en base :
          // une insertion qui l'omet PASSERAIT, avec l'horloge de PostgreSQL à
          // la place de celle de la passe — le décalage de minuit que la
          // colonne existe pour fermer (ADR-036, D2). Le faux client refuse
          // donc l'omission, pour que son retrait du `createMany` de
          // production fasse rougir un test au lieu de prendre le défaut.
          if (!(candidat.suiviDepuis instanceof Date)) {
            inconnu("verification.createMany", ["suiviDepuis absent"]);
          }
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
     * `where: { salarie: { etablissementId, actif? } }`.
     *
     * `actif` est HONORÉ : c'est lui qui fait sortir une personne partie de la
     * génération ET des titres en vigueur que le réconciliateur consulte
     * (2026-09-17). Un faux client qui l'ignorerait laisserait vert le retrait
     * du filtre. (La seconde lecture, sans `actif` et avec `distinct`, est
     * partie le même jour ; son support ici avec elle.)
     */
    findMany: async (args: {
      where: { salarie: { etablissementId: string; actif?: boolean } };
      select?: unknown;
    }) => {
      // `select` est la projection, rendue ci-dessous ; toute autre clé — un
      // `distinct`, un `orderBy` — serait ignorée en silence, donc refusée.
      const { where } = args;
      const autres = Object.keys(args).filter(
        (k) => k !== "where" && k !== "select",
      );
      if (autres.length > 0) inconnu("titreSalarie.findMany", autres);
      db.journal.push({ operation: "titreSalarie.findMany", where });
      const { etablissementId, actif, ...reste } = where.salarie;
      if (Object.keys(reste).length > 0) {
        inconnu("titreSalarie.findMany", Object.keys(reste));
      }
      return db.titres
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
    },
  };

  /** Les rapports de toutes les lignes, avec la ligne qui les porte. */
  const tousLesRapports = () =>
    db.verifications.flatMap((v) =>
      (v.rapports ?? []).map((r, i) => ({ v, r, rang: i })),
    );
  /** `createdAt`, ou l'ordre de pose à défaut — comme la base départage. */
  const cree = (r: RapportFaux, rang: number) => r.createdAt ?? new Date(rang);

  const rapportVerification = {
    /**
     * Deux formes, et seulement celles-là :
     *  · `where: { etablissementId, resultat: { in } }` — la lecture des
     *    réalisations par la réconciliation (ADR-034) ;
     *  · `where: { verificationId, resultat?: { in } }`.
     * Le filtre sur `resultat` est HONORÉ : un « non vérifiable » ne doit pas
     * ressortir comme une réalisation. Sans cela, retirer le filtre du code de
     * production ne faisait rougir aucun test.
     */
    findMany: async ({
      where,
    }: {
      where: {
        etablissementId?: string;
        verificationId?: string;
        resultat?: { in: readonly string[] };
      };
      select?: unknown;
    }) => {
      db.journal.push({ operation: "rapportVerification.findMany", where });
      const { etablissementId, verificationId, resultat, ...reste } = where;
      if (Object.keys(reste).length > 0) {
        inconnu("rapportVerification.findMany", Object.keys(reste));
      }
      if (etablissementId === undefined && verificationId === undefined) {
        inconnu("rapportVerification.findMany", ["ni établissement ni ligne"]);
      }
      if (etablissementId !== undefined && resultat === undefined) {
        inconnu("rapportVerification.findMany", ["resultat absent"]);
      }
      return tousLesRapports()
        .filter(
          ({ v }) =>
            (etablissementId === undefined || v.etablissementId === etablissementId) &&
            (verificationId === undefined || v.id === verificationId),
        )
        .filter(({ r }) => resultat === undefined || resultat.in.includes(r.resultat))
        .map(({ v, r, rang }) => ({
          id: r.id,
          verificationId: v.id,
          dateRapport: r.dateRapport,
          createdAt: cree(r, rang),
          resultat: r.resultat,
          echeanceHonoree: r.echeanceHonoree ?? null,
        }));
    },

    /** `where: { verificationId, resultat: { in } }`, `orderBy` sur
     *  `dateRapport` puis `createdAt`, HONORÉ — c'est lui qui dit si un dépôt
     *  est antidaté. */
    findFirst: async ({
      where,
      orderBy,
    }: {
      where: { verificationId: string; resultat?: { in: readonly string[] } };
      orderBy?: { dateRapport?: "asc" | "desc"; createdAt?: "asc" | "desc" }[];
      select?: unknown;
    }) => {
      const { verificationId, resultat, ...reste } = where;
      if (Object.keys(reste).length > 0) {
        inconnu("rapportVerification.findFirst", Object.keys(reste));
      }
      const liste = tousLesRapports().filter(
        ({ v, r }) =>
          v.id === verificationId &&
          (resultat === undefined || resultat.in.includes(r.resultat)),
      );
      const sens = orderBy?.[0]?.dateRapport === "asc" ? 1 : -1;
      const second = orderBy?.[1]?.createdAt;
      liste.sort((a, b) => {
        const parDate = sens * (a.r.dateRapport.getTime() - b.r.dateRapport.getTime());
        if (parDate !== 0 || second === undefined) return parDate;
        return (
          (second === "asc" ? 1 : -1) *
          (cree(a.r, a.rang).getTime() - cree(b.r, b.rang).getTime())
        );
      });
      const premier = liste[0];
      return premier === undefined
        ? null
        : { dateRapport: premier.r.dateRapport, resultat: premier.r.resultat };
    },

    findUnique: async ({ where }: { where: { id: string }; select?: unknown }) => {
      const trouve = tousLesRapports().find(({ r }) => r.id === where.id);
      if (!trouve) return null;
      return {
        id: trouve.r.id,
        etablissementId: trouve.v.etablissementId,
        verificationId: trouve.v.id,
        dateRapport: trouve.r.dateRapport,
        resultat: trouve.r.resultat,
        echeanceHonoree: trouve.r.echeanceHonoree ?? null,
        fichierCle: trouve.r.fichierCle ?? `rapports/${trouve.v.etablissementId}/${where.id}`,
      };
    },

    /** Pose le rapport sur sa ligne, et compte une preuve de plus. */
    create: ({
      data,
    }: {
      data: {
        id: string;
        verificationId: string;
        dateRapport: Date;
        resultat: string;
        echeanceHonoree: Date | null;
        fichierCle: string;
      };
    }) =>
      ecriture("rapportVerification.create", () => {
        echouerSiDemande("rapportVerification.create");
        const v = db.verifications.find((x) => x.id === data.verificationId);
        if (!v) throw new Error(`Ligne ${data.verificationId} introuvable`);
        const rapport: RapportFaux = {
          id: data.id,
          dateRapport: data.dateRapport,
          resultat: data.resultat,
          echeanceHonoree: data.echeanceHonoree,
          fichierCle: data.fichierCle,
          createdAt: new Date(Date.now() + ++seq),
        };
        v.rapports = [...(v.rapports ?? []), rapport];
        v.nbRapports += 1;
        return rapport;
      }),

    delete: ({ where }: { where: { id: string } }) =>
      ecriture("rapportVerification.delete", () => {
        echouerSiDemande("rapportVerification.delete");
        const trouve = tousLesRapports().find(({ r }) => r.id === where.id);
        if (!trouve) throw new Error(`Rapport ${where.id} introuvable`);
        trouve.v.rapports = (trouve.v.rapports ?? []).filter((r) => r.id !== where.id);
        trouve.v.nbRapports -= 1;
        return trouve.r;
      }),
  };

  const prisma: Record<string, unknown> = {
    etablissement,
    verification,
    titreSalarie,
    rapportVerification,
  };

  /** Le verrou de ligne (`SELECT … FOR UPDATE`) : journalisé, sans effet. */
  prisma.$queryRaw = async (morceaux: TemplateStringsArray) => {
    db.verrous.push(morceaux.join("?"));
    // Au journal aussi, pour qu'un test puisse dire que le verrou PRÉCÈDE la
    // relecture de la ligne.
    db.journal.push({ operation: "$queryRaw", where: morceaux.join("?") });
    return [];
  };

  /** Une copie profonde de ce qu'une transaction peut écrire. */
  const instantane = () => ({
    verifications: db.verifications.map((v) => ({
      ...v,
      rapports: v.rapports?.map((r) => ({ ...r })),
    })),
    etablissements: db.etablissements.map((e) => ({ ...e })),
  });

  /**
   * Séquentielle et ATOMIQUE. Le `Promise.all` d'avant appliquait le lot dans
   * un ordre indéterminé et ne restaurait rien : remplacer `$transaction` par
   * une suite d'`await` ne changeait aucun résultat observable.
   */
  prisma.$transaction = async (arg: unknown) => {
    if (typeof arg === "function") {
      // La forme INTERACTIVE, atomique elle aussi (2026-09-19) : le dépôt et le
      // retrait d'un rapport y écrivent le rapport PUIS la ligne recalculée ;
      // une levée entre les deux doit tout annuler, rapport compris.
      const avant = instantane();
      try {
        return await (arg as (tx: unknown) => Promise<unknown>)(prisma);
      } catch (e) {
        db.verifications = avant.verifications;
        db.etablissements = avant.etablissements;
        throw e;
      }
    }
    const operations = arg as Ecriture<unknown>[];
    const avant = instantane();
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
