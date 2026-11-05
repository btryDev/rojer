// `scripts/stripe-installer-test.ts` : refus d'une clé de production sans
// aucun appel, idempotence des produits et des prix, portail réglé pour ne
// pas mettre fin à l'essai (ADR-053 § 10).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { installer, MONTANTS_CENTIMES, urlConditions } from "../../../scripts/stripe-installer-test";
import { LOOKUP_KEYS } from "@/lib/abonnements/formules";

const api = {
  products: { list: vi.fn(), create: vi.fn(), update: vi.fn() },
  prices: { list: vi.fn(), create: vi.fn() },
  billingPortal: { configurations: { list: vi.fn(), create: vi.fn(), update: vi.fn() } },
};
const creerClient = vi.fn(() => api as unknown as Stripe);
const ENV = { STRIPE_SECRET_KEY: "sk_test_abc", PUBLIC_APP_URL: "https://rojer.example" };

const produit = (formule: string, libelle: string) => ({ id: `prod_${formule}`, name: libelle, metadata: { formule } });
const PRODUITS = [produit("essentiel", "Essentiel"), produit("pro", "Pro")];

/** Le prix tel que Stripe le rendrait pour une clé, au montant du script. */
function prixConformeA(cle: string, montant?: number) {
  const [, formule, periodicite] = cle.split("_") as [string, "essentiel" | "pro", "mensuel" | "annuel"];
  return {
    id: `price_${formule}_${periodicite}`,
    active: true,
    product: `prod_${formule}`,
    lookup_key: cle,
    unit_amount: montant ?? MONTANTS_CENTIMES[formule][periodicite],
    currency: "eur",
    recurring: { interval: periodicite === "mensuel" ? "month" : "year", interval_count: 1 },
    tax_behavior: "exclusive",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.products.list.mockResolvedValue({ data: PRODUITS });
  api.prices.list.mockResolvedValue({ data: LOOKUP_KEYS.map((k) => prixConformeA(k)) });
  api.prices.create.mockImplementation(async (p: { lookup_key: string }) => ({ ...prixConformeA(p.lookup_key), id: `price_neuf_${p.lookup_key}` }));
  api.billingPortal.configurations.list.mockResolvedValue({ data: [{ id: "bpc_defaut", is_default: true }] });
});

describe("installation d'un compte Stripe de test", () => {
  it.each(["sk_live_abc", "rk_live_abc", "pk_test_abc", "", undefined])("refuse %s sans fabriquer de client", async (cle) => {
    const r = await installer({ STRIPE_SECRET_KEY: cle }, creerClient);
    expect(r.ok).toBe(false);
    expect(creerClient).not.toHaveBeenCalled();
    if (!r.ok && cle) expect(r.motif).not.toContain(cle);
  });

  it("relancé sur un compte déjà prêt : rien n'est créé", async () => {
    const r = await installer(ENV, creerClient);
    expect(r.ok).toBe(true);
    expect(api.products.create).not.toHaveBeenCalled();
    expect(api.products.update).not.toHaveBeenCalled();
    expect(api.prices.create).not.toHaveBeenCalled();
    expect(api.billingPortal.configurations.create).not.toHaveBeenCalled();
  });

  it("compte vide : un produit par formule, un prix par clé, qui reprend la clé", async () => {
    api.products.list.mockResolvedValue({ data: [] });
    api.products.create.mockImplementation(async (p: { metadata: { formule: string }; name: string }) =>
      produit(p.metadata.formule, p.name),
    );
    api.prices.list.mockResolvedValue({ data: [] });
    await installer(ENV, creerClient);
    expect(api.products.create.mock.calls.map((c) => c[0])).toEqual([
      { name: "Essentiel", metadata: { formule: "essentiel" } },
      { name: "Pro", metadata: { formule: "pro" } },
    ]);
    expect(api.prices.create).toHaveBeenCalledTimes(LOOKUP_KEYS.length);
    expect(api.prices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        product: "prod_pro",
        currency: "eur",
        unit_amount: 89_900,
        recurring: { interval: "year" },
        tax_behavior: "exclusive",
        lookup_key: "rojer_pro_annuel",
        transfer_lookup_key: true,
      }),
    );
  });

  it("un prix au mauvais montant est remplacé par un prix qui reprend sa clé ; les autres sont gardés", async () => {
    api.prices.list.mockResolvedValue({
      data: LOOKUP_KEYS.map((k) => (k === "rojer_essentiel_mensuel" ? prixConformeA(k, 2_500) : prixConformeA(k))),
    });
    const r = await installer(ENV, creerClient);
    expect(api.prices.create).toHaveBeenCalledTimes(1);
    expect(api.prices.create).toHaveBeenCalledWith(
      expect.objectContaining({ lookup_key: "rojer_essentiel_mensuel", unit_amount: 2_900, transfer_lookup_key: true }),
    );
    if (!r.ok) throw new Error("installation refusée");
    expect(r.prix.find((p) => p.lookupKey === "rojer_essentiel_mensuel")).toMatchObject({ cree: true, prix: { id: "price_neuf_rojer_essentiel_mensuel" } });
    expect(r.prix.filter((p) => p.cree)).toHaveLength(1);
  });

  it("un prix au bon montant mais au mauvais intervalle est remplacé", async () => {
    api.prices.list.mockResolvedValue({
      data: LOOKUP_KEYS.map((k) =>
        k === "rojer_pro_annuel" ? { ...prixConformeA(k), recurring: { interval: "month", interval_count: 1 } } : prixConformeA(k),
      ),
    });
    await installer(ENV, creerClient);
    expect(api.prices.create).toHaveBeenCalledTimes(1);
    expect(api.prices.create).toHaveBeenCalledWith(expect.objectContaining({ lookup_key: "rojer_pro_annuel" }));
  });

  it("portail : la configuration par défaut est mise à jour, changement de formule sans fin d'essai", async () => {
    await installer(ENV, creerClient);
    expect(api.billingPortal.configurations.list).toHaveBeenCalledWith({ is_default: true, limit: 1 });
    const [id, params] = api.billingPortal.configurations.update.mock.calls[0];
    expect(id).toBe("bpc_defaut");
    expect(params.business_profile).toEqual({ terms_of_service_url: "https://rojer.example/conditions" });
    expect(params.features).toEqual({
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none" },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        products: [
          { product: "prod_essentiel", prices: ["price_essentiel_mensuel", "price_essentiel_annuel"] },
          { product: "prod_pro", prices: ["price_pro_mensuel", "price_pro_annuel"] },
        ],
        trial_update_behavior: "continue_trial",
        proration_behavior: "create_prorations",
      },
      customer_update: { enabled: true, allowed_updates: ["name", "email", "address", "tax_id"] },
    });
  });

  it("portail sans configuration par défaut : celle du script est créée une fois, puis reprise", async () => {
    api.billingPortal.configurations.list.mockImplementation(async () => ({ data: [] }));
    api.billingPortal.configurations.create.mockResolvedValue({ id: "bpc_script" });
    const r = await installer({ STRIPE_SECRET_KEY: "rk_test_abc" }, creerClient);
    expect(r).toMatchObject({ ok: true, portail: { id: "bpc_script", parDefaut: false, cree: true }, conditions: null });
    const params = api.billingPortal.configurations.create.mock.calls[0][0];
    expect(params.metadata).toEqual({ rojer: "installer-test" });
    expect(params.business_profile).toBeUndefined();
    expect(params.features.subscription_update.trial_update_behavior).toBe("continue_trial");

    api.billingPortal.configurations.list.mockImplementation(async (p: { is_default?: boolean }) => ({
      data: p.is_default ? [] : [{ id: "autre", metadata: {} }, { id: "bpc_script", metadata: { rojer: "installer-test" } }],
    }));
    api.billingPortal.configurations.create.mockClear();
    const r2 = await installer({ STRIPE_SECRET_KEY: "rk_test_abc" }, creerClient);
    expect(api.billingPortal.configurations.create).not.toHaveBeenCalled();
    expect(api.billingPortal.configurations.update).toHaveBeenCalledWith("bpc_script", expect.objectContaining({ metadata: { rojer: "installer-test" } }));
    expect(r2).toMatchObject({ portail: { id: "bpc_script", cree: false } });
  });

  it("URL des conditions : seulement une adresse publique", () => {
    expect(urlConditions({ PUBLIC_APP_URL: "https://rojer.fr/" })).toBe("https://rojer.fr/conditions");
    expect(urlConditions({ PUBLIC_APP_URL: "http://localhost:3007" })).toBeNull();
    expect(urlConditions({})).toBeNull();
  });
});
