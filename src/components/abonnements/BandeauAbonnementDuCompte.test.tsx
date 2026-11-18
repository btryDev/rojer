import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const h = vi.hoisted(() => ({ compte: null as unknown, droits: vi.fn(), demande: vi.fn(async () => null as unknown) }));
vi.mock("@/lib/auth/compte", () => ({ getOptionalCompte: async () => h.compte }));
vi.mock("@/lib/abonnements/saisie", () => ({ droitsDuCompte: h.droits }));
vi.mock("@/lib/compte/suppression", () => ({ demandeDuCompte: h.demande, PAGE_SUPPRESSION: "/compte/suppression" }));

const { BandeauAbonnementDuCompte } = await import("./BandeauAbonnementDuCompte");

type Rendu = { props: { bandeau: { message: string }; avecLien: boolean; lien?: { href: string } } };

describe("BandeauAbonnementDuCompte", () => {
  it("un membre en lecture seule voit son rôle, sans lien vers l'abonnement ni lecture de celui-ci (ADR-054 § 4)", async () => {
    h.compte = { compte: { compteId: "c1", role: "lecture" }, db: {} };
    const el = (await BandeauAbonnementDuCompte({})) as Rendu;
    expect(el.props.bandeau.message).toMatch(/lecture seule/);
    expect(el.props.avecLien).toBe(false);
    expect(h.droits).not.toHaveBeenCalled();
  });

  it("un membre qui saisit voit le bandeau de l'abonnement, s'il y en a un", async () => {
    h.compte = { compte: { compteId: "c1", role: "member" }, db: {} };
    h.droits.mockResolvedValueOnce({ saisie: true, bandeau: null });
    expect(await BandeauAbonnementDuCompte({})).toBeNull();
  });

  it("une suppression demandée passe avant tout : la date pour tous, le lien vers la page pour un propriétaire seulement (ADR-058 § 8)", async () => {
    const demande = { demandeeLe: new Date("2027-03-01T10:00:00Z"), par: "a@b.fr", effacementLe: new Date("2027-03-08T10:00:00Z") };
    for (const [role, lien] of [["owner", true], ["member", false], ["lecture", false]] as const) {
      h.compte = { compte: { compteId: "c1", role }, db: {} };
      h.demande.mockResolvedValueOnce(demande);
      const el = (await BandeauAbonnementDuCompte({})) as Rendu;
      expect(el.props.bandeau.message).toMatch(/sera supprimé le 0?8 mars 2027/);
      expect(el.props.avecLien).toBe(lien);
      expect(el.props.lien?.href).toBe("/compte/suppression");
    }
  });
});
