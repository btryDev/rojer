#!/usr/bin/env tsx
//
// Prépare un compte Stripe DE TEST pour essayer le parcours d'abonnement en
// local (ADR-053, notes de chantier § 9) : produits et prix des formules,
// configuration du portail client. Idempotent : relancé, il ne crée rien de
// ce qui existe déjà au bon réglage.
//
//   pnpm exec tsx scripts/stripe-installer-test.ts
//
// Lit `STRIPE_SECRET_KEY` (et `PUBLIC_APP_URL`) dans l'environnement, puis
// dans `.env.local` et `.env` du répertoire courant — une variable déjà posée
// l'emporte, `.env.local` sur `.env`. Toute clé qui n'est pas de test
// (`sk_test_`, `rk_test_`) arrête le script avant le moindre appel. Une clé
// restreinte doit pouvoir écrire les produits, les prix et le portail.
//
// MONTANTS : grille arrêtée avec la propriétaire le 2026-11-05
// (`docs/marketing/rojer-offres-abonnement-2026-11.pdf`, branche
// `docs/offres-abonnement`). En production, les prix se créent dans le
// tableau de bord ; ce script ne sert que le compte de test.

import { existsSync } from "node:fs";
import Stripe from "stripe";
import { CLES_FORMULES, FORMULES, INTERVALLE_STRIPE, PERIODICITES, lookupKey, LOOKUP_KEYS, type CleFormule, type Periodicite } from "../src/lib/abonnements/formules";

type Env = Record<string, string | undefined>;

/** Montants HT en centimes d'euro (voir l'en-tête). */
export const MONTANTS_CENTIMES = {
  essentiel: { mensuel: 2_900, annuel: 29_500 },
  pro: { mensuel: 8_900, annuel: 89_900 },
} as const satisfies Record<CleFormule, Record<Periodicite, number>>;

const DEVISE = "eur";
/** Marque la configuration de portail créée par ce script quand le compte n'en a aucune par défaut. */
const MARQUE_PORTAIL = { rojer: "installer-test" };

/** La clé de test, ou le motif du refus — sans jamais citer la valeur. */
export function cleDeTest(env: Env): { cle: string } | { refus: string } {
  const cle = env.STRIPE_SECRET_KEY?.trim();
  if (!cle) return { refus: "STRIPE_SECRET_KEY absente (environnement, .env.local, .env)" };
  if (/^(sk|rk)_live_/.test(cle)) return { refus: "clé Stripe de production : ce script ne prépare qu'un compte de test" };
  if (!/^(sk|rk)_test_\w+$/.test(cle)) return { refus: "STRIPE_SECRET_KEY n'a pas la forme d'une clé de test (sk_test_ ou rk_test_)" };
  return { cle };
}

const idProduit = (p: Stripe.Price["product"]) => (typeof p === "string" ? p : p.id);

/** Un produit actif par formule, reconnu à `metadata.formule`. */
export async function installerProduits(stripe: Stripe): Promise<Record<CleFormule, Stripe.Product>> {
  const { data } = await stripe.products.list({ active: true, limit: 100 });
  const produits = {} as Record<CleFormule, Stripe.Product>;
  for (const formule of CLES_FORMULES) {
    const nom = FORMULES[formule].libelle;
    const existant = data.find((p) => p.metadata?.formule === formule);
    produits[formule] = !existant
      ? await stripe.products.create({ name: nom, metadata: { formule } })
      : existant.name !== nom
        ? await stripe.products.update(existant.id, { name: nom })
        : existant;
  }
  return produits;
}

/** Le prix existant convient-il tel quel ? Montant, devise, intervalle, produit, HT. */
export function prixConforme(p: Stripe.Price, produitId: string, montant: number, periodicite: Periodicite): boolean {
  return (
    p.active &&
    idProduit(p.product) === produitId &&
    p.unit_amount === montant &&
    p.currency === DEVISE &&
    p.recurring?.interval === INTERVALLE_STRIPE[periodicite] &&
    (p.recurring?.interval_count ?? 1) === 1 &&
    p.tax_behavior === "exclusive"
  );
}

export type PrixInstalle = { lookupKey: string; prix: Stripe.Price; cree: boolean };

/**
 * Un prix récurrent par formule et périodicité, porteur de sa `lookup_key`.
 * Un prix actif conforme est gardé ; sinon un nouveau prix reprend la clé
 * (`transfer_lookup_key`) — l'ancien reste, sans clé, pour les abonnements
 * qui l'utilisent.
 */
export async function installerPrix(stripe: Stripe, produits: Record<CleFormule, Stripe.Product>): Promise<PrixInstalle[]> {
  const { data } = await stripe.prices.list({ lookup_keys: LOOKUP_KEYS, active: true, limit: 10 });
  const installes: PrixInstalle[] = [];
  for (const formule of CLES_FORMULES) {
    for (const periodicite of PERIODICITES) {
      const cle = lookupKey(formule, periodicite);
      const montant = MONTANTS_CENTIMES[formule][periodicite];
      const produitId = produits[formule].id;
      const existant = data.find((p) => p.lookup_key === cle);
      if (existant && prixConforme(existant, produitId, montant, periodicite)) {
        installes.push({ lookupKey: cle, prix: existant, cree: false });
        continue;
      }
      const prix = await stripe.prices.create({
        product: produitId,
        currency: DEVISE,
        unit_amount: montant,
        recurring: { interval: INTERVALLE_STRIPE[periodicite] },
        tax_behavior: "exclusive",
        lookup_key: cle,
        transfer_lookup_key: true,
        nickname: `${FORMULES[formule].libelle} ${periodicite}`,
        metadata: { formule, periodicite },
      });
      installes.push({ lookupKey: cle, prix, cree: true });
    }
  }
  return installes;
}

/** L'URL des conditions, seulement si `PUBLIC_APP_URL` est une adresse publique (https). */
export function urlConditions(env: Env): string | null {
  const base = env.PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  return base && base.startsWith("https://") ? `${base}/conditions` : null;
}

/**
 * Le portail (ADR-053 § 10) : factures, moyen de paiement, résiliation en fin
 * de période, changement de formule entre les prix installés SANS mettre fin
 * à l'essai, e-mail, adresse et numéro de TVA.
 */
export function parametresPortail(
  produits: Record<CleFormule, Stripe.Product>,
  prix: PrixInstalle[],
  conditions: string | null,
): Stripe.BillingPortal.ConfigurationCreateParams {
  return {
    ...(conditions ? { business_profile: { terms_of_service_url: conditions } } : {}),
    features: {
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none" },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        products: CLES_FORMULES.map((f) => ({
          product: produits[f].id,
          prices: prix.filter((p) => idProduit(p.prix.product) === produits[f].id).map((p) => p.prix.id),
        })),
        // Pendant l'essai : la nouvelle formule, l'essai continue, rien n'est facturé.
        trial_update_behavior: "continue_trial",
        // Après l'essai : l'écart est porté sur la prochaine facture, pas prélevé sur-le-champ.
        proration_behavior: "create_prorations",
      },
      customer_update: { enabled: true, allowed_updates: ["name", "email", "address", "tax_id"] },
    },
  };
}

export type ResultatPortail = { id: string; parDefaut: boolean; cree: boolean };

/** Met à jour la configuration par défaut ; à défaut, celle de ce script, ou la crée. */
export async function installerPortail(
  stripe: Stripe,
  params: Stripe.BillingPortal.ConfigurationCreateParams,
): Promise<ResultatPortail> {
  const parDefaut = (await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 })).data[0];
  if (parDefaut) {
    await stripe.billingPortal.configurations.update(parDefaut.id, params);
    return { id: parDefaut.id, parDefaut: true, cree: false };
  }
  const actives = (await stripe.billingPortal.configurations.list({ active: true, limit: 100 })).data;
  const notre = actives.find((c) => c.metadata?.rojer === MARQUE_PORTAIL.rojer);
  if (notre) {
    await stripe.billingPortal.configurations.update(notre.id, { ...params, metadata: MARQUE_PORTAIL });
    return { id: notre.id, parDefaut: false, cree: false };
  }
  const creee = await stripe.billingPortal.configurations.create({ ...params, metadata: MARQUE_PORTAIL });
  return { id: creee.id, parDefaut: false, cree: true };
}

export type Installation =
  | { ok: false; motif: string }
  | {
      ok: true;
      produits: Record<CleFormule, Stripe.Product>;
      prix: PrixInstalle[];
      portail: ResultatPortail;
      conditions: string | null;
    };

/** Tout le travail ; le client n'est fabriqué qu'une fois la clé reconnue de test. */
export async function installer(env: Env, creerClient: (cle: string) => Stripe): Promise<Installation> {
  const cle = cleDeTest(env);
  if ("refus" in cle) return { ok: false, motif: cle.refus };
  const stripe = creerClient(cle.cle);
  const produits = await installerProduits(stripe);
  const prix = await installerPrix(stripe, produits);
  const conditions = urlConditions(env);
  const portail = await installerPortail(stripe, parametresPortail(produits, prix, conditions));
  return { ok: true, produits, prix, portail, conditions };
}

/** Ce qui ne se règle pas par l'API : à faire dans le tableau de bord de test. */
export const REGLAGES_MANUELS = [
  "Réglages > Informations publiques : URL des conditions d'utilisation (…/conditions). Checkout refuse " +
    "`consent_collection` sans elle ; l'API ne règle pas le profil public de son propre compte.",
  "Réglages > Billing > Abonnements et e-mails : e-mail de rappel 7 jours avant la fin d'un essai gratuit " +
    "(et le lien de gestion qu'il porte). Aucune ressource de l'API ne le règle.",
  "Réglages > E-mails clients : envoi des factures et reçus, si on veut les voir partir en test.",
];

function recapitulatif(r: Extract<Installation, { ok: true }>): string {
  const lignes = ["Compte Stripe de test préparé.", "", "Produits :"];
  for (const f of CLES_FORMULES) lignes.push(`  ${r.produits[f].name.padEnd(10)} ${r.produits[f].id}`);
  lignes.push("", "Prix (montants HT) :");
  for (const p of r.prix) {
    const montant = ((p.prix.unit_amount ?? 0) / 100).toFixed(2).replace(".", ",");
    const etat = p.cree ? "créé" : "gardé";
    lignes.push(`  ${p.lookupKey.padEnd(22)} ${p.prix.id}  ${montant} € / ${p.prix.recurring?.interval}  (${etat})`);
  }
  lignes.push("", `Portail client : ${r.portail.id} (${r.portail.cree ? "créée" : "mise à jour"})`);
  if (!r.portail.parDefaut) {
    lignes.push(
      "  ATTENTION : le compte n'a pas de configuration de portail PAR DÉFAUT. Rojer ouvre le portail sans",
      "  configuration nommée, donc avec celle par défaut : enregistrer une fois les réglages du portail",
      "  dans le tableau de bord de test (Réglages > Billing > Portail client), puis relancer ce script.",
    );
  }
  if (!r.conditions) {
    lignes.push("  URL des conditions non transmise au portail : PUBLIC_APP_URL absente ou non publique (https).");
  }
  lignes.push("", "À régler à la main dans le tableau de bord de test :");
  for (const reglage of REGLAGES_MANUELS) lignes.push(`  - ${reglage}`);
  return lignes.join("\n");
}

async function main() {
  for (const fichier of [".env.local", ".env"]) if (existsSync(fichier)) process.loadEnvFile(fichier);
  const resultat = await installer(
    process.env,
    // `Stripe.API_VERSION` : celle du SDK installé, que `src/lib/stripe/client.ts` épingle aussi.
    (cle) => new Stripe(cle, { apiVersion: Stripe.API_VERSION, appInfo: { name: "Rojer (installation de test)" } }),
  );
  if (!resultat.ok) {
    console.error(`Arrêt, rien n'a été appelé : ${resultat.motif}.`);
    process.exitCode = 1;
    return;
  }
  console.log(recapitulatif(resultat));
}

if (process.argv[1]?.endsWith("stripe-installer-test.ts")) {
  main().catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
