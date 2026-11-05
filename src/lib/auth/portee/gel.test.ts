// Le gel dans le client borné (ADR-053 § 14) : ce qui dépasse la formule
// d'un compte qui a payé ne se modifie plus et ne sert plus de source à une
// création ; la lecture et la suppression restent ouvertes.

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (u: string) => {
    throw new Error(`REDIRECT ${u}`);
  },
}));

import type { PrismaClient } from "@prisma/client";
import { filtreGele, verifierGel, PAGE_DU_GEL, type Geles } from "./gel";

const GELES: Geles = { etablissements: ["etab-gele"], prestataires: ["pre-gele"] };
const REFUS = `REDIRECT ${PAGE_DU_GEL}`;

/**
 * Le client brut, réduit à ce que la vérification lit : une ligne est gelée
 * si son identifiant figure dans `gelees` (le filtre lui-même est testé à part).
 */
function base(gelees: string[], trouvee: { id: string } | null = { id: "ligne" }) {
  const delegue = {
    count: vi.fn(async ({ where }: { where: { AND: [{ id?: { in: string[] } } & Record<string, unknown>, unknown] } }) => {
      const ids = where.AND[0].id?.in;
      return ids ? ids.filter((i) => gelees.includes(i)).length : gelees.length;
    }),
    findUnique: vi.fn(async () => trouvee),
  };
  return { client: new Proxy({}, { get: () => delegue }) as unknown as PrismaClient, delegue };
}

beforeEach(() => vi.spyOn(console, "info").mockImplementation(() => {}));

describe("filtreGele : le chemin de chaque modèle jusqu'à ce qui est gelé", () => {
  it("l'établissement lui-même, une ligne qui lui est rattachée, une ligne rattachée de loin", () => {
    expect(filtreGele("Etablissement", GELES)).toEqual({ OR: [{ id: { in: ["etab-gele"] } }] });
    expect(filtreGele("Equipement", GELES)).toEqual({ OR: [{ etablissement: { id: { in: ["etab-gele"] } } }] });
    expect(filtreGele("Risque", GELES)).toEqual({
      OR: [{ unite: { duerp: { etablissement: { id: { in: ["etab-gele"] } } } } }],
    });
  });

  it("un prestataire est gelé par lui-même ou par son établissement ; ses pièces aussi", () => {
    expect(filtreGele("Prestataire", GELES)).toEqual({
      OR: [{ etablissement: { id: { in: ["etab-gele"] } } }, { id: { in: ["pre-gele"] } }],
    });
    expect(filtreGele("PiecePrestataire", GELES)?.OR).toContainEqual({ prestataire: { id: { in: ["pre-gele"] } } });
  });

  it("rien à craindre : un modèle hors de tout établissement, ou rien de gelé", () => {
    expect(filtreGele("Entreprise", GELES)).toBeNull();
    expect(filtreGele("Equipement", { etablissements: [], prestataires: [] })).toBeNull();
  });
});

describe("verifierGel : refusé avant d'écrire", () => {
  it("créer sous un établissement gelé ; créer ailleurs passe", async () => {
    await expect(verifierGel(base(["etab-gele"]).client, "Equipement", "create", { data: { etablissementId: "etab-gele" } }, GELES)).rejects.toThrow(REFUS);
    await verifierGel(base(["etab-gele"]).client, "Equipement", "create", { data: { etablissementId: "etab-libre" } }, GELES);
  });

  it("modifier une ligne gelée, par update, upsert ou updateMany", async () => {
    await expect(verifierGel(base(["ligne"]).client, "Equipement", "update", { where: { id: "ligne" }, data: { libelle: "x" } }, GELES)).rejects.toThrow(REFUS);
    await expect(verifierGel(base(["ligne"]).client, "Equipement", "upsert", { where: { id: "ligne" }, create: {}, update: {} }, GELES)).rejects.toThrow(REFUS);
    await expect(verifierGel(base(["x"]).client, "Equipement", "updateMany", { where: { actif: true }, data: { actif: false } }, GELES)).rejects.toThrow(REFUS);
  });

  it("désigner un prestataire gelé : par sa clé ou par un connect", async () => {
    const b = () => base(["pre-gele"]).client;
    await expect(verifierGel(b(), "PermisFeu", "create", { data: { etablissementId: "etab-libre", prestataireId: "pre-gele" } }, GELES)).rejects.toThrow(REFUS);
    await expect(verifierGel(b(), "PermisFeu", "update", { where: { id: "p" }, data: { prestataire: { connect: { id: "pre-gele" } } } }, GELES)).rejects.toThrow(REFUS);
  });

  it("une écriture portée par le parent : création ou modification imbriquée", async () => {
    await expect(
      verifierGel(base(["pre-gele"], null).client, "Etablissement", "update", {
        where: { id: "etab-libre" },
        data: { prestataires: { update: { where: { id: "pre-gele" }, data: { raisonSociale: "x" } } } },
      }, GELES),
    ).rejects.toThrow(REFUS);
    await expect(
      verifierGel(base(["pre-gele"], null).client, "Etablissement", "update", {
        where: { id: "etab-libre" },
        data: { permisFeu: { create: { prestataireId: "pre-gele" } } },
      }, GELES),
    ).rejects.toThrow(REFUS);
  });

  it("la lecture et la suppression restent ouvertes, sans rien lire", async () => {
    const { client, delegue } = base(["etab-gele"]);
    for (const op of ["findMany", "findFirst", "count", "delete", "deleteMany"])
      await verifierGel(client, "Equipement", op, { where: { etablissementId: "etab-gele" } }, GELES);
    expect(delegue.count).not.toHaveBeenCalled();
    expect(delegue.findUnique).not.toHaveBeenCalled();
  });
});
