// Les invalidations de cache des mutations du module Équipe.
//
// Le défaut que ce fichier ferme : `modifierSalarie` a perdu l'invalidation du
// calendrier et du tableau de bord quand `rafraichir` a été remplacée par
// `regenererEtRafraichir`. Les deux appels que la première faisait sont partis
// avec elle, sans que rien ne le signale — ni un test, ni le compilateur.
//
// Or le nom d'une personne s'affiche HORS du module Équipe : cinq écrans
// appellent `libellePorteur` sur les échéances. Un employeur qui corrige une
// orthographe — le geste que cet écran existe pour permettre, au titre de
// l'article 16 du RGPD — ne repropageait donc pas sa correction.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const salarie = {
    updateMany: vi.fn(async () => ({ count: 1 })),
    create: vi.fn(async () => ({ id: "sal-1" })),
  };
  // La création passe par une transaction (2026-11-03, borne de l'effectif).
  const prisma = {
    salarie,
    $transaction: async (f: (tx: unknown) => unknown): Promise<unknown> => f(prisma),
  };
  return {
    prisma,
    revalidatePath: vi.fn(),
    genererCalendrier: vi.fn(async () => {}),
  };
});

const eff = vi.hoisted(() => ({
  accueillirSite: vi.fn(async () => {}),
  ecrireEffectifs: vi.fn(async () => ({ entreprise: 0, site: 0 })),
  effectifSuitLesFiches: vi.fn(async () => false),
  recalculerEffectifEntreprise: vi.fn(async () => 0),
  changerDeSociete: vi.fn(async () => {}),
  regenererLaSociete: vi.fn(async () => true),
}));
// Le calcul de l'effectif de la société (2026-11-03) a ses propres tests
// (`entreprises/effectif.test.ts`) : ici, on vérifie seulement qu'il est appelé.
vi.mock("@/lib/entreprises/effectif", () => ({
  RefusBorneEffectif: class RefusBorneEffectif extends Error {
    constructor(message: string, readonly champ: string) { super(message); }
  },
  accueillirSite: eff.accueillirSite,
  ecrireEffectifs: eff.ecrireEffectifs,
  effectifSuitLesFiches: eff.effectifSuitLesFiches,
  recalculerEffectifEntreprise: eff.recalculerEffectifEntreprise,
  changerDeSociete: eff.changerDeSociete,
  regenererLaSociete: eff.regenererLaSociete,
}));
vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/auth/scope", () => ({
  assertEtablissementOwnership: vi.fn(async () => {}),
  // La garde rend aussi le client borné (ADR-051) : ici, le client simulé.
  assertEtablissementDuCompte: async (...a: unknown[]) => ({
    user: (await (vi.fn(async () => {}) as (...x: unknown[]) => unknown)(...a)) ?? { id: "u1" },
    db: await (await import("@/test/garde-simulee")).clientDuCompteSimule(),
  }),
}));
vi.mock("@/lib/calendrier/actions", () => ({
  genererCalendrier: h.genererCalendrier,
}));
vi.mock("@/lib/calendrier/reconciliation", () => ({
  marquerCalendrierPerime: vi.fn(async () => {}),
}));

const { creerSalarie, modifierSalarie } = await import("./actions");

function formulaire(nom: string, prenom: string): FormData {
  const fd = new FormData();
  fd.set("nom", nom);
  fd.set("prenom", prenom);
  fd.set("poste", "");
  fd.set("entreLe", "");
  return fd;
}

beforeEach(() => {
  h.revalidatePath.mockClear();
  h.genererCalendrier.mockClear();
  h.prisma.salarie.updateMany.mockClear();
});

describe("modifierSalarie — la correction d'un nom se repropage", () => {
  it("invalide le sous-arbre entier de l'établissement", async () => {
    const res = await modifierSalarie(
      "etab-1",
      "sal-1",
      { status: "idle" },
      formulaire("Dupont", "Jean"),
    );
    expect(res.status).toBe("success");

    // `toEqual` sur la liste complète, et non `toContain` sur quelques
    // chemins : la première version assurait quatre chemins présents, ce qui
    // ne pouvait pas voir que trois écrans sur cinq restaient hors de portée.
    // Un test qui vérifie une présence ne mesure pas une couverture.
    expect(h.revalidatePath.mock.calls).toEqual([
      ["/etablissements/etab-1", "layout"],
    ]);
  });

  it("ne relance PAS le générateur — renommer ne change aucune échéance", async () => {
    // Le nom n'est écrit dans aucune colonne de `Verification` : il est joint à
    // la lecture. Régénérer ici serait une transaction complète pour rien.
    //
    // La première version de ce test N'APPELAIT JAMAIS l'action : son corps
    // était une assertion sur un mock que `beforeEach` venait de remettre à
    // zéro. Il passait quoi qu'il arrive, y compris si l'action régénérait le
    // calendrier à chaque frappe.
    await modifierSalarie(
      "etab-1",
      "sal-1",
      { status: "idle" },
      formulaire("Dupont", "Jean"),
    );
    expect(h.genererCalendrier).not.toHaveBeenCalled();
  });

  it("ne touche à rien si la personne n'appartient pas à l'établissement", async () => {
    h.prisma.salarie.updateMany.mockResolvedValueOnce({ count: 0 });
    const res = await modifierSalarie(
      "etab-1",
      "sal-etranger",
      { status: "idle" },
      formulaire("Dupont", "Jean"),
    );
    expect(res.status).toBe("error");
    expect(h.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("creerSalarie — n'invalide que son module, et c'est voulu", () => {
  it("ne touche ni le calendrier ni le tableau de bord", async () => {
    // Une personne sans titre ne porte aucune échéance : rien à repropager
    // ailleurs. C'est la seule mutation du module dans ce cas, et son
    // commentaire le dit — contrairement à `modifierSalarie`, dont l'omission
    // n'était justifiée nulle part, ce qui a fait penser à un oubli. C'en
    // était un.
    await creerSalarie("etab-1", { status: "idle" }, formulaire("Martin", "Léa"));
    expect(h.revalidatePath.mock.calls).toEqual([
      ["/etablissements/etab-1/equipe"],
    ]);
  });
});

describe("creerSalarie — la borne de Rojer (2026-11-03)", () => {
  it("passe l'effectif aux fiches dans la transaction de la création", async () => {
    await creerSalarie("etab-1", { status: "idle" }, formulaire("Martin", "Léa"));
    expect(eff.effectifSuitLesFiches).toHaveBeenCalledWith(expect.anything(), "etab-1");
    // L'effectif n'a pas monté : la société ne se recalcule pas.
    expect(eff.regenererLaSociete).not.toHaveBeenCalled();
  });

  it("l'effectif monte : chaque site de la société se recalcule", async () => {
    eff.effectifSuitLesFiches.mockResolvedValueOnce(true);
    await creerSalarie("etab-1", { status: "idle" }, formulaire("Martin", "Léa"));
    expect(eff.regenererLaSociete).toHaveBeenCalledWith(expect.anything(), "etab-1");
  });

  it("au-delà de la borne, la fiche est refusée avec le message", async () => {
    const { RefusBorneEffectif } = await import("@/lib/entreprises/effectif");
    eff.effectifSuitLesFiches.mockRejectedValueOnce(
      new RefusBorneEffectif("Votre société compterait 50 salariés", "effectifSurSite"),
    );
    const r = await creerSalarie("etab-1", { status: "idle" }, formulaire("Martin", "Léa"));
    expect(r).toEqual({ status: "error", message: "Votre société compterait 50 salariés" });
  });
});
