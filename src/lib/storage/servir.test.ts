// Ce que la réponse d'un fichier déposé laisse faire au navigateur
// (contre-lecture du 2026-09-27, M2 et points faibles).

import { describe, expect, it, vi } from "vitest";

vi.mock("./index", () => ({ getStorage: () => ({ get: async () => Buffer.from("<script>x</script>") }) }));

import { servirFichier } from "./servir";
import { nomEntreeArchive } from "./noms";

describe("servirFichier", () => {
  it.each(["text/html", "image/svg+xml", "application/xhtml+xml", "text/javascript"])(
    "un type %s enregistré en base n'est jamais servi tel quel : octet-stream, attachment",
    async (mime) => {
      const r = await servirFichier({ cle: "k", nomOriginal: "piece", mime, contexte: "t" });
      expect(r.headers.get("Content-Type")).toBe("application/octet-stream");
      expect(r.headers.get("Content-Disposition")).toMatch(/^attachment;/);
    },
  );

  it("un type hors liste avec un nom en .pdf : le type du nom, pas celui de la base", async () => {
    const r = await servirFichier({ cle: "k", nomOriginal: "r.pdf", mime: "text/html", contexte: "t" });
    expect(r.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("sandbox, nosniff, no-store sur toute réponse", async () => {
    const r = await servirFichier({ cle: "k", nomOriginal: "r.pdf", mime: "application/pdf", contexte: "t" });
    expect(r.headers.get("Content-Security-Policy")).toBe("sandbox");
    expect(r.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(r.headers.get("Cache-Control")).toBe("no-store");
  });

  it("le nom de fichier ne peut pas fermer l'en-tête : guillemet, antislash, retour à la ligne", async () => {
    const r = await servirFichier({
      cle: "k",
      nomOriginal: 'a"b\\c\r\nSet-Cookie: x.pdf',
      mime: "application/pdf",
      contexte: "t",
    });
    const d = r.headers.get("Content-Disposition")!;
    const ascii = /filename="([^"]*)"/.exec(d)![1];
    expect(ascii).not.toMatch(/["\\\r\n]/);
  });
});

describe("nomEntreeArchive — la troncature garde l'extension", () => {
  it("un nom de 300 caractères reste un .pdf de 120 caractères", () => {
    const n = nomEntreeArchive(`${"a".repeat(300)}.pdf`, "x.pdf");
    expect(n.length).toBe(120);
    expect(n.endsWith(".pdf")).toBe(true);
  });
  it("un nom court ne change pas", () => {
    expect(nomEntreeArchive("rapport.pdf", "x.pdf")).toBe("rapport.pdf");
  });
});
