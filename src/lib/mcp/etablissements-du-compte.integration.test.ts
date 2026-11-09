// Le MCP contre un VRAI PostgreSQL : une clé vaut pour UN établissement, et le
// client qu'il reçoit est borné au COMPTE entier (`clientDuProprietaire`,
// ADR-051). Entre deux établissements du même compte, la seule barrière est le
// `where: { etablissementId }` de chaque lecture de `./queries.ts`
// (vérification du 2026-11-09, audit rls_audit). `tools.test.ts` le vérifie
// sur un client simulé ; ici, chaque outil est appelé sur une base qui porte
// un second établissement aux données marquées, et aucune ne doit sortir.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `ISOLATION_INTEGRATION_URL` pointe une
// base LOCALE migrée. Il n'efface que ce qu'il crée.
//   ISOLATION_INTEGRATION_URL=postgresql://…@localhost:5433/rojer_essai_isolation \
//     pnpm exec vitest run src/lib/mcp/etablissements-du-compte.integration

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.unmock("@/lib/auth/portee/client");
vi.unmock("@/lib/auth/portee/lot-verifie");

const URL_BASE = process.env.ISOLATION_INTEGRATION_URL;
const local = URL_BASE ? /@(localhost|127\.0\.0\.1)[:/]/.test(URL_BASE) : false;

describe.skipIf(!URL_BASE || !local)("MCP — deux établissements d'un même compte, PostgreSQL réel", async () => {
  if (URL_BASE) process.env.DATABASE_URL = URL_BASE;
  const { prisma } = await import("@/lib/prisma");
  const { OUTILS_MCP, contexteMcp } = await import("./tools");

  const compteId = randomUUID();
  const userId = randomUUID();
  // La marque de l'établissement voisin : aucun texte rendu par un outil
  // portant sur l'établissement servi ne doit la contenir.
  const MARQUE = `VOISIN-${randomUUID().slice(0, 8)}`;
  let servi: string;

  async function etablissement(entrepriseId: string, nom: string) {
    const etab = await prisma.etablissement.create({
      data: { entrepriseId, raisonDisplay: nom, adresse: `${nom} rue`, codeNaf: "56.10A", effectifSurSite: 5 },
    });
    const bat = await prisma.batiment.create({ data: { etablissementId: etab.id, nom: `${nom} zone` } });
    await prisma.equipement.create({
      data: { etablissementId: etab.id, batimentId: bat.id, categorie: "EXTINCTEUR", libelle: `${nom} extincteur` },
    });
    await prisma.verification.create({
      data: {
        etablissementId: etab.id,
        obligationId: "incendie-erp-extincteurs-annuelle",
        libelleObligation: `${nom} vérification`,
        periodicite: "annuelle",
        datePrevue: new Date("2026-12-01T00:00:00Z"),
      },
    });
    await prisma.action.create({ data: { etablissementId: etab.id, libelle: `${nom} action`, type: "suppression" } });
    const duerp = await prisma.duerp.create({ data: { etablissementId: etab.id } });
    const unite = await prisma.uniteTravail.create({ data: { duerpId: duerp.id, nom: `${nom} unité` } });
    await prisma.risque.create({
      data: { uniteId: unite.id, libelle: `${nom} risque`, gravite: 2, probabilite: 2, maitrise: 2, criticite: 4 },
    });
    return etab.id;
  }

  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, name: "mcp", email: `${userId}@exemple.invalid` } });
    await prisma.compte.create({
      data: { id: compteId, name: "mcp", slug: compteId, membres: { create: { userId, role: "owner" } } },
    });
    const ent = await prisma.entreprise.create({ data: { compteId, raisonSociale: "Société servie", effectif: 10, adresse: "x" } });
    servi = await etablissement(ent.id, "Servi");
    // Même compte, même entreprise : seul l'identifiant d'établissement sépare.
    await etablissement(ent.id, MARQUE);
  });
  afterAll(async () => {
    await prisma.entreprise.deleteMany({ where: { compteId } });
    await prisma.compte.deleteMany({ where: { id: compteId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("des outils à appeler", () => {
    expect(OUTILS_MCP.length).toBeGreaterThan(3);
  });

  it.each(OUTILS_MCP.map((o) => [o.nom, o] as const))("%s ne rend rien de l'établissement voisin", async (_nom, outil) => {
    const ctx = await contexteMcp({ etablissementId: servi }, new Date("2026-11-09T12:00:00Z"));
    const texte = await outil.executer(ctx, outil.schema.parse({}));
    expect(texte).not.toContain(MARQUE);
  });

  it("témoin : la marque se voit quand la clé est celle du voisin", async () => {
    // Sans ce témoin, un outil qui ne rendrait rien passerait pour borné.
    const voisin = await prisma.etablissement.findFirstOrThrow({ where: { raisonDisplay: MARQUE }, select: { id: true } });
    const ctx = await contexteMcp({ etablissementId: voisin.id }, new Date("2026-11-09T12:00:00Z"));
    const textes = await Promise.all(OUTILS_MCP.map((o) => o.executer(ctx, o.schema.parse({}))));
    expect(textes.filter((t) => t.includes(MARQUE)).length).toBeGreaterThan(2);
  });
});
