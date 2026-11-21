import { beforeEach, describe, expect, it, vi } from "vitest";

/** Le compte d'un consentement OAuth (ADR-062 § 4) : relu dans `Membre`, jamais cru de la session. */

const membres = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { membre: membres } }));

const { compteDuConsentement, doitChoisirLeCompte } = await import("./compte-oauth");

const lignes = (...ids: string[]) => ids.map((compteId) => ({ compteId, role: "member" }));

beforeEach(() => membres.findMany.mockReset());

describe("doitChoisirLeCompte", () => {
  it("un seul compte : pas de choix", async () => {
    membres.findMany.mockResolvedValue(lignes("c1"));
    expect(await doitChoisirLeCompte("u", null, false)).toBe(false);
  });

  it("aucun compte : la page (qui le dit)", async () => {
    membres.findMany.mockResolvedValue([]);
    expect(await doitChoisirLeCompte("u", null, false)).toBe(true);
  });

  it("plusieurs comptes : toujours la page au premier passage, même avec un compte actif", async () => {
    membres.findMany.mockResolvedValue(lignes("c1", "c2"));
    expect(await doitChoisirLeCompte("u", "c1", false)).toBe(true);
  });

  it("au retour de la page : passe seulement avec un compte actif dont il est membre", async () => {
    membres.findMany.mockResolvedValue(lignes("c1", "c2"));
    expect(await doitChoisirLeCompte("u", "c2", true)).toBe(false);
    expect(await doitChoisirLeCompte("u", "c-d-un-autre", true)).toBe(true);
    expect(await doitChoisirLeCompte("u", null, true)).toBe(true);
  });

  it("un rôle inconnu n'ouvre rien", async () => {
    membres.findMany.mockResolvedValue([{ compteId: "c1", role: "admin" }]);
    expect(await doitChoisirLeCompte("u", "c1", true)).toBe(true);
  });
});

describe("compteDuConsentement", () => {
  it("le compte actif s'il en est membre", async () => {
    membres.findMany.mockResolvedValue(lignes("c1", "c2"));
    expect(await compteDuConsentement("u", "c2")).toBe("c2");
  });

  it("sinon son seul compte", async () => {
    membres.findMany.mockResolvedValue(lignes("c1"));
    expect(await compteDuConsentement("u", "c-d-un-autre")).toBe("c1");
  });

  it("plusieurs comptes et aucun actif valable : lève (le fournisseur arrête l'autorisation)", async () => {
    membres.findMany.mockResolvedValue(lignes("c1", "c2"));
    await expect(compteDuConsentement("u", "c-d-un-autre")).rejects.toThrow();
    membres.findMany.mockResolvedValue([]);
    await expect(compteDuConsentement("u", null)).rejects.toThrow();
  });
});
