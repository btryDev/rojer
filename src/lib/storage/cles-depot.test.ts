/**
 * Un nom de fichier ordinaire ne fait pas échouer un dépôt (audit du
 * 2026-10-13, B4).
 *
 * Les clés de stockage gardaient les « .. » du nom d'origine
 * (« rapport..pdf », fréquent quand un nom est tapé à la main) ; les deux
 * pilotes refusent toute clé qui contient « .. » — c'est leur garde contre la
 * remontée d'arborescence —, et le dépôt échouait. L'assainissement doit
 * produire une clé que les pilotes acceptent, SANS que la garde des pilotes
 * soit desserrée : on l'éprouve aussi.
 */
import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { cleRapport } from "./index";
import { clePiecePrestataire } from "@/lib/prestataires/storage";
import { LocalFileStorage } from "./local";
import { SupabaseFileStorage, type BucketStockage, type ClientStockage } from "./supabase";

const NOMS = ["rapport..pdf", "..", "...pdf", "a...b..pdf", "../../etc/passwd", "..\\..\\x.pdf"];

const CONSTRUCTEURS: [string, (nom: string) => string][] = [
  ["cleRapport", (nom) => cleRapport("etab-1", "rap-1", nom)],
  ["clePiecePrestataire", (nom) => clePiecePrestataire("etab-1", "pre-1", "urssaf", nom)],
];

function supabase(): SupabaseFileStorage {
  const bucket = {
    upload: async (chemin: string) => ({ data: { path: chemin }, error: null }),
  } as unknown as BucketStockage;
  const c: ClientStockage = { storage: { from: () => bucket } };
  return new SupabaseFileStorage(c, "b");
}

const dossiers: string[] = [];
afterEach(async () => {
  for (const d of dossiers.splice(0)) await fs.rm(d, { recursive: true, force: true });
});

describe.each(CONSTRUCTEURS)("%s", (_nom, cle) => {
  it.each(NOMS)("« %s » donne une clé que les deux pilotes acceptent", async (nom) => {
    const k = cle(nom);
    expect(k).not.toContain("..");
    expect(k).not.toContain("\\");

    const racine = await fs.mkdtemp(path.join(os.tmpdir(), "rojer-cles-"));
    dossiers.push(racine);
    await expect(
      new LocalFileStorage(racine).put(k, Buffer.from("x"), "application/pdf"),
    ).resolves.toBeUndefined();
    await expect(supabase().put(k, Buffer.from("x"), "application/pdf")).resolves.toBeUndefined();
  });

  it("garde l'extension et le nom lisible", () => {
    expect(cle("rapport..pdf")).toMatch(/rapport\.pdf$/);
    expect(cle("rapport final.pdf")).toMatch(/rapport_final\.pdf$/);
  });
});

describe("la garde des pilotes n'est pas desserrée", () => {
  it("une clé qui remonte reste refusée, en local comme chez Supabase", async () => {
    const racine = await fs.mkdtemp(path.join(os.tmpdir(), "rojer-cles-"));
    dossiers.push(racine);
    await expect(
      new LocalFileStorage(racine).put("rapports/../x.pdf", Buffer.from("x"), "application/pdf"),
    ).rejects.toThrow(/invalide/);
    await expect(
      supabase().put("rapports/../x.pdf", Buffer.from("x"), "application/pdf"),
    ).rejects.toThrow(/invalide/);
  });
});
