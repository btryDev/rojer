// Un dépôt de rapport sans session est refusé AVANT que le fichier soit lu ou
// validé (audit OWASP du 2026-10-13, S6).
//
// `uploadRapport` ne peut contrôler la propriété qu'après avoir lu la
// vérification, qui donne l'établissement. Jusqu'au 2026-10-13, tout ce qui
// précédait — métadonnées, fichier, requête en base — tournait pour un appel
// anonyme : une action serveur se joint par son identifiant depuis n'importe
// quelle page, les publiques comprises, et le middleware ne la garde pas.
//
// L'absence de session est simulée comme `requireUser` la rend en vrai :
// `redirect("/login")`, qui lève `NEXT_REDIRECT`.

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const appels: string[] = [];
  const table = (nom: string) =>
    new Proxy(
      {},
      {
        get: (_t, op: string) => async () => {
          appels.push(`prisma.${nom}.${op}`);
          // Une vérification qui existe : sans elle, l'ancien ordre s'arrêtait
          // sur « introuvable » avant le contrôle de propriété, et l'épreuve
          // ne montrerait pas ce qu'il faisait lire à un anonyme.
          if (nom === "verification" && op === "findUnique")
            return { id: "v1", etablissementId: "e1", salarieId: null, archiveLe: null, equipement: null };
          return null;
        },
      },
    );
  return {
    appels,
    prisma: new Proxy({}, { get: (_t, nom: string) => table(nom) }),
    session: { connecte: false },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/auth/require-user", async () => {
  const { redirect } = await import("next/navigation");
  return {
    requireUser: vi.fn(async () => {
      if (!h.session.connecte) redirect("/login");
      return { id: "u1", email: null };
    }),
  };
});
// Comme le vrai : le contrôle de propriété commence par `requireUser`.
vi.mock("@/lib/auth/scope", async () => {
  const { requireUser } = await import("@/lib/auth/require-user");
  return {
    assertEtablissementOwnership: vi.fn(async () => {
      h.appels.push("assertEtablissementOwnership");
      return requireUser();
    }),
  };
});
vi.mock("./validator", async (original) => {
  const vrai = await original<typeof import("./validator")>();
  return {
    ...vrai,
    validerFichier: vi.fn((f: File | null) => {
      h.appels.push("validerFichier");
      return vrai.validerFichier(f);
    }),
  };
});
vi.mock("@/lib/storage", async (original) => ({
  ...(await original<typeof import("@/lib/storage")>()),
  stockageEnService: () => {
    h.appels.push("stockageEnService");
    return true;
  },
  getStorage: () => ({
    put: vi.fn(async () => h.appels.push("storage.put")),
    delete: vi.fn(async () => {}),
  }),
}));
vi.mock("@/lib/calendrier/regeneration-sure", () => ({ regenererApresMutation: vi.fn() }));

const { uploadRapport } = await import("./actions");

/** Un FormData qui relève chaque champ lu, et un fichier qui relève chaque
 *  accès à son contenu ou à sa taille. */
function formulaireEspion() {
  const fd = new FormData();
  fd.set("dateRapport", "2026-09-01");
  fd.set("organismeVerif", "Bureau X");
  fd.set("resultat", "conforme");
  fd.set("commentaires", "");
  fd.set("fichier", new File([new Uint8Array([37, 80, 68, 70])], "r.pdf", { type: "application/pdf" }));
  const get = fd.get.bind(fd);
  fd.get = (nom: string) => {
    h.appels.push(`formData.get(${nom})`);
    return get(nom);
  };
  return fd;
}

beforeEach(() => {
  h.appels.length = 0;
});

describe("uploadRapport sans session", () => {
  it("est refusé sans qu'aucun champ, ni le fichier, ni la base ne soient lus", async () => {
    h.session.connecte = false;
    await expect(
      uploadRapport("v1", { status: "idle" }, formulaireEspion()),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(h.appels).toEqual([]);
  });

  it("témoin : avec une session, le même appel lit et valide le fichier", async () => {
    // Sans ce témoin, le premier test passerait aussi si l'espion ne voyait
    // rien du tout.
    h.session.connecte = true;
    // La suite (transaction, recalcul) n'est pas simulée ici : seul compte
    // ce qui a été lu avant qu'elle commence.
    await uploadRapport("v1", { status: "idle" }, formulaireEspion()).catch(() => {});
    expect(h.appels).toContain("formData.get(fichier)");
    expect(h.appels).toContain("validerFichier");
    expect(h.appels).toContain("prisma.verification.findUnique");
    expect(h.appels).toContain("assertEtablissementOwnership");
  });
});
