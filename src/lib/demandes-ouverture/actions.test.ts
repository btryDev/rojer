import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  createMany: vi.fn<(arg: { data: { email: string }[]; skipDuplicates: boolean }) => Promise<{ count: number }>>(),
  limite: vi.fn<
    (demandes: { cle: string }[]) => Promise<{ ok: true } | { ok: false; reessayerDansSecondes: number }>
  >(),
  entetes: new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));

vi.mock("next/headers", () => ({ headers: async () => h.entetes }));
vi.mock("@/lib/prisma", () => ({ prisma: { demandeOuverture: { createMany: h.createMany } } }));
vi.mock("@/lib/securite/limite-debit", async (original) => ({
  ...(await original<typeof import("@/lib/securite/limite-debit")>()),
  consommer: h.limite,
}));

const { demanderOuvertureAction } = await import("./actions");
const { CHAMP_PIEGE } = await import("./formulaire");

function formulaire(champs: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
}

beforeEach(() => {
  h.createMany.mockReset();
  h.createMany.mockResolvedValue({ count: 1 });
  h.limite.mockReset();
  h.limite.mockResolvedValue({ ok: true });
  h.entetes = new Headers({ "x-forwarded-for": "203.0.113.7" });
});

describe("demanderOuvertureAction", () => {
  it("enregistre l'adresse en minuscules, sans espaces, et la redit", async () => {
    const r = await demanderOuvertureAction({}, formulaire({ email: "  Paul.Dupont@Exemple.FR ", [CHAMP_PIEGE]: "" }));
    expect(r).toEqual({ email: "paul.dupont@exemple.fr" });
    expect(h.createMany).toHaveBeenCalledWith({ data: [{ email: "paul.dupont@exemple.fr" }], skipDuplicates: true });
  });

  it("une même adresse deux fois : le même succès (aucune ligne de plus, rien ne le trahit)", async () => {
    await demanderOuvertureAction({}, formulaire({ email: "a@exemple.fr" }));
    h.createMany.mockResolvedValueOnce({ count: 0 });
    const r = await demanderOuvertureAction({}, formulaire({ email: "A@exemple.fr" }));
    expect(r).toEqual({ email: "a@exemple.fr" });
    expect(h.createMany).toHaveBeenCalledTimes(2);
    for (const [arg] of h.createMany.mock.calls) expect(arg.skipDuplicates).toBe(true);
  });

  it("refuse une adresse invalide ou vide, sans rien écrire", async () => {
    for (const email of ["", "   ", "pas-une-adresse", "a@", `${"a".repeat(250)}@exemple.fr`]) {
      const r = await demanderOuvertureAction({}, formulaire({ email }));
      expect(r.erreur, email).toBeTruthy();
      expect(r.email).toBeUndefined();
    }
    const sansChamp = await demanderOuvertureAction({}, new FormData());
    expect(sansChamp.erreur).toBeTruthy();
    expect(h.createMany).not.toHaveBeenCalled();
  });

  it("champ piège rempli : le même succès, rien d'écrit ni de consommé", async () => {
    const r = await demanderOuvertureAction(
      {},
      formulaire({ email: "robot@exemple.fr", [CHAMP_PIEGE]: "https://spam.example" }),
    );
    expect(r).toEqual({ email: "robot@exemple.fr" });
    expect(h.createMany).not.toHaveBeenCalled();
    expect(h.limite).not.toHaveBeenCalled();
  });

  it("champ piège rempli et adresse invalide : aucun message qui guiderait le robot", async () => {
    const r = await demanderOuvertureAction({}, formulaire({ email: "x", [CHAMP_PIEGE]: "x" }));
    expect(r).toEqual({});
    expect(h.createMany).not.toHaveBeenCalled();
  });

  it("limite de débit par réseau : au-delà, refus sans écrire", async () => {
    h.limite.mockResolvedValueOnce({ ok: false, reessayerDansSecondes: 600 });
    const r = await demanderOuvertureAction({}, formulaire({ email: "a@exemple.fr" }));
    expect(r.erreur).toMatch(/réessayez dans 10 minutes/);
    expect(h.createMany).not.toHaveBeenCalled();
    expect(h.limite.mock.calls[0][0][0].cle).toMatch(/^demande-ouverture:ip:/);
  });

  it("sans IP lisible, la limite s'applique quand même : une clé commune", async () => {
    h.entetes = new Headers();
    const r = await demanderOuvertureAction({}, formulaire({ email: "a@exemple.fr" }));
    expect(r).toEqual({ email: "a@exemple.fr" });
    const cles = h.limite.mock.calls.map(([d]) => d[0].cle);
    expect(cles[0]).toMatch(/^demande-ouverture:ip:/);
    expect(cles[1]).toMatch(/^demande-ouverture:global:/);
  });

  it("un réseau déjà bloqué ne remplit pas le plafond commun", async () => {
    h.limite.mockResolvedValueOnce({ ok: false, reessayerDansSecondes: 600 });
    const r = await demanderOuvertureAction({}, formulaire({ email: "a@exemple.fr" }));
    expect(r.erreur).toMatch(/réessayez/);
    expect(h.limite).toHaveBeenCalledTimes(1);
    expect(h.limite.mock.calls[0][0][0].cle).toMatch(/^demande-ouverture:ip:/);
  });

  it("un plafond tous réseaux confondus, en plus de la limite par réseau", async () => {
    h.entetes = new Headers({ "x-forwarded-for": "203.0.113.7" });
    await demanderOuvertureAction({}, formulaire({ email: "a@exemple.fr" }));
    await demanderOuvertureAction({}, formulaire({ email: "b@exemple.fr" }));
    h.entetes = new Headers({ "x-forwarded-for": "198.51.100.9" });
    await demanderOuvertureAction({}, formulaire({ email: "c@exemple.fr" }));
    const cles = h.limite.mock.calls.map(([d]) => d[0].cle);
    const globales = cles.filter((c) => c.startsWith("demande-ouverture:global:"));
    const parReseau = cles.filter((c) => c.startsWith("demande-ouverture:ip:"));
    expect(globales).toHaveLength(3);
    expect(new Set(globales).size).toBe(1);
    expect(new Set(parReseau).size).toBe(2);
  });

  it("base injoignable : un message, pas de faux succès", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    h.createMany.mockRejectedValueOnce(new Error("connexion refusée"));
    const r = await demanderOuvertureAction({}, formulaire({ email: "a@exemple.fr" }));
    expect(r).toEqual({ erreur: "L'enregistrement n'a pas abouti. Réessayez dans un instant." });
  });
});
