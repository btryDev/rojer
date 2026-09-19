import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `/signe/[signatureId]` ne montre rien de plus que `/verifier/[signatureId]`.
 *
 * Les deux pages sont publiques et partagent l'identifiant `sig_…`. Celui qui
 * tient le lien de vérification — l'inspecteur, l'assureur, l'acquéreur — n'a
 * qu'à remplacer `verifier` par `signe`. Cette page lisait la signature avec
 * l'établissement et l'entreprise, et affichait la raison sociale et le nom
 * du site que `/verifier` retient à dessein.
 *
 * La table en mémoire applique `select` ET `include` comme la base : une
 * lecture qui demande l'établissement l'obtient, et le test le voit.
 */

type Ligne = Record<string, unknown>;

const RAISON_SOCIALE = "Boulangerie Secrète SARL";
const NOM_SITE = "Site confidentiel de Lyon";
const IP = "203.0.113.42";
const UA = "Navigateur-Espion/1.0";

const SIGNATURE: Ligne = {
  id: "sig_1",
  etablissementId: "etab-1",
  objetType: "plan_prevention",
  objetId: "pp-interne-1",
  signataireNom: "Jean Dupond",
  signataireEmail: "jean@exemple-externe.fr",
  signataireRole: "Chef d'entreprise",
  horodatageIso: new Date("2026-09-19T10:00:00Z"),
  methode: "otp_email",
  hashDocument: "v2:abc",
  nomDocument: "Plan de prévention PP-001",
  ipAddress: IP,
  userAgent: UA,
  etablissement: {
    raisonDisplay: NOM_SITE,
    entreprise: { raisonSociale: RAISON_SOCIALE },
  },
};

function projeter(ligne: Ligne, select: Ligne): Ligne {
  const out: Ligne = {};
  for (const [k, v] of Object.entries(select)) {
    if (v === true) out[k] = ligne[k];
    else if (v && typeof v === "object")
      out[k] = projeter(ligne[k] as Ligne, (v as { select: Ligne }).select);
  }
  return out;
}

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { signature: { findUnique: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));
vi.mock("next/link", () => ({ default: "a" }));
vi.mock("@/components/ui-kit", () => ({ SignatureBlock: "div", LegalBadge: "div" }));

import ConfirmationSignaturePage from "./page";

beforeEach(() => {
  prismaMock.signature.findUnique.mockImplementation(
    async ({
      where,
      select,
      include,
    }: {
      where: { id: string };
      select?: Ligne;
      include?: Ligne;
    }) => {
      if (where.id !== SIGNATURE.id) return null;
      if (select) return projeter(SIGNATURE, select);
      // Sans `select`, Prisma rend les colonnes scalaires, plus ce que
      // `include` demande.
      const { etablissement, ...scalaires } = SIGNATURE;
      return include?.etablissement ? { ...scalaires, etablissement } : scalaires;
    },
  );
});

async function rendre(): Promise<string> {
  const arbre = await ConfirmationSignaturePage({
    params: Promise.resolve({ signatureId: "sig_1" }),
  } as never);
  return JSON.stringify(arbre);
}

describe("garantie 4 — /signe ne montre pas plus que /verifier", () => {
  it("ni la raison sociale, ni le nom du site, ni l'IP, ni le navigateur, ni l'objet interne", async () => {
    const rendu = await rendre();

    expect(rendu).not.toContain(RAISON_SOCIALE);
    expect(rendu).not.toContain(NOM_SITE);
    expect(rendu).not.toContain(IP);
    expect(rendu).not.toContain(UA);
    expect(rendu).not.toContain("pp-interne-1");
    expect(rendu).not.toContain("etab-1");
  });

  it("montre bien l'accusé de réception (contrôle positif)", async () => {
    const rendu = await rendre();

    expect(rendu).toContain("Jean");
    expect(rendu).toContain("Plan de prévention PP-001");
    expect(rendu).toContain("sig_1");
  });
});
