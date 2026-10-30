import { describe, expect, it } from "vitest";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { ErreurStockage, FichierIntrouvable } from "./erreurs";
import { S3FileStorage, pointDAcces, type ClientS3 } from "./s3";

// Le pilote Cellar contre un S3 en mémoire : aucun appel réseau, aucune clé
// réelle. Le double reçoit les VRAIES commandes du SDK et lit leur `input`,
// comme le ferait le service.

type Erreur = Error & { $metadata?: { httpStatusCode?: number } };

function erreurS3(name: string, statut: number): Erreur {
  const e = new Error(name) as Erreur;
  e.name = name;
  e.$metadata = { httpStatusCode: statut };
  return e;
}

function s3EnMemoire(panne?: Erreur, delaiMs = 5_000) {
  const objets = new Map<string, { corps: Buffer; type?: string }>();
  const commandes: object[] = [];
  const signaux: (AbortSignal | undefined)[] = [];
  const client: ClientS3 = {
    async send(commande, options) {
      commandes.push(commande);
      signaux.push(options?.abortSignal);
      if (panne) throw panne;
      const { input } = commande as { input: { Bucket: string; Key: string; Body?: Buffer; ContentType?: string } };
      const cle = `${input.Bucket}/${input.Key}`;
      if (commande instanceof PutObjectCommand) {
        objets.set(cle, { corps: Buffer.from(input.Body!), type: input.ContentType });
        return {};
      }
      if (commande instanceof GetObjectCommand) {
        // Un service qui ne répond jamais : seule l'échéance l'interrompt.
        if (input.Key.startsWith("lente/")) {
          return new Promise((_, rejeter) =>
            options?.abortSignal?.addEventListener("abort", () =>
              rejeter(Object.assign(new Error("aborted"), { name: "AbortError" })),
            ),
          );
        }
        const o = objets.get(cle);
        if (!o) throw erreurS3("NoSuchKey", 404);
        return { Body: { transformToByteArray: async () => new Uint8Array(o.corps) } };
      }
      if (commande instanceof HeadObjectCommand) {
        if (!objets.has(cle)) throw erreurS3("NotFound", 404);
        return {};
      }
      if (commande instanceof DeleteObjectCommand) {
        objets.delete(cle);
        return {};
      }
      throw new Error("commande inattendue");
    },
  };
  return { stockage: new S3FileStorage(client, "rojer-pieces", delaiMs), objets, commandes, signaux };
}

describe("pilote s3 — les quatre opérations", () => {
  it("écrit, lit, sait qu'il existe, supprime", async () => {
    const { stockage, objets } = s3EnMemoire();
    await stockage.put("rapports/etab/r1-rapport.pdf", Buffer.from("PDF"), "application/pdf");
    expect(objets.get("rojer-pieces/rapports/etab/r1-rapport.pdf")?.type).toBe("application/pdf");
    expect((await stockage.get("rapports/etab/r1-rapport.pdf")).toString()).toBe("PDF");
    expect(await stockage.exists("rapports/etab/r1-rapport.pdf")).toBe(true);
    await stockage.delete("rapports/etab/r1-rapport.pdf");
    expect(await stockage.exists("rapports/etab/r1-rapport.pdf")).toBe(false);
  });

  it("écrase une clé existante, comme les autres pilotes", async () => {
    const { stockage } = s3EnMemoire();
    await stockage.put("a/b.txt", Buffer.from("un"), "text/plain");
    await stockage.put("a/b.txt", Buffer.from("deux"), "text/plain");
    expect((await stockage.get("a/b.txt")).toString()).toBe("deux");
  });

  it("absent : FichierIntrouvable à la lecture, false à l'existence, rien à la suppression", async () => {
    const { stockage } = s3EnMemoire();
    await expect(stockage.get("absent.pdf")).rejects.toBeInstanceOf(FichierIntrouvable);
    expect(await stockage.exists("absent.pdf")).toBe(false);
    await expect(stockage.delete("absent.pdf")).resolves.toBeUndefined();
  });
});

describe("pilote s3 — erreurs", () => {
  it.each(["../etab/x.pdf", "/racine.pdf", "a\\b.pdf", ""])(
    "clé « %s » refusée sans appeler le service",
    async (cle) => {
      const { stockage, commandes } = s3EnMemoire();
      await expect(stockage.put(cle, Buffer.from("x"), "text/plain")).rejects.toBeInstanceOf(ErreurStockage);
      expect(commandes).toHaveLength(0);
    },
  );

  it("une panne du service devient une ErreurStockage qui nomme l'opération et la clé", async () => {
    const { stockage } = s3EnMemoire(erreurS3("AccessDenied", 403));
    const e = (await stockage.put("a/b.pdf", Buffer.from("x"), "application/pdf").catch((x: unknown) => x)) as Error;
    expect(e).toBeInstanceOf(ErreurStockage);
    expect(e).not.toBeInstanceOf(FichierIntrouvable);
    expect(e.message).toMatch(/écriture.*a\/b\.pdf.*AccessDenied.*HTTP 403/);
  });

  it("une panne n'est jamais lue comme une absence", async () => {
    const { stockage } = s3EnMemoire(erreurS3("InternalError", 500));
    await expect(stockage.exists("a/b.pdf")).rejects.toBeInstanceOf(ErreurStockage);
    await expect(stockage.delete("a/b.pdf")).rejects.toBeInstanceOf(ErreurStockage);
    const e = await stockage.get("a/b.pdf").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErreurStockage);
    expect(e).not.toBeInstanceOf(FichierIntrouvable);
  });
});

describe("pilote s3 — échéance et bucket", () => {
  it("chaque opération porte une échéance", async () => {
    const { stockage, signaux } = s3EnMemoire();
    await stockage.put("a/b.txt", Buffer.from("x"), "text/plain");
    await stockage.exists("a/b.txt");
    await stockage.get("a/b.txt");
    await stockage.delete("a/b.txt");
    expect(signaux).toHaveLength(4);
    expect(signaux.every((s) => s instanceof AbortSignal)).toBe(true);
  });

  it("un service qui ne répond pas : ErreurStockage à l'échéance, pas une attente sans fin", async () => {
    const { stockage } = s3EnMemoire(undefined, 30);
    const e = await stockage.get("lente/rapport.pdf").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErreurStockage);
    expect(e).not.toBeInstanceOf(FichierIntrouvable);
  });

  it("un bucket absent (NoSuchBucket) est une panne, pas un fichier introuvable", async () => {
    const { stockage } = s3EnMemoire(erreurS3("NoSuchBucket", 404));
    const e = await stockage.get("a/b.pdf").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErreurStockage);
    expect(e).not.toBeInstanceOf(FichierIntrouvable);
    await expect(stockage.delete("a/b.pdf")).rejects.toBeInstanceOf(ErreurStockage);
  });
});

describe("pointDAcces — l'hôte de Cellar, nu ou en URL", () => {
  it.each([
    ["cellar-c2.services.clever-cloud.com", "https://cellar-c2.services.clever-cloud.com"],
    ["https://cellar-c2.services.clever-cloud.com/", "https://cellar-c2.services.clever-cloud.com"],
    ["  cellar-c2.services.clever-cloud.com  ", "https://cellar-c2.services.clever-cloud.com"],
  ])("%s → %s", (hote, attendu) => {
    expect(pointDAcces(hote)).toBe(attendu);
  });
});
