// La suppression d'un compte sans abonnement depuis douze mois (ADR-058)
// contre un VRAI PostgreSQL : tout ce que le compte porte part — versions de
// DUERP comprises —, un réabonnement de dernière minute l'emporte, une
// personne membre d'un autre compte, ou qui y a invité quelqu'un, reste ;
// l'autre compte n'est pas touché.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `STRIPE_INTEGRATION_URL` pointe une
// base LOCALE migrée (même variable que la synchronisation Stripe). Il
// n'efface que ses propres lignes (comptes `…-5e1e7…`).

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/better-auth", () => ({ auth: {} }));
vi.mock("@/lib/auth/require-user", () => ({ lireSessionCourante: async () => null }));

const URL_BASE = process.env.STRIPE_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("suppression d'un compte sans abonnement — PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { supprimerCompte, purgerTracesEchues } = await import("./suppression");

  const A = "00000000-0000-0000-0000-5e1e7000000a";
  const B = "00000000-0000-0000-0000-5e1e7000000b";
  const SEUL = "00000000-0000-0000-0000-5e1e700001aa"; // membre de A seul
  const DEUX = "00000000-0000-0000-0000-5e1e700001bb"; // membre de A et de B
  const MAINTENANT = new Date("2027-12-01T09:00:00Z");
  const ECHU = {
    statut: "canceled",
    sansAbonnementDepuis: new Date("2026-11-01T00:00:00Z"),
    suppressionPrevueLe: new Date("2027-11-30T00:00:00Z"),
    avertiSuppression30Le: new Date("2027-10-31T09:00:00Z"),
    avertiSuppression7Le: new Date("2027-11-23T09:00:00Z"),
  };

  async function menage() {
    for (const compteId of [A, B]) {
      await prisma.duerpVersion.deleteMany({ where: { duerp: { etablissement: { entreprise: { compteId } } } } });
      await prisma.entreprise.deleteMany({ where: { compteId } });
      await prisma.demandeAssistance.deleteMany({ where: { compteId } });
      await prisma.acceptationConditions.deleteMany({ where: { compteId } });
      await prisma.abonnement.deleteMany({ where: { compteId } });
    }
    await prisma.invitationCompte.deleteMany({ where: { compteId: { in: [A, B] } } });
    await prisma.compte.deleteMany({ where: { id: { in: [A, B] } } });
    await prisma.user.deleteMany({ where: { id: { in: [SEUL, DEUX] } } });
    await prisma.compteSupprime.deleteMany({ where: { ancienCompteId: { in: [A, B] } } });
    await prisma.fichierALiberer.deleteMany({ where: { cle: { startsWith: "5e1e7/" } } });
  }

  async function semer() {
    for (const id of [SEUL, DEUX]) {
      await prisma.user.create({ data: { id, name: id, email: `${id}@exemple.invalid` } });
    }
    await prisma.compte.create({
      data: {
        id: A,
        name: "A",
        slug: A,
        membres: { create: [{ userId: SEUL, role: "owner" }, { userId: DEUX, role: "member" }] },
      },
    });
    await prisma.compte.create({ data: { id: B, name: "B", slug: B, membres: { create: { userId: DEUX, role: "owner" } } } });
    for (const compteId of [A, B]) {
      const entreprise = await prisma.entreprise.create({ data: { compteId, raisonSociale: compteId, effectif: 5, adresse: "1 rue" } });
      const etab = await prisma.etablissement.create({
        data: { entrepriseId: entreprise.id, raisonDisplay: compteId, adresse: "1 rue", codeNaf: "56.10A", effectifSurSite: 5 },
      });
      const duerp = await prisma.duerp.create({ data: { etablissementId: etab.id } });
      await prisma.duerpVersion.create({ data: { duerpId: duerp.id, numero: 1, snapshot: {} } });
    }
    await prisma.abonnement.create({ data: { compteId: A, stripeCustomerId: "cus_5e1e7_A", ...ECHU } });
    await prisma.abonnement.create({ data: { compteId: B, stripeCustomerId: "cus_5e1e7_B", statut: "active" } });
    await prisma.acceptationConditions.create({
      data: { compteId: A, userId: SEUL, version: "v", empreinte: "e", contexte: "essai" },
    });
    await prisma.fichierStocke.create({ data: { cle: "5e1e7/a/rapport.pdf", compteId: A, octets: 10 } });
    await prisma.demandeAssistance.create({
      data: { compteId: A, userId: SEUL, categorie: "duerp", message: "aide", page: "/" },
    });
  }

  beforeEach(async () => {
    await menage();
    await semer();
  });
  afterAll(async () => {
    await menage();
    await prisma.$disconnect();
  });

  it("efface tout ce que porte le compte, versions de DUERP comprises ; l'autre compte et la personne qui y est membre restent", async () => {
    expect(await supprimerCompte(A, MAINTENANT)).toEqual(["5e1e7/a/rapport.pdf"]);
    expect(await prisma.compte.findUnique({ where: { id: A } })).toBeNull();
    expect(await prisma.entreprise.count({ where: { compteId: A } })).toBe(0);
    expect(await prisma.abonnement.count({ where: { compteId: A } })).toBe(0);
    expect(await prisma.acceptationConditions.count({ where: { compteId: A } })).toBe(0);
    expect(await prisma.demandeAssistance.count({ where: { compteId: A } })).toBe(0);
    expect(await prisma.user.findUnique({ where: { id: SEUL } })).toBeNull();

    expect(await prisma.user.findUnique({ where: { id: DEUX } })).not.toBeNull();
    expect(await prisma.compte.findUnique({ where: { id: B } })).not.toBeNull();
    expect(await prisma.duerpVersion.count({ where: { duerp: { etablissement: { entreprise: { compteId: B } } } } })).toBe(1);
  });

  it("garde la trace (cinq ans) et note les fichiers à retirer, dans la même transaction", async () => {
    await supprimerCompte(A, MAINTENANT);
    const trace = await prisma.compteSupprime.findFirstOrThrow({ where: { ancienCompteId: A } });
    expect(trace).toMatchObject({
      nom: "A",
      proprietaires: [`${SEUL}@exemple.invalid`],
      acceptations: [expect.objectContaining({ email: `${SEUL}@exemple.invalid`, version: "v", empreinte: "e" })],
      avertiSuppression30Le: ECHU.avertiSuppression30Le,
      avertiSuppression7Le: ECHU.avertiSuppression7Le,
      supprimeLe: MAINTENANT,
      conserverJusquAu: new Date("2032-12-01T09:00:00Z"),
    });
    expect(await prisma.fichierALiberer.findUnique({ where: { cle: "5e1e7/a/rapport.pdf" } })).not.toBeNull();
    // La trace part après cinq ans, pas avant.
    expect(await purgerTracesEchues(new Date("2032-11-30T09:00:00Z"))).toMatchObject({ effacees: 0 });
    await purgerTracesEchues(new Date("2032-12-02T09:00:00Z"));
    expect(await prisma.compteSupprime.count({ where: { ancienCompteId: A } })).toBe(0);
  });

  it("une personne qui a invité sur un autre compte reste : l'historique de ses invitations n'est pas effacé", async () => {
    // SEUL a été membre de B, y a invité quelqu'un, puis en est parti : son
    // invitation a été annulée à son départ, la ligne reste dans l'historique de B.
    await prisma.invitationCompte.create({
      data: { compteId: B, email: "invitee@exemple.invalid", role: "member", status: "canceled", expiresAt: MAINTENANT, inviterId: SEUL },
    });
    expect(await supprimerCompte(A, MAINTENANT)).not.toBeNull();
    expect(await prisma.compte.findUnique({ where: { id: A } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: SEUL } })).not.toBeNull();
    expect(await prisma.invitationCompte.count({ where: { compteId: B, inviterId: SEUL } })).toBe(1);
  });

  it("un réabonnement avant la suppression l'emporte : rien n'est effacé", async () => {
    await prisma.abonnement.update({
      where: { compteId: A },
      data: { statut: "active", sansAbonnementDepuis: null, suppressionPrevueLe: null, avertiSuppression30Le: null, avertiSuppression7Le: null },
    });
    expect(await supprimerCompte(A, MAINTENANT)).toBeNull();
    expect(await prisma.compte.findUnique({ where: { id: A } })).not.toBeNull();
    expect(await prisma.compteSupprime.count({ where: { ancienCompteId: A } })).toBe(0);
    expect(await prisma.duerpVersion.count({ where: { duerp: { etablissement: { entreprise: { compteId: A } } } } })).toBe(1);
  });

  it("date pas encore atteinte, ou second avertissement absent : rien n'est effacé", async () => {
    expect(await supprimerCompte(A, new Date("2027-11-29T09:00:00Z"))).toBeNull();
    await prisma.abonnement.update({ where: { compteId: A }, data: { avertiSuppression7Le: null } });
    expect(await supprimerCompte(A, MAINTENANT)).toBeNull();
    expect(await prisma.compte.findUnique({ where: { id: A } })).not.toBeNull();
  });
});
