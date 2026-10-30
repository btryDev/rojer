import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * La déconnexion (ADR-052, lot 3a) : session fermée en base, navigateur
 * vidé (`Clear-Site-Data`), POST de la même origine seulement.
 */
const h = vi.hoisted(() => ({ signOut: vi.fn<(arg: { headers: Headers }) => Promise<unknown>>() }));
vi.mock("@/lib/auth/better-auth", () => ({ auth: { api: { signOut: h.signOut } } }));

const { POST } = await import("./route");

const requete = (origin?: string) =>
  new NextRequest("https://app.rojer.fr/auth/deconnexion", {
    method: "POST",
    headers: origin ? { origin, cookie: "better-auth.session_token=x.y" } : {},
  });

beforeEach(() => {
  vi.stubEnv("PUBLIC_APP_URL", "https://app.rojer.fr");
  h.signOut.mockReset();
  h.signOut.mockResolvedValue({ success: true });
});

describe("/auth/deconnexion", () => {
  it("ferme la session, vide le navigateur, renvoie à la connexion", async () => {
    const r = await POST(requete("https://app.rojer.fr"));
    expect(h.signOut).toHaveBeenCalledTimes(1);
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("https://app.rojer.fr/login");
    expect(r.headers.get("clear-site-data")).toBe('"cache", "cookies", "storage"');
  });

  it("refuse un POST d'une autre origine, ou sans origine, sans rien fermer", async () => {
    for (const origine of ["https://evil.tld", undefined]) {
      const r = await POST(requete(origine));
      expect(r.status).toBe(403);
    }
    expect(h.signOut).not.toHaveBeenCalled();
  });

  it("une session déjà fermée n'empêche pas de vider le navigateur", async () => {
    h.signOut.mockRejectedValue(new Error("pas de session"));
    const r = await POST(requete("https://app.rojer.fr"));
    expect(r.status).toBe(303);
    expect(r.headers.get("clear-site-data")).toContain('"cookies"');
  });
});
