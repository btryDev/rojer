// Les deux gardes de la déclaration d'état permanent, éprouvées par la requête
// forgée qu'elles existent pour refuser.
//
// L'écran n'est pas une garde : ce module le dit lui-même — « une validation
// qui vit dans le rendu n'est pas une validation ». Ces tests appellent donc
// l'action directement, comme le ferait un POST fabriqué.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";

const h = vi.hoisted(() => {
  const declarationEtatPermanent = {
    upsert: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 1 })),
  };
  const etablissement = {
    findUnique: vi.fn(async () => ({
      id: "etab-1",
      effectifSurSite: 6,
      entreprise: { effectif: 6 },
      estEtablissementTravail: true,
      estERP: false,
      estIGH: false,
      estHabitation: false,
      typeErp: null,
      categorieErp: null,
      classeIgh: null,
      personnesPresentesHabituellement: null,
      manipuleMatieresR422722: null,
    })),
  };
  const equipement = { findMany: vi.fn(async () => []) };
  return {
    prisma: { declarationEtatPermanent, etablissement, equipement },
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => {}),
}));

const { declarerEnPlace } = await import("./actions");

beforeEach(() => {
  h.prisma.declarationEtatPermanent.upsert.mockClear();
});

/** Une obligation que cet écran accepte réellement, prise au référentiel. */
function uneObligationDeclarable(): string {
  // `formation-securite-etablissement-organisation` : porteur établissement,
  // périodicité `autre`, applicable à tout employeur — donc à un bureau de six
  // personnes sans le moindre équipement.
  const o = obligationsConformite.find(
    (x) => x.id === "formation-securite-etablissement-organisation",
  );
  if (!o) throw new Error("l'obligation témoin a disparu du référentiel");
  return o.id;
}

/** Une obligation qui a une échéance, donc qui ne relève pas de cet écran. */
function uneObligationDatee(): string {
  const o = obligationsConformite.find(
    (x) => x.periodicite === "annuelle" || x.periodicite === "semestrielle",
  );
  if (!o) throw new Error("plus aucune obligation périodique au référentiel");
  return o.id;
}

describe("declarerEnPlace — ce que la garde refuse", () => {
  it("accepte une obligation que l'écran propose vraiment", () => {
    // Contre-épreuve, et elle vient en premier : sans elle, une garde qui
    // refuserait TOUT passerait chacun des tests suivants.
    return declarerEnPlace("etab-1", uneObligationDeclarable()).then((r) => {
      expect(r.status).toBe("success");
      expect(h.prisma.declarationEtatPermanent.upsert).toHaveBeenCalledTimes(1);
    });
  });

  it("refuse une obligation qui porte une échéance", async () => {
    const r = await declarerEnPlace("etab-1", uneObligationDatee());
    expect(r.status).toBe("error");
    expect(h.prisma.declarationEtatPermanent.upsert).not.toHaveBeenCalled();
  });

  it("refuse un identifiant qui n'existe pas au référentiel", async () => {
    const r = await declarerEnPlace("etab-1", "obligation-inventee");
    expect(r.status).toBe("error");
    expect(h.prisma.declarationEtatPermanent.upsert).not.toHaveBeenCalled();
  });

  it("refuse une obligation qui ne s'applique pas à CE dossier", async () => {
    // Second trou de l'ancienne garde, celui-là sans même invoquer une
    // surcharge : elle ne regardait que le référentiel, jamais l'établissement.
    // Une obligation d'ascenseur se déclarait « en place » chez un bureau qui
    // n'en a pas — une affirmation que l'écran n'a jamais proposée, et que rien
    // ne viendrait contredire ensuite.
    const ascenseur = obligationsConformite.find(
      (o) => o.domaine === "ascenseur" && o.periodicite === "autre",
    );
    if (!ascenseur) return; // le référentiel a changé, le témoin n'existe plus
    const r = await declarerEnPlace("etab-1", ascenseur.id);
    expect(r.status).toBe("error");
    expect(h.prisma.declarationEtatPermanent.upsert).not.toHaveBeenCalled();
  });

  it("refuse une note plus longue que la borne, au lieu de la tronquer", async () => {
    // Le champ était trimé et jamais borné, sur une colonne `text`. L'interface
    // ne l'envoie pas aujourd'hui — mais une requête forgée pouvait y stocker
    // des mégaoctets.
    //
    // REFUSÉE et non tronquée : couper à 500 stockerait une phrase que le
    // dirigeant n'a pas écrite, sur un écran où il affirme quelque chose sur sa
    // propre conformité.
    const r = await declarerEnPlace(
      "etab-1",
      uneObligationDeclarable(),
      "x".repeat(501),
    );
    expect(r.status).toBe("error");
    expect(h.prisma.declarationEtatPermanent.upsert).not.toHaveBeenCalled();
  });

  it("accepte une note à la borne exacte", async () => {
    // Contre-épreuve de la précédente : une borne posée un cran trop bas
    // refuserait une note légitime sans que personne ne le voie.
    const r = await declarerEnPlace(
      "etab-1",
      uneObligationDeclarable(),
      "x".repeat(500),
    );
    expect(r.status).toBe("success");
  });
});
