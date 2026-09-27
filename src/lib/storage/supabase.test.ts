// Le pilote Supabase contre un client simulé : un bucket en mémoire qui répond
// comme l'API de Storage — 400 « Object not found » pour une clé absente,
// `remove` d'une clé absente sans erreur, `exists` à `false` sur 400/404.

import { describe, expect, it, vi } from "vitest";
import { SupabaseFileStorage, type BucketStockage, type ClientStockage } from "./supabase";
import { ErreurStockage, FichierIntrouvable } from "./erreurs";

const SECRET = "sb_secret_NE_DOIT_JAMAIS_APPARAITRE";

function client(options: { panne?: string; leve?: boolean } = {}) {
  const fichiers = new Map<string, { corps: Buffer; mime: string }>();
  const absent = { message: "Object not found", status: 400, statusCode: "404" };
  const panne = () =>
    options.panne ? { data: null, error: { message: options.panne, status: 500 } } : null;
  const bucket: BucketStockage = {
    upload: vi.fn(async (chemin: string, corps: Buffer, o: { contentType: string; upsert: boolean }) => {
      if (options.leve) throw new Error("fetch failed");
      const p = panne();
      if (p) return p;
      fichiers.set(chemin, { corps, mime: o.contentType });
      return { data: { path: chemin }, error: null };
    }),
    download: vi.fn(async (chemin: string) => {
      const p = panne();
      if (p) return p;
      const f = fichiers.get(chemin);
      return f
        ? { data: new Blob([new Uint8Array(f.corps)], { type: f.mime }), error: null }
        : { data: null, error: absent };
    }),
    remove: vi.fn(async (chemins: string[]) => {
      const p = panne();
      if (p) return p;
      for (const c of chemins) fichiers.delete(c);
      return { data: [], error: null };
    }),
    list: vi.fn(async (dossier: string, o: { search: string; limit: number }) => {
      const p = panne();
      if (p) return p;
      const prefixe = dossier ? `${dossier}/` : "";
      const noms = [...fichiers.keys()]
        .filter((k) => k.startsWith(prefixe) && !k.slice(prefixe.length).includes("/"))
        .map((k) => k.slice(prefixe.length))
        .filter((n) => n.startsWith(o.search));
      return { data: noms.slice(0, o.limit).map((name) => ({ name })), error: null };
    }),
  };
  const from = vi.fn((_: string) => bucket);
  const c: ClientStockage = { storage: { from } };
  return { c, from, bucket, fichiers };
}

describe("SupabaseFileStorage", () => {
  it("écrit, relit, vérifie, supprime — dans le bucket nommé, mime transmis, écrasement permis", async () => {
    const { c, from, bucket, fichiers } = client();
    const s = new SupabaseFileStorage(c, "rojer-pieces");
    await s.put("rapports/e/r-a.pdf", Buffer.from("PDF"), "application/pdf");
    expect(from).toHaveBeenCalledWith("rojer-pieces");
    expect(bucket.upload).toHaveBeenCalledWith("rapports/e/r-a.pdf", Buffer.from("PDF"), {
      contentType: "application/pdf",
      upsert: true,
    });
    expect(fichiers.get("rapports/e/r-a.pdf")?.mime).toBe("application/pdf");
    expect((await s.get("rapports/e/r-a.pdf")).toString()).toBe("PDF");
    expect(await s.exists("rapports/e/r-a.pdf")).toBe(true);
    await s.delete("rapports/e/r-a.pdf");
    expect(await s.exists("rapports/e/r-a.pdf")).toBe(false);
  });

  it("exists veut le nom exact : « a.pdf » n'est pas « a.pdf.bak »", async () => {
    const { c } = client();
    const s = new SupabaseFileStorage(c, "b");
    await s.put("d/a.pdf.bak", Buffer.from("x"), "application/pdf");
    expect(await s.exists("d/a.pdf")).toBe(false);
    await s.put("racine.pdf", Buffer.from("x"), "application/pdf");
    expect(await s.exists("racine.pdf")).toBe(true);
  });

  it("clé absente : get lève FichierIntrouvable, exists rend false, delete ne fait rien", async () => {
    const { c } = client();
    const s = new SupabaseFileStorage(c, "b");
    await expect(s.get("rien/ici.pdf")).rejects.toBeInstanceOf(FichierIntrouvable);
    expect(await s.exists("rien/ici.pdf")).toBe(false);
    await expect(s.delete("rien/ici.pdf")).resolves.toBeUndefined();
  });

  it("une panne du service devient une ErreurStockage claire, sans secret", async () => {
    const { c } = client({ panne: "Internal Server Error" });
    const s = new SupabaseFileStorage(c, "b");
    for (const f of [
      () => s.put("a/b.pdf", Buffer.from("x"), "application/pdf"),
      () => s.get("a/b.pdf"),
      () => s.delete("a/b.pdf"),
      () => s.exists("a/b.pdf"),
    ]) {
      const e = await f().then(
        () => null,
        (err: unknown) => err,
      );
      expect(e).toBeInstanceOf(ErreurStockage);
      expect(e).not.toBeInstanceOf(FichierIntrouvable);
      expect((e as Error).message).toMatch(/Stockage Supabase : échec de .* pour « a\/b\.pdf » \(Internal Server Error\)/);
      expect((e as Error).message).not.toContain(SECRET);
    }
  });

  it("une exception brute du SDK (réseau) devient une ErreurStockage", async () => {
    const { c } = client({ leve: true });
    const s = new SupabaseFileStorage(c, "b");
    await expect(s.put("a/b.pdf", Buffer.from("x"), "application/pdf")).rejects.toThrow(
      /échec de l'écriture pour « a\/b\.pdf » \(fetch failed\)/,
    );
  });

  it("refuse une clé qui remonte ou qui est absolue, sans appeler le service", async () => {
    const { c, bucket } = client();
    const s = new SupabaseFileStorage(c, "b");
    for (const k of ["../x.pdf", "/abs.pdf", "a\\b.pdf", ""])
      await expect(s.put(k, Buffer.from("x"), "application/pdf")).rejects.toBeInstanceOf(ErreurStockage);
    expect(bucket.upload).not.toHaveBeenCalled();
  });
});
