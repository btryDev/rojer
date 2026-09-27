// Le pilote Supabase contre un VRAI service Storage (`supabase/storage-api`),
// lancé en local — jamais contre le projet de production.
//
// SAUTÉ PAR DÉFAUT : il ne tourne que si `STOCKAGE_INTEGRATION_URL` et
// `STOCKAGE_INTEGRATION_SERVICE_KEY` sont posées. Procédure (journal C46) :
// un Postgres jetable et `supabase/storage-api:v1.19.0` en conteneurs, une clé
// `service_role` signée localement, puis
//   STOCKAGE_INTEGRATION_URL=http://localhost:5055 \
//   STOCKAGE_INTEGRATION_SERVICE_KEY=… vitest run supabase.integration
//
// Le conteneur sert l'API à la racine ; le projet hébergé la sert sous
// `/storage/v1`. Le `fetch` ci-dessous retire ce préfixe : c'est le seul
// écart avec la production, et il ne touche pas au pilote.

import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SupabaseFileStorage } from "./supabase";
import { FichierIntrouvable } from "./erreurs";

const URL_SERVICE = process.env.STOCKAGE_INTEGRATION_URL;
const CLE = process.env.STOCKAGE_INTEGRATION_SERVICE_KEY;
const BUCKET = `rojer-test-${Date.now()}`;

describe.skipIf(!URL_SERVICE || !CLE)("SupabaseFileStorage — service réel local", () => {
  const client = createClient(URL_SERVICE ?? "http://x", CLE ?? "x", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (entree, init) =>
        fetch(String(entree).replace("/storage/v1", ""), init),
    },
  });
  const s = new SupabaseFileStorage(client, BUCKET);

  beforeAll(async () => {
    const { error } = await client.storage.createBucket(BUCKET, { public: false });
    if (error) throw new Error(error.message);
  });
  afterAll(async () => {
    await client.storage.emptyBucket(BUCKET);
    await client.storage.deleteBucket(BUCKET);
  });

  it("écrit, relit à l'octet près, avec son type, puis supprime", async () => {
    const corps = Buffer.from([37, 80, 68, 70, 45, 49, 46, 55, 0, 255]);
    await s.put("rapports/e1/r1-rapport.pdf", corps, "application/pdf");
    expect(await s.exists("rapports/e1/r1-rapport.pdf")).toBe(true);
    expect((await s.get("rapports/e1/r1-rapport.pdf")).equals(corps)).toBe(true);
    const { data } = await client.storage.from(BUCKET).info("rapports/e1/r1-rapport.pdf");
    expect(data?.contentType).toBe("application/pdf");
    await s.delete("rapports/e1/r1-rapport.pdf");
    expect(await s.exists("rapports/e1/r1-rapport.pdf")).toBe(false);
  });

  it("écrase une clé existante (upsert)", async () => {
    await s.put("a/b.pdf", Buffer.from("v1"), "application/pdf");
    await s.put("a/b.pdf", Buffer.from("v2"), "application/pdf");
    expect((await s.get("a/b.pdf")).toString()).toBe("v2");
  });

  it("clé absente : get lève FichierIntrouvable, exists rend false, delete ne lève pas", async () => {
    await expect(s.get("rien/ici.pdf")).rejects.toBeInstanceOf(FichierIntrouvable);
    expect(await s.exists("rien/ici.pdf")).toBe(false);
    await expect(s.delete("rien/ici.pdf")).resolves.toBeUndefined();
  });

  it("le bucket est privé : sans la clé de service, pas de lecture", async () => {
    await s.put("prive/x.pdf", Buffer.from("secret"), "application/pdf");
    const res = await fetch(`${URL_SERVICE}/object/public/${BUCKET}/prive/x.pdf`);
    expect(res.ok).toBe(false);
  });
});
