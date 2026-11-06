import { beforeEach, describe, expect, it, vi } from "vitest";

// Les gestes de l'écran « Membres » (ADR-054 § 5, § 6) : le rôle est vérifié
// avant le plugin, et le compte passé au plugin est TOUJOURS celui de
// `requireCompte`, jamais une valeur du formulaire.

// Une baisse de formule planifiée (ADR-053 § 10) : testée dans `abonnements/baisse.test.ts`.
const baisse = vi.hoisted(() => ({ refus: vi.fn(async (): Promise<string | null> => null) }));
vi.mock("@/lib/abonnements/baisse", () => ({ refusInvitationBaissePrevue: baisse.refus }));
vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({
  compte: { compteId: "compte-a", role: "owner" as string },
  api: {
    createInvitation: vi.fn(async () => ({})),
    cancelInvitation: vi.fn(async () => ({})),
    removeMember: vi.fn(async () => ({})),
    leaveOrganization: vi.fn(async () => ({})),
    updateMemberRole: vi.fn(async () => ({})),
    setActiveOrganization: vi.fn(async () => ({})),
    acceptInvitation: vi.fn(async () => ({})),
  },
  invitations: [{ id: "inv-a" }],
  comptes: [{ compteId: "compte-a" }, { compteId: "compte-b" }],
  consommer: vi.fn(async () => ({ ok: true })),
  envoi: true,
  annuler: vi.fn(async () => undefined),
  motifPlafond: vi.fn(async () => "Votre formule Essentiel couvre 1 utilisateur : passez à Pro."),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (u: string) => {
    throw new Error(`REDIRECT ${u}`);
  },
}));
vi.mock("@/lib/abonnements/saisie", () => ({ verifierSaisie: async () => {} }));
vi.mock("@/lib/abonnements/quotas", () => ({ motifPlafondMembres: h.motifPlafond }));
vi.mock("@/lib/auth/compte", () => ({
  requireCompte: async () => ({ user: { id: "u1" }, compte: h.compte, db: "db-borne" }),
  getOptionalCompte: async () => ({ user: { id: "u1" }, compte: h.compte }),
}));
vi.mock("@/lib/auth/better-auth", () => ({ auth: { api: h.api } }));
vi.mock("@/lib/auth/require-user", () => ({ entetesDeSession: async () => new Headers() }));
vi.mock("@/lib/auth/scope", () => ({ requireInvitationDeLaSession: async () => ({}) }));
vi.mock("@/lib/auth/membres", () => ({
  invitationsDuCompte: async () => h.invitations,
  comptesDeLaPersonne: async () => h.comptes,
  annulerInvitationsEnAttenteDe: h.annuler,
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

describe("plafond d'utilisateurs de la formule (ADR-053 § 14)", () => {
  it("course avec une baisse planifiée au même instant : l'invitation créée est retirée", async () => {
    h.api.createInvitation.mockResolvedValueOnce({ id: "inv_1" } as never);
    baisse.refus.mockResolvedValueOnce(null).mockResolvedValueOnce("Le passage à Essentiel est prévu le …");
    const r = await actions.inviterMembre(IDLE, fd({ email: "x@exemple.fr", role: "member" }));
    expect(r).toEqual({ status: "error", message: "Le passage à Essentiel est prévu le …" });
    expect(h.api.cancelInvitation).toHaveBeenCalledWith(expect.objectContaining({ body: { invitationId: "inv_1" } }));
  });

  it("une baisse planifiée qui ne permettrait pas un utilisateur de plus : refus, rien n'est créé", async () => {
    baisse.refus.mockResolvedValueOnce("Le passage à Essentiel est prévu le …");
    const r = await actions.inviterMembre(IDLE, fd({ email: "x@exemple.fr", role: "member" }));
    expect(r).toEqual({ status: "error", message: "Le passage à Essentiel est prévu le …" });
    expect(baisse.refus).toHaveBeenCalledWith("db-borne", "compte-a");
    expect(h.api.createInvitation).not.toHaveBeenCalled();
  });

  it("à l'invitation, le propriétaire lit le plafond de sa formule et la formule qui le lève", async () => {
    h.api.createInvitation.mockRejectedValueOnce({ body: { code: "INVITATION_LIMIT_REACHED" } } as never);
    const r = await actions.inviterMembre(IDLE, fd({ email: "x@exemple.fr", role: "member" }));
    expect(r).toEqual({ status: "error", message: "Votre formule Essentiel couvre 1 utilisateur : passez à Pro." });
    expect(h.motifPlafond).toHaveBeenCalledWith("db-borne", "compte-a");
  });

  it("à l'acceptation, la personne invitée apprend que le compte est plein, sans sa formule", async () => {
    h.api.acceptInvitation.mockRejectedValueOnce({ body: { code: "ORGANIZATION_MEMBERSHIP_LIMIT_REACHED" } } as never);
    const r = await actions.accepterInvitation(IDLE, fd({ invitationId: "inv-a" }));
    expect(r).toMatchObject({ status: "error", message: expect.stringMatching(/^Ce compte a atteint le nombre d'utilisateurs de sa formule/) });
    expect(h.motifPlafond).not.toHaveBeenCalled();
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

describe("quitterCompte", () => {
  it("à son départ, les invitations en attente de la personne tombent", async () => {
    await expect(actions.quitterCompte()).rejects.toThrow("REDIRECT /entreprises");
    expect(h.api.leaveOrganization).toHaveBeenCalledWith(expect.objectContaining({ body: { organizationId: "compte-a" } }));
    expect(h.annuler).toHaveBeenCalledWith("u1", "compte-a");
  });

  it("un départ refusé (dernier propriétaire) n'annule rien", async () => {
    h.api.leaveOrganization.mockRejectedValueOnce({ body: { code: "YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER" } });
    const r = await actions.quitterCompte();
    expect(r).toMatchObject({ status: "error", message: expect.stringMatching(/propriétaire/) });
    expect(h.annuler).not.toHaveBeenCalled();
  });
});
