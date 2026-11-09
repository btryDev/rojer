// La portée d'un établissement (chantier 3 du renforcement, 2026-11-09).
//
// Un accès sans session — jeton de prestataire, vérification publique d'une
// signature, MCP — reçoit un client borné au compte ET à l'établissement de sa
// preuve (`clientDuProprietaire`, `Portee.etablissementId`). Ce fichier sème
// DEUX établissements complets dans un même compte et une même entreprise, et
// éprouve le client du premier contre chaque ligne du second, pour chaque
// modèle rattaché à un établissement (lus dans `CORRESPONDANCE`, pas recopiés) :
//   - lectures par identifiant : rien ; la ligne du premier : présente ;
//   - écritures par identifiant : refusées, la ligne du second relue intacte ;
//   - création dont une clé désigne une ligne du second : refusée.
// Et ce qui remonte au-dessus de l'établissement :
//   - l'entreprise se lit en champs simples, jamais par une relation qui
//     redescendrait vers les autres établissements ;
//   - les autres racines du compte sont refusées ;
//   - l'établissement et l'entreprise ne s'écrivent pas.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe une
// base LOCALE migrée. Il VIDE les comptes (TRUNCATE).
//   ISOLATION_INTEGRATION_URL=postgresql://…@localhost:5433/rojer_matrice \
//     pnpm exec vitest run src/lib/auth/portee/portee-etablissement.integration

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { estBaseLocale } from "@/test/base-integration";
import { FABRIQUES, type Graine, type Ligne } from "@/test/fabriques-du-compte";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/portee/client");
vi.unmock("@/lib/auth/portee/lot-verifie");

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = estBaseLocale(URL_BASE);

describe.skipIf(!URL_BASE || !local)("portée d'un établissement — PostgreSQL réel", async () => {
  if (URL_BASE && local) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { Prisma } = await import("@prisma/client");
  const { CORRESPONDANCE } = await import("./correspondance");
  const { clesDuCompte, delegueDe, ErreurPortee } = await import("./borne");
  const { clientBorne } = await import("./client");
  const { creerCompteDeTest } = await import("@/test/utilisateur-de-test");

  type Delegue = Record<string, (a: object) => Promise<unknown>>;
  const delegue = (client: unknown, nom: string) => delegueDe<Delegue>(client, nom);
  const MODELES = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));
  const identifiant = (nom: string) => MODELES.get(nom)!.fields.find((f) => f.isId)!.name;
  const CLASSEMENT = CORRESPONDANCE as Record<string, { racine?: string; parent?: string }>;
  /** Les modèles rattachés à un établissement : l'établissement lui-même, et tout ce qui y remonte. */
  const SOUS_ETABLISSEMENT = Object.keys(CLASSEMENT).filter((nom) => CLASSEMENT[nom].parent !== undefined);
  const RACINES = Object.keys(CLASSEMENT).filter((nom) => CLASSEMENT[nom].racine !== undefined);

  const UA = randomUUID();
  const lignes: Record<"un" | "deux", Record<string, Ligne[]>> = { un: {}, deux: {} };
  let un: Graine;
  let deux: Graine;
  let db: ReturnType<typeof clientBorne>;
  /** La même portée, avec une personne qui agit : pour éprouver une clé sans que la clé vers la personne masque le refus. */
  let dbAvecPersonne: ReturnType<typeof clientBorne>;
  let n = 0;

  /**
   * Un établissement complet. Le second partage le compte et l'entreprise du
   * premier : seul l'identifiant d'établissement les sépare. Les racines du
   * compte ne se sèment qu'une fois.
   */
  async function semer(qui: "un" | "deux", depart: Graine): Promise<Graine> {
    const g: Graine = { ...depart };
    for (const [nom, fabriques] of Object.entries(FABRIQUES)) {
      lignes[qui][nom] = [];
      if (qui === "deux" && CLASSEMENT[nom].racine !== undefined) continue;
      for (const fabrique of fabriques) {
        const ligne = (await delegue(prisma, nom).create({ data: fabrique(g, ++n) })) as Ligne;
        lignes[qui][nom].push(ligne);
        g[nom] ??= ligne[identifiant(nom)] as string;
      }
    }
    return g;
  }

  const vider = () => prisma.$executeRawUnsafe('TRUNCATE "Entreprise", "Compte", "User" CASCADE');

  beforeAll(async () => {
    await vider();
    const compte = await creerCompteDeTest(prisma, UA);
    un = await semer("un", { compte, user: UA });
    deux = await semer("deux", { compte, user: UA, Entreprise: un.Entreprise });
    // Le client d'un accès sans session : personne n'agit (`userId: null`).
    db = clientBorne({ type: "compte", compteId: compte, userId: null, etablissementId: un.Etablissement });
    dbAvecPersonne = clientBorne({ type: "compte", compteId: compte, userId: UA, etablissementId: un.Etablissement });
  });
  afterAll(async () => {
    await vider();
    await prisma.$disconnect();
  });

  async function refuse(operation: () => Promise<unknown>, motif?: RegExp) {
    const erreur = await operation().then(
      () => null,
      (e: unknown) => e,
    );
    expect(erreur, "l'opération devait être refusée").not.toBeNull();
    const bornee =
      erreur instanceof ErreurPortee ||
      (erreur instanceof Prisma.PrismaClientKnownRequestError && ["P2025", "P2018"].includes(erreur.code));
    expect(bornee, `refus attendu de la borne, reçu : ${(erreur as Error).message}`).toBe(true);
    if (motif) expect((erreur as Error).message).toMatch(motif);
  }

  describe("couverture", () => {
    it("les deux établissements portent une ligne de chaque modèle rattaché", () => {
      expect(SOUS_ETABLISSEMENT.length).toBeGreaterThan(30);
      const vides = SOUS_ETABLISSEMENT.filter((nom) => lignes.deux[nom].length === 0 || lignes.un[nom].length === 0);
      expect(vides).toEqual([]);
      expect(un.Entreprise).toEqual(deux.Entreprise);
      expect(un.Etablissement).not.toEqual(deux.Etablissement);
    });
  });

  describe.each(SOUS_ETABLISSEMENT)("%s", (nom) => {
    const id = identifiant(nom);
    const ou = (l: Ligne) => ({ [id]: l[id] });

    it("lectures : la ligne de l'autre établissement est absente, celle du sien présente", async () => {
      const d = delegue(db, nom);
      const autre = ou(lignes.deux[nom][0]);
      expect(await d.findUnique({ where: autre })).toBeNull();
      expect(await d.findFirst({ where: autre })).toBeNull();
      expect(await d.findMany({ where: autre })).toEqual([]);
      expect(await d.count({ where: autre })).toBe(0);
      expect(await d.findUnique({ where: ou(lignes.un[nom][0]) })).not.toBeNull();
    });

    it("écritures par identifiant sur l'autre établissement : refusées, la ligne relue intacte", async () => {
      const d = delegue(db, nom);
      const ligne = lignes.deux[nom][0];
      await refuse(() => d.delete({ where: ou(ligne) }));
      if (nom === "Etablissement") await refuse(() => d.deleteMany({ where: ou(ligne) }));
      else expect(await d.deleteMany({ where: ou(ligne) })).toEqual({ count: 0 });
      expect(await delegue(prisma, nom).findUnique({ where: ou(ligne) })).not.toBeNull();
    });

    it.each(clesDuCompte(nom).map((c) => [c.cle] as const))(
      "clé %s vers une ligne de l'autre établissement : création refusée",
      async (cle) => {
        if (nom === "Etablissement") return; // l'établissement ne s'écrit pas (plus bas)
        const v = lignes.deux[nom].findIndex((l) => l[cle] != null);
        const valeur = v >= 0 ? lignes.deux[nom][v][cle] : undefined;
        expect(valeur, `${nom}.${cle} sans valeur dans le second établissement`).toBeDefined();
        // Le client avec une personne qui agit : sans elle, une clé vers la
        // personne (auteur d'un jeton, d'une intervention) serait refusée pour
        // elle-même, et masquerait le refus de la clé éprouvée.
        const donnees = FABRIQUES[nom][v]({ ...un }, ++n);
        await refuse(() => delegue(dbAvecPersonne, nom).create({ data: { ...donnees, [cle]: valeur } }));
      },
    );
  });

  describe("au-dessus de l'établissement", () => {
    it("l'entreprise se lit en champs simples : la sienne, et elle seule", async () => {
      const ent = (await db.entreprise.findMany({ select: { id: true, raisonSociale: true, effectif: true } })) as Ligne[];
      expect(ent.map((e) => e.id)).toEqual([un.Entreprise]);
      const etab = (await db.etablissement.findUnique({ where: { id: un.Etablissement }, include: { entreprise: true } })) as {
        entreprise: Ligne;
      } | null;
      expect(etab?.entreprise.id).toEqual(un.Entreprise);
    });

    it("aucune relation ne redescend de l'entreprise vers les autres établissements", async () => {
      await refuse(() => db.entreprise.findMany({ include: { etablissements: true } }), /hors de l'établissement/);
      await refuse(() => db.entreprise.findMany({ select: { etablissements: { select: { id: true } } } }), /hors de l'établissement/);
      await refuse(
        () => db.entreprise.findMany({ where: { etablissements: { some: { id: deux.Etablissement } } } }),
        /hors de l'établissement/,
      );
      await refuse(
        () => db.etablissement.findMany({ include: { entreprise: { include: { etablissements: true } } } }),
        /hors de l'établissement/,
      );
      await refuse(
        () => db.duerp.findMany({ select: { etablissement: { select: { entreprise: { select: { etablissements: true } } } } } }),
        /hors de l'établissement/,
      );
      await refuse(
        () => db.action.findMany({ where: { etablissement: { entreprise: { etablissements: { some: {} } } } } }),
        /hors de l'établissement/,
      );
    });

    it("l'établissement et l'entreprise ne s'écrivent pas", async () => {
      await refuse(() => db.etablissement.update({ where: { id: un.Etablissement }, data: { raisonDisplay: "x" } }), /portée d'un établissement/);
      await refuse(() => delegue(db, "Etablissement").create({ data: FABRIQUES.Etablissement[0]({ ...un }, ++n) }), /portée d'un établissement/);
      await refuse(() => db.entreprise.update({ where: { id: un.Entreprise }, data: { raisonSociale: "x" } }), /portée d'un établissement/);
    });

    it.each(RACINES.filter((nom) => nom !== "Entreprise"))("%s, racine du compte : refusée", async (nom) => {
      await refuse(() => delegue(db, nom).findMany({}), /portée d'un établissement/);
    });
  });
});
