import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  MIME_AUTORISES,
  TAILLE_MAX_OCTETS,
  validerFichier,
} from "./validator";

/**
 * Les octets de tête de chaque type accepté. Un fichier de test DOIT les
 * porter : depuis le 2026-10-13 (ASVS V5.2.2), le type déclaré par le
 * navigateur ne suffit plus — l'extension et le contenu doivent le confirmer.
 */
const PDF = new TextEncoder().encode("%PDF-1.7\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);
const HTML = new TextEncoder().encode("<!doctype html><script>alert(document.domain)</script>");
const MZ = new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0xff, 0xff]);
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function docx(entrees: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [nom, contenu] of Object.entries(entrees)) zip.file(nom, contenu);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
const DOCX_VALIDE = () =>
  docx({
    "[Content_Types].xml": "<Types/>",
    "_rels/.rels": "<Relationships/>",
    "word/document.xml": "<w:document/>",
  });

const fichier = (octets: Uint8Array, nom: string, type: string) =>
  new File([octets as BlobPart], nom, { type });

// Un fichier de `taille` octets qui commence par l'en-tête PDF.
function pdfDeTaille(nom: string, taille: number): File {
  const data = new Uint8Array(taille);
  data.set(PDF.subarray(0, Math.min(PDF.length, taille)));
  return new File([data], nom, { type: "application/pdf" });
}

describe("validerFichier", () => {
  it("accepte un PDF de taille raisonnable", async () => {
    const res = await validerFichier(pdfDeTaille("rapport.pdf", 1024));
    expect(res.ok).toBe(true);
  });

  it("refuse un fichier vide", async () => {
    const res = await validerFichier(pdfDeTaille("vide.pdf", 0));
    expect(res.ok).toBe(false);
  });

  it("refuse si null", async () => {
    expect((await validerFichier(null)).ok).toBe(false);
  });

  it("refuse un fichier trop gros", async () => {
    const res = await validerFichier(pdfDeTaille("gros.pdf", TAILLE_MAX_OCTETS + 1));
    expect(res.ok).toBe(false);
  });

  it("refuse un type MIME non listé (ex. zip)", async () => {
    const res = await validerFichier(fichier(await DOCX_VALIDE(), "archive.zip", "application/zip"));
    expect(res.ok).toBe(false);
  });

  it("accepte les 4 types prévus, avec leur extension et leurs octets", async () => {
    const cas: Array<[Uint8Array, string, string]> = [
      [PDF, "rapport.pdf", "application/pdf"],
      [PNG, "plaque.png", "image/png"],
      [JPEG, "photo.jpg", "image/jpeg"],
      [JPEG, "photo.JPEG", "image/jpeg"],
      [await DOCX_VALIDE(), "rapport.docx", DOCX_MIME],
    ];
    for (const [octets, nom, type] of cas) {
      const res = await validerFichier(fichier(octets, nom, type));
      expect(res, nom).toMatchObject({ ok: true, mime: type });
    }
    expect(new Set(cas.map((c) => c[2]))).toEqual(new Set(MIME_AUTORISES));
  });
});

/**
 * ASVS 5.0.0 V5.2.2 (audit du 2026-10-13). Le type déclaré vient du
 * navigateur, c'est-à-dire de l'attaquant. Le ZIP de contrôle remet les pièces
 * à des tiers sous leur NOM d'origine : un HTML déclaré PDF y devenait
 * `facture.html`, un exécutable déclaré PNG `rapport.exe`.
 */
describe("validerFichier — le type déclaré doit être confirmé par le nom et le contenu", () => {
  it("refuse un HTML nommé .html et déclaré application/pdf", async () => {
    const res = await validerFichier(fichier(HTML, "facture.html", "application/pdf"));
    expect(res.ok).toBe(false);
  });

  it("refuse un exécutable MZ nommé .exe et déclaré image/png", async () => {
    const res = await validerFichier(fichier(MZ, "rapport.exe", "image/png"));
    expect(res.ok).toBe(false);
  });

  it("refuse un HTML qui porte le nom et le type d'un PDF", async () => {
    const res = await validerFichier(fichier(HTML, "facture.pdf", "application/pdf"));
    expect(res).toMatchObject({ ok: false, erreur: expect.stringMatching(/contenu/) });
  });

  it("refuse un exécutable qui porte le nom et le type d'un PNG", async () => {
    const res = await validerFichier(fichier(MZ, "plaque.png", "image/png"));
    expect(res.ok).toBe(false);
  });

  it("refuse un fichier dont l'extension contredit le type déclaré", async () => {
    // Contenu et type cohérents, nom d'un autre type : servi ensuite sous ce nom.
    const res = await validerFichier(fichier(PDF, "rapport.png", "application/pdf"));
    expect(res).toMatchObject({ ok: false, erreur: expect.stringMatching(/\.pdf/) });
  });

  it("refuse un fichier sans extension", async () => {
    const res = await validerFichier(fichier(PDF, "rapport", "application/pdf"));
    expect(res.ok).toBe(false);
  });

  it("refuse une image d'un type déclarée sous un autre (JPEG déclaré PNG)", async () => {
    const res = await validerFichier(fichier(JPEG, "photo.png", "image/png"));
    expect(res.ok).toBe(false);
  });

  it("refuse un zip quelconque nommé .docx : il faut un document Word dedans", async () => {
    const zip = await docx({ "[Content_Types].xml": "<Types/>", "index.html": "<script/>" });
    const res = await validerFichier(fichier(zip, "rapport.docx", DOCX_MIME));
    expect(res.ok).toBe(false);
  });

  it("refuse un .docx dont seul l'en-tête zip est présent", async () => {
    const res = await validerFichier(
      fichier(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]), "rapport.docx", DOCX_MIME),
    );
    expect(res.ok).toBe(false);
  });
});
