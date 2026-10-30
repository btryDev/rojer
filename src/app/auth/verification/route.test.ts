import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { APIError } from "better-auth/api";

/**
 * Le lien de confirmation d'adresse (ADR-052) : il confirme, ou dit qu'il est
 * invalide — et renvoie toujours vers la connexion, sans ouvrir de session ni
 * suivre une adresse fournie par le lien.
 */
const h = vi.hoisted(() => ({
  verifyEmail: vi.fn<(arg: { query: { token: string } }) => Promise<unknown>>(async () => ({ status: true })),
}));
vi.mock("@/lib/auth/better-auth", () => ({ auth: { api: { verifyEmail: h.verifyEmail } } }));

const { GET } = await import("./route");

const appel = (q: string) => GET(new NextRequest(`https://app.rojer.fr/auth/verification${q}`));

beforeEach(() => {
  h.verifyEmail.mockReset();
  h.verifyEmail.mockResolvedValue({ status: true });
});

describe("/auth/verification", () => {
  it("un jeton valide : confirmé, retour à la connexion, sans cache ni cookie", async () => {
    const r = await appel("?token=abc");
    expect(h.verifyEmail).toHaveBeenCalledWith({ query: { token: "abc" } });
    expect(r.headers.get("location")).toBe("https://app.rojer.fr/login?confirmed=1");
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.headers.get("set-cookie")).toBeNull();
  });

  it("un jeton refusé : lien invalide", async () => {
    h.verifyEmail.mockRejectedValue(new APIError("UNAUTHORIZED", { code: "INVALID_TOKEN", message: "x" }));
    const r = await appel("?token=mort");
    expect(r.headers.get("location")).toBe("https://app.rojer.fr/login?confirmation=invalide");
  });

  it("une panne (autre chose qu'un refus de Better Auth) n'est pas déguisée en lien invalide", async () => {
    h.verifyEmail.mockRejectedValue(new Error("connexion à la base perdue"));
    await expect(appel("?token=abc")).rejects.toThrow("connexion à la base perdue");
  });

  it("sans jeton : lien invalide, Better Auth n'est pas appelé", async () => {
    const r = await appel("");
    expect(h.verifyEmail).not.toHaveBeenCalled();
    expect(r.headers.get("location")).toBe("https://app.rojer.fr/login?confirmation=invalide");
  });

  it("ne suit aucune adresse du lien, ne transmet rien d'autre que le jeton", async () => {
    const r = await appel("?token=abc&callbackURL=https://evil.tld&next=//evil.tld");
    expect(h.verifyEmail).toHaveBeenCalledWith({ query: { token: "abc" } });
    expect(new URL(r.headers.get("location")!).origin).toBe("https://app.rojer.fr");
  });
});
