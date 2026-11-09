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
import { filtreGele, ouvrirAuGel, transactionEnCours, verifierGel, PAGE_DU_GEL, type Geles } from "./gel";

const GELES: Geles = { etablissements: ["etab-gele"], prestataires: ["pre-gele"] };
const REFUS = `REDIRECT ${PAGE_DU_GEL}`;
/** La portée d'un compte gelé, telle que le client borné la passe. */
const PORTEE = { type: "compte" as const, compteId: "compte-A", userId: null, geles: GELES };
/** La borne que `verifierGel` en tire pour un permis de feu (`borne("PermisFeu", PORTEE)`). */
const BORNE_PERMIS = { etablissement: { entreprise: { compteId: "compte-A" } } };

/**
 * Le client brut, réduit à ce que la vérification lit : une ligne est gelée
 * si son identifiant figure dans `gelees` (le filtre lui-même est testé à part).
 */
function base(gelees: string[], actuelles: Record<string, Record<string, unknown>> = {}) {
  type Where = { id?: string; OR?: { id?: string }[]; AND?: unknown };
  const delegue = {
    count: vi.fn(async ({ where }: { where: Where }) =>
      where.OR ? where.OR.filter((w) => w.id !== undefined && gelees.includes(w.id)).length : gelees.length,
    ),
    // Avec le filtre du gel (un `OR` dans `AND`) : la ligne si elle est gelée.
    // Avec la seule borne du compte : la ligne en base, si elle est du compte.
    findUnique: vi.fn(async ({ where }: { where: Where }) => {
      if (typeof where.id !== "string") return null;
      const et = Array.isArray(where.AND) ? (where.AND as object[]) : [];
      if (et.some((x) => "OR" in x)) return gelees.includes(where.id) ? { id: where.id } : null;
      const ligne = actuelles[where.id];
      return ligne && et.length > 0 && ligne.compte !== "autre" ? ligne : null;
    }),
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
    await expect(verifierGel(base(["etab-gele"]).client, "Equipement", "create", { data: { etablissementId: "etab-gele" } }, PORTEE)).rejects.toThrow(REFUS);
    await verifierGel(base(["etab-gele"]).client, "Equipement", "create", { data: { etablissementId: "etab-libre" } }, PORTEE);
  });

  it("modifier une ligne gelée, par update, upsert ou updateMany", async () => {
    await expect(verifierGel(base(["ligne"]).client, "Equipement", "update", { where: { id: "ligne" }, data: { libelle: "x" } }, PORTEE)).rejects.toThrow(REFUS);
    await expect(verifierGel(base(["ligne"]).client, "Equipement", "upsert", { where: { id: "ligne" }, create: {}, update: {} }, PORTEE)).rejects.toThrow(REFUS);
    await expect(verifierGel(base(["x"]).client, "Equipement", "updateMany", { where: { actif: true }, data: { actif: false } }, PORTEE)).rejects.toThrow(REFUS);
  });

  it("créer en désignant un prestataire gelé : par sa clé, en `{ set }`, ou par un connect", async () => {
    const b = () => base(["pre-gele"]).client;
    await expect(verifierGel(b(), "PermisFeu", "create", { data: { etablissementId: "etab-libre", prestataireId: "pre-gele" } }, PORTEE)).rejects.toThrow(REFUS);
    await expect(verifierGel(b(), "PermisFeu", "create", { data: { etablissementId: "etab-libre", prestataireId: { set: "pre-gele" } } }, PORTEE)).rejects.toThrow(REFUS);
    await expect(verifierGel(b(), "PermisFeu", "create", { data: { etablissement: { connect: { id: "etab-libre" } }, prestataire: { connect: { id: "pre-gele" } } } }, PORTEE)).rejects.toThrow(REFUS);
  });

  it("une mise à jour qui garde son prestataire gelé passe ; qui en désigne un, non", async () => {
    const enBase = { p: { prestataireId: "pre-gele", etablissementId: "etab-libre" }, r: { prestataireId: null, etablissementId: "etab-libre" } };
    await verifierGel(base(["pre-gele"], enBase).client, "PermisFeu", "update", { where: { id: "p" }, data: { prestataireId: "pre-gele", motif: "x" } }, PORTEE);
    await expect(
      verifierGel(base(["pre-gele"], enBase).client, "PermisFeu", "update", { where: { id: "r" }, data: { prestataireId: "pre-gele" } }, PORTEE),
    ).rejects.toThrow(REFUS);
    await expect(
      verifierGel(base(["pre-gele"], enBase).client, "PermisFeu", "update", { where: { id: "r" }, data: { prestataire: { connect: { id: "pre-gele" } } } }, PORTEE),
    ).rejects.toThrow(REFUS);
  });

  it("la ligne modifiée est lue bornée au compte : celle d'un autre compte ne compte pas comme « déjà là »", async () => {
    // Sans la borne, la ligne d'un autre compte qui nomme déjà le prestataire
    // gelé ferait passer la désignation pour une clé gardée. Ce n'était pas une
    // faille — la borne de l'écriture faisait ensuite échouer la mise à jour —,
    // mais une lecture hors compte, contraire à l'ADR-051 (audit du 2026-11-09).
    const enBase = { x: { prestataireId: "pre-gele", etablissementId: "etab-libre", compte: "autre" } };
    const b = base(["pre-gele"], enBase);
    await expect(
      verifierGel(b.client, "PermisFeu", "update", { where: { id: "x" }, data: { prestataireId: "pre-gele" } }, PORTEE),
    ).rejects.toThrow(REFUS);
    const lectures = b.delegue.findUnique.mock.calls.map(([a]) => (a as { where: { AND?: unknown[] } }).where);
    expect(lectures).toContainEqual({ id: "x", AND: [BORNE_PERMIS] });
  });

  it("déplacer une ligne vers un site gelé est refusé", async () => {
    await expect(verifierGel(base(["etab-gele"]).client, "Equipement", "update", { where: { id: "e" }, data: { etablissementId: { set: "etab-gele" } } }, PORTEE)).rejects.toThrow(REFUS);
  });

  it("un connect par une autre clé unique que l'identifiant est lu tel quel", async () => {
    const { client, delegue } = base([]);
    await verifierGel(client, "PointReleve", "create", { data: { carnet: { connect: { etablissementId: "etab-gele" } } } }, PORTEE).catch(() => {});
    expect(delegue.count.mock.calls.some(([a]) => JSON.stringify(a).includes('"etablissementId":"etab-gele"'))).toBe(true);
  });

  it("dans une transaction, le gel lit par elle, jamais par le client brut (une seule connexion)", async () => {
    const brut = base(["etab-gele"]);
    const tx = base(["etab-gele"]);
    await expect(
      transactionEnCours.run(tx.client, () => verifierGel(brut.client, "Equipement", "create", { data: { etablissementId: "etab-gele" } }, PORTEE)),
    ).rejects.toThrow(REFUS);
    expect(tx.delegue.count).toHaveBeenCalled();
    expect(brut.delegue.count).not.toHaveBeenCalled();
  });

  it("un geste ouvert au gel (supprimer, retirer, demander de l'aide) écrit malgré lui", async () => {
    const { client, delegue } = base(["etab-gele"]);
    await transactionEnCours.run({}, async () => {
      await Promise.resolve();
      ouvrirAuGel();
      await verifierGel(client, "AccessToken", "updateMany", { where: { id: "t" }, data: { revoqueLe: new Date() } }, PORTEE);
    });
    expect(delegue.count).not.toHaveBeenCalled();
    // Le contexte de l'appelant n'en hérite pas.
    await expect(verifierGel(client, "Equipement", "create", { data: { etablissementId: "etab-gele" } }, PORTEE)).rejects.toThrow(REFUS);
  });

  it("une création portée par le parent, qui désigne un élément gelé", async () => {
    await expect(
      verifierGel(base(["pre-gele"]).client, "Etablissement", "update", {
        where: { id: "etab-libre" },
        data: { permisFeu: { create: { prestataireId: "pre-gele" } } },
      }, PORTEE),
    ).rejects.toThrow(REFUS);
  });

  it("une action ouverte au gel, appelée comme Next l'appelle : l'appelant et les actions suivantes n'en héritent pas", async () => {
    const { client } = base(["etab-gele"]);
    // Le schéma de chaque geste ouvert : la garde (un `await`), puis l'ouverture.
    const geste = async () => {
      await Promise.resolve();
      ouvrirAuGel();
      await verifierGel(client, "AccessToken", "updateMany", { where: { id: "t" }, data: {} }, PORTEE);
    };
    await geste();
    await expect(verifierGel(client, "Equipement", "create", { data: { etablissementId: "etab-gele" } }, PORTEE)).rejects.toThrow(REFUS);
    const suivante = async () => {
      await Promise.resolve();
      await verifierGel(client, "Equipement", "create", { data: { etablissementId: "etab-gele" } }, PORTEE);
    };
    await expect(suivante()).rejects.toThrow(REFUS);
    await expect(Promise.all([geste(), suivante()])).rejects.toThrow(REFUS);
  });

  it("la lecture et la suppression restent ouvertes, sans rien lire", async () => {
    const { client, delegue } = base(["etab-gele"]);
    for (const op of ["findMany", "findFirst", "count", "delete", "deleteMany"])
      await verifierGel(client, "Equipement", op, { where: { etablissementId: "etab-gele" } }, PORTEE);
    expect(delegue.count).not.toHaveBeenCalled();
    expect(delegue.findUnique).not.toHaveBeenCalled();
  });
});
