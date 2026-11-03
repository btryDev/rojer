import { beforeEach, describe, expect, it, vi } from "vitest";

// Les gestes de l'écran « Membres » (ADR-054 § 5, § 6) : le rôle est vérifié
// avant le plugin, et le compte passé au plugin est TOUJOURS celui de
// `requireCompte`, jamais une valeur du formulaire.

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({
  compte: { compteId: "compte-a", role: "owner" as string },
  api: {
    createInvitation: vi.fn(async () => ({})),
    cancelInvitation: vi.fn(async () => ({})),
    removeMember: vi.fn(async () => ({})),
    updateMemberRole: vi.fn(async () => ({})),
    setActiveOrganization: vi.fn(async () => ({})),
  },
  invitations: [{ id: "inv-a" }],
  comptes: [{ compteId: "compte-a" }, { compteId: "compte-b" }],
  consommer: vi.fn(async () => ({ ok: true })),
  envoi: true,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (u: string) => {
    throw new Error(`REDIRECT ${u}`);
  },
}));
vi.mock("@/lib/abonnements/saisie", () => ({ verifierSaisie: async () => {} }));
vi.mock("@/lib/auth/compte", () => ({ requireCompte: async () => ({ user: { id: "u1" }, compte: h.compte }) }));
vi.mock("@/lib/auth/better-auth", () => ({ auth: { api: h.api } }));
vi.mock("@/lib/auth/require-user", () => ({ entetesDeSession: async () => new Headers() }));
vi.mock("@/lib/auth/scope", () => ({ requireInvitationDeLaSession: async () => ({}) }));
vi.mock("@/lib/auth/membres", () => ({
  invitationsDuCompte: async () => h.invitations,
  comptesDeLaPersonne: async () => h.comptes,
}));
vi.mock("@/lib/email", () => ({ envoiEnService: () => h.envoi, refusUrlPublique: () => null }));
vi.mock("@/lib/securite/limite-debit", () => ({
  consommer: h.consommer,
  cleLimite: (...p: string[]) => p.join(":"),
  LIMITES: { invitationCompte: { max: 20, fenetreSecondes: 1 } },
  messageTropDeTentatives: () => "trop",
}));

const actions = await import("./actions");
const IDLE = { status: "idle" as const };
const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  h.compte = { compteId: "compte-a", role: "owner" };
  h.envoi = true;
});

describe("gestes réservés au propriétaire", () => {
  it.each(["member", "lecture"])("un %s ne peut ni inviter, ni retirer, ni changer un rôle, ni annuler", async (role) => {
    h.compte = { compteId: "compte-a", role };
    for (const r of [
      await actions.inviterMembre(IDLE, fd({ email: "x@exemple.fr", role: "member" })),
      await actions.retirerMembre(IDLE, fd({ membreId: "m1" })),
      await actions.changerRoleMembre(IDLE, fd({ membreId: "m1", role: "member" })),
      await actions.annulerInvitation(IDLE, fd({ invitationId: "inv-a" })),
    ])
      expect(r.status).toBe("error");
    for (const f of Object.values(h.api)) expect(f).not.toHaveBeenCalled();
  });

  it("le compte passé au plugin est celui de requireCompte, pas celui du formulaire", async () => {
    await actions.inviterMembre(IDLE, fd({ email: "x@exemple.fr", role: "member", organizationId: "compte-b" }));
    await actions.retirerMembre(IDLE, fd({ membreId: "m1", organizationId: "compte-b" }));
    await actions.changerRoleMembre(IDLE, fd({ membreId: "m1", role: "lecture", organizationId: "compte-b" }));
    for (const f of [h.api.createInvitation, h.api.removeMember, h.api.updateMemberRole])
      expect(f).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ organizationId: "compte-a" }) }));
  });

  it("refuse un rôle hors des trois, et un retrait désigné par adresse", async () => {
    expect((await actions.inviterMembre(IDLE, fd({ email: "x@exemple.fr", role: "admin" }))).status).toBe("error");
    expect((await actions.changerRoleMembre(IDLE, fd({ membreId: "m1", role: "member,owner" }))).status).toBe("error");
    expect((await actions.retirerMembre(IDLE, fd({ membreId: "x@exemple.fr" }))).status).toBe("error");
    expect(h.api.createInvitation).not.toHaveBeenCalled();
    expect(h.api.updateMemberRole).not.toHaveBeenCalled();
    expect(h.api.removeMember).not.toHaveBeenCalled();
  });

  it("n'annule qu'une invitation du compte vérifié", async () => {
    expect((await actions.annulerInvitation(IDLE, fd({ invitationId: "inv-d-ailleurs" }))).status).toBe("error");
    expect(h.api.cancelInvitation).not.toHaveBeenCalled();
    expect((await actions.annulerInvitation(IDLE, fd({ invitationId: "inv-a" }))).status).toBe("success");
  });

  it("sans pilote d'e-mail, aucune invitation n'est créée, et l'écran le dit", async () => {
    h.envoi = false;
    const r = await actions.inviterMembre(IDLE, fd({ email: "x@exemple.fr", role: "member" }));
    expect(r).toMatchObject({ status: "error", message: expect.stringMatching(/hors service/) });
    expect(h.api.createInvitation).not.toHaveBeenCalled();
  });

  it("une invitation au-delà du plafond du jour n'est pas envoyée", async () => {
    h.consommer.mockResolvedValueOnce({ ok: false, reessayerDansSecondes: 60 } as never);
    expect((await actions.inviterMembre(IDLE, fd({ email: "x@exemple.fr", role: "member" }))).status).toBe("error");
    expect(h.api.createInvitation).not.toHaveBeenCalled();
  });
});

describe("choisirCompte (ADR-054 § 7)", () => {
  it("ne pose qu'un compte dont la personne est membre", async () => {
    expect((await actions.choisirCompte(IDLE, fd({ compte: "compte-z" }))).status).toBe("error");
    expect(h.api.setActiveOrganization).not.toHaveBeenCalled();
    await expect(actions.choisirCompte(IDLE, fd({ compte: "compte-b" }))).rejects.toThrow("REDIRECT /entreprises");
    expect(h.api.setActiveOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ body: { organizationId: "compte-b" } }),
    );
  });
});
