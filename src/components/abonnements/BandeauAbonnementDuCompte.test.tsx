import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({ compte: null as unknown, droits: vi.fn() }));
vi.mock("@/lib/auth/compte", () => ({ getOptionalCompte: async () => h.compte }));
vi.mock("@/lib/abonnements/saisie", () => ({ droitsDuCompte: h.droits }));

const { BandeauAbonnementDuCompte } = await import("./BandeauAbonnementDuCompte");

describe("BandeauAbonnementDuCompte", () => {
  it("un membre en lecture seule voit son rôle, sans lien vers l'abonnement ni lecture de celui-ci (ADR-054 § 4)", async () => {
    h.compte = { compte: { compteId: "c1", role: "lecture" }, db: {} };
    const el = (await BandeauAbonnementDuCompte({})) as { props: { bandeau: { message: string }; avecLien: boolean } };
    expect(el.props.bandeau.message).toMatch(/lecture seule/);
    expect(el.props.avecLien).toBe(false);
    expect(h.droits).not.toHaveBeenCalled();
  });

  it("un membre qui saisit voit le bandeau de l'abonnement, s'il y en a un", async () => {
    h.compte = { compte: { compteId: "c1", role: "member" }, db: {} };
    h.droits.mockResolvedValueOnce({ saisie: true, bandeau: null });
    expect(await BandeauAbonnementDuCompte({})).toBeNull();
  });
});
