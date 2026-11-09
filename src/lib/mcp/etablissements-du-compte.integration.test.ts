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
  const { creerCompteDeTest, effacerUtilisateursDeTest } = await import("@/test/utilisateur-de-test");

  const userId = randomUUID();
  let compteId = "";
  // La marque de l'établissement voisin : aucun texte rendu par un outil
  // portant sur l'établissement servi ne doit la contenir.
  const MARQUE = `VOISIN-${randomUUID().slice(0, 8)}`;
  let servi: string;
  let voisin: string;

  /**
   * Un établissement et une ligne de chaque donnée qu'un outil rend. `marque`
   * va dans les DONNÉES (adresse, libellés), jamais dans le nom de
   * l'établissement : chaque réponse en porte le nom en tête
   * (`avecEtablissement`), et un nom marqué ferait passer chaque témoin sans
   * rien prouver des lectures.
   */
  async function etablissement(entrepriseId: string, nom: string, marque: string) {
    const etab = await prisma.etablissement.create({
      data: { entrepriseId, raisonDisplay: nom, adresse: `${marque} rue`, codeNaf: "56.10A", effectifSurSite: 5 },
    });
    const bat = await prisma.batiment.create({ data: { etablissementId: etab.id, nom: `${marque} zone` } });
    await prisma.equipement.create({
      data: { etablissementId: etab.id, batimentId: bat.id, categorie: "EXTINCTEUR", libelle: `${marque} extincteur` },
    });
    await prisma.verification.create({
      data: {
        etablissementId: etab.id,
        obligationId: "incendie-erp-extincteurs-annuelle",
        libelleObligation: `${marque} vérification`,
        periodicite: "annuelle",
        datePrevue: new Date("2026-12-01T00:00:00Z"),
      },
    });
    const duerp = await prisma.duerp.create({ data: { etablissementId: etab.id } });
    const unite = await prisma.uniteTravail.create({ data: { duerpId: duerp.id, nom: `${marque} unité` } });
    const risque = await prisma.risque.create({
      data: { uniteId: unite.id, libelle: `${marque} risque`, gravite: 2, probabilite: 2, maitrise: 2, criticite: 4 },
    });
    // Une action a une origine, risque XOR vérification (`Action_origine_xor`).
    await prisma.action.create({
      data: { etablissementId: etab.id, risqueId: risque.id, libelle: `${marque} action`, type: "suppression" },
    });
    return etab.id;
  }

  beforeAll(async () => {
    compteId = await creerCompteDeTest(prisma, userId);
    const ent = await prisma.entreprise.create({ data: { compteId, raisonSociale: "Société servie", effectif: 10, adresse: "x" } });
    servi = await etablissement(ent.id, "Servi", "SERVI");
    // Même compte, même entreprise : seul l'identifiant d'établissement sépare.
    voisin = await etablissement(ent.id, "Voisin", MARQUE);
  });
  afterAll(async () => {
    await prisma.entreprise.deleteMany({ where: { compteId } });
    await prisma.compte.deleteMany({ where: { id: compteId } });
    await effacerUtilisateursDeTest(prisma, [userId]);
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

  /**
   * Les outils qui ne rendent aucune donnée marquée, et pourquoi. Vide : chacun
   * des cinq rend au moins une ligne. Un outil ajouté qui n'en rend pas doit
   * être nommé ici, sinon son témoin tombe — et son test négatif ne prouverait
   * rien.
   */
  const SANS_DONNEE_MARQUEE: Record<string, string> = {};

  it.each(OUTILS_MCP.map((o) => [o.nom, o] as const))(
    "témoin : %s rend les données du voisin quand la clé est la sienne",
    async (nom, outil) => {
      if (nom in SANS_DONNEE_MARQUEE) return;
      const ctx = await contexteMcp({ etablissementId: voisin }, new Date("2026-11-09T12:00:00Z"));
      expect(await outil.executer(ctx, outil.schema.parse({}))).toContain(MARQUE);
    },
  );

  it("les exemptions nomment des outils qui existent", () => {
    expect(Object.keys(SANS_DONNEE_MARQUEE).filter((n) => !OUTILS_MCP.some((o) => o.nom === n))).toEqual([]);
  });
});
