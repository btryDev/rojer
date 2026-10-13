import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";

/**
 * ASVS 5.0.0 V5.2.3 (audit du 2026-10-13) : un classeur zip (.xlsx, .ods,
 * .xlsb) est borné en taille DÉCOMPRESSÉE avant d'être confié à SheetJS.
 *
 * La borne `sheetRows` cesse de construire des cellules, mais SheetJS
 * décompresse d'abord toute l'archive : un .xlsx de 4,31 Mo portant 158 Mo de
 * XML faisait encore monter le tas à 465 Mo avant d'être refusé. On observe
 * donc que `XLSX.read` n'est JAMAIS appelé sur une archive refusée.
 */
const lectures = vi.hoisted(() => ({ n: 0 }));
vi.mock("xlsx", async (importOriginal) => {
  const vrai = await importOriginal<typeof import("xlsx")>();
  return {
    ...vrai,
    read: (data: unknown, opts?: unknown) => {
      lectures.n++;
      return vrai.read(data as never, opts as never);
    },
  };
});

import * as XLSX from "xlsx";
import {
  ENTREES_ZIP_MAX_IMPORT,
  TAILLE_DECOMPRESSEE_MAX_IMPORT,
  erreurDeFichier,
  parserFichierDuerp,
} from "./parser";

const ENTETE = ["Unité de travail", "Risque", "Gravité", "Probabilité", "Maîtrise"];

/** Un classeur minimal dont la feuille pèse `octetsFeuille` une fois décompressée. */
async function classeurGonfle(octetsFeuille: number): Promise<Buffer> {
  const ws = XLSX.utils.aoa_to_sheet([ENTETE, ["Cuisine", "Coupure", 2, 2, 2]]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "DUERP");
  const base = await JSZip.loadAsync(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
  // Une cellule de texte inline démesurée : du XML valide, très compressible.
  const xml = (await base.file("xl/worksheets/sheet1.xml")!.async("string")).replace(
    "</sheetData>",
    `<row r="3"><c r="A3" t="inlineStr"><is><t>${"x".repeat(octetsFeuille)}</t></is></c></row></sheetData>`,
  );
  base.file("xl/worksheets/sheet1.xml", xml);
  return base.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

/** Réécrit la taille décompressée DÉCLARÉE de chaque entrée (répertoire central et en-têtes locaux). */
function mentir(zip: Buffer, taille: number): Buffer {
  const b = Buffer.from(zip);
  for (let p = 0; p + 4 <= b.length; p++) {
    const sig = b.readUInt32LE(p);
    if (sig === 0x02014b50 && p + 28 <= b.length) b.writeUInt32LE(taille, p + 24);
    if (sig === 0x04034b50 && p + 26 <= b.length) b.writeUInt32LE(taille, p + 22);
  }
  return b;
}

describe("parserFichierDuerp — taille décompressée bornée avant SheetJS", () => {
  beforeEach(() => {
    lectures.n = 0;
  });

  it("refuse une archive qui déclare plus que la borne, sans l'ouvrir", async () => {
    const bombe = await classeurGonfle(TAILLE_DECOMPRESSEE_MAX_IMPORT + 1024);
    expect(bombe.length).toBeLessThan(1024 * 1024); // petite au dépôt
    lectures.n = 0;
    const refus = erreurDeFichier(parserFichierDuerp(bombe));
    expect(refus).toMatch(/décompressé/);
    expect(lectures.n).toBe(0);
  });

  it("refuse la même archive quand elle MENT sur ses tailles déclarées", async () => {
    const bombe = mentir(await classeurGonfle(TAILLE_DECOMPRESSEE_MAX_IMPORT + 1024), 100);
    lectures.n = 0;
    const refus = erreurDeFichier(parserFichierDuerp(bombe));
    expect(refus).toMatch(/décompressé/);
    expect(lectures.n).toBe(0);
  });

  it("refuse une archive de plus d'entrées que la borne, sans l'ouvrir", async () => {
    const zip = new JSZip();
    for (let i = 0; i <= ENTREES_ZIP_MAX_IMPORT; i++) zip.file(`xl/media/f${i}.xml`, "<a/>");
    const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    lectures.n = 0;
    const refus = erreurDeFichier(parserFichierDuerp(buf));
    expect(refus).toMatch(/éléments/);
    expect(lectures.n).toBe(0);
  });

  it("refuse une archive dont le répertoire central est illisible, sans l'ouvrir", async () => {
    const buf = await classeurGonfle(10);
    const tronque = buf.subarray(0, buf.length - 30); // EOCD amputé
    lectures.n = 0;
    expect(erreurDeFichier(parserFichierDuerp(tronque))).toMatch(/illisible/i);
    expect(lectures.n).toBe(0);
  });

  it("un .xlsx compressé et un .ods légitimes s'importent toujours", () => {
    const lignes: unknown[][] = [ENTETE];
    for (let i = 0; i < 300; i++) lignes.push([`Unité ${i % 5}`, `Risque ${i}`, 2, 3, 2]);
    for (const bookType of ["xlsx", "ods"] as const) {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lignes), "DUERP");
      const buf = XLSX.write(wb, { type: "buffer", bookType, compression: true }) as Buffer;
      const res = parserFichierDuerp(buf);
      expect(erreurDeFichier(res), bookType).toBeNull();
      expect(res.lignes, bookType).toHaveLength(300);
    }
  });

  it("un classeur légitime juste sous la borne passe", async () => {
    const buf = await classeurGonfle(TAILLE_DECOMPRESSEE_MAX_IMPORT - 64 * 1024);
    const res = parserFichierDuerp(buf);
    expect(erreurDeFichier(res)).toBeNull();
  });
});
