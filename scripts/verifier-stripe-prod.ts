/**
 * Vérifier que Stripe est prêt en PRODUCTION, sans aucun paiement — depuis un
 * poste.
 *
 *   pnpm verifier-stripe-prod
 *
 * POURQUOI (2026-11-26). Il n'y a plus de préproduction, et la clé restreinte
 * de production (`rk_live_`) a été créée directement en mode réel, sans
 * passer par une clé de test éprouvée puis dupliquée, comme le recommande
 * Stripe (docs.stripe.com/keys/restricted-api-keys). Tant que l'offre n'est
 * pas ouverte, l'application n'appelle jamais Stripe : un droit oublié ne se
 * verrait qu'au premier client. Ce script appelle, une fois, chaque ressource
 * que l'application utilise, avec la clé de la production.
 *
 * CE QU'IL VÉRIFIE
 * - Le catalogue : les quatre prix des formules (`LOOKUP_KEYS`), actifs, en
 *   euros, à l'intervalle de leur clé ; le taux de TVA conforme (`tva.ts`) ;
 *   le portail client (changement de formule fermé, résiliation ouverte).
 * - Les droits de la clé, ressource par ressource, avec les appels mêmes de
 *   l'application (inventaire du 2026-11-26 : `stripe.*` dans `src/`) :
 *   - réellement, sur un client fictif créé puis supprimé : client (création,
 *     modification, suppression), portail, page de paiement (créée avec les
 *     paramètres de `ouvrirCheckout`, conditions comprises, puis expirée
 *     sans paiement) ;
 *   - sur des identifiants fictifs, pour les gestes qu'on ne peut pas jouer
 *     sans paiement (annuler une facture, modifier un abonnement…) : Stripe
 *     vérifie le droit avant de chercher l'objet ; « introuvable » prouve donc
 *     le droit, « permission » prouve qu'il manque.
 *
 * CE QU'IL NE PROUVE PAS : un vrai prélèvement. Le contrat de Stripe interdit
 * de tester en mode réel avec une vraie carte ; le premier client le prouvera.
 *
 * CE QU'IL GARANTIT
 * - La cible est la production de Rojer, par son identifiant, en dur.
 * - La clé est demandée à Clever Cloud à l'exécution (`clever env`), gardée en
 *   mémoire, jamais écrite ni affichée ; les messages d'erreur de Stripe ne
 *   sont pas recopiés (ils peuvent citer un fragment de la clé) : seuls le
 *   statut, le code et le nom du droit manquant (`rak_…`) s'affichent.
 * - Aucun paiement, aucun abonnement, aucune facture. Le client fictif est
 *   supprimé à la fin, même en cas d'échec ; sinon son identifiant s'affiche.
 * - Il refuse de tourner sur une instance Clever Cloud.
 */
import { execFileSync } from "node:child_process";
import Stripe from "stripe";
import { LOOKUP_KEYS, formuleDeLookupKey } from "../src/lib/abonnements/formules";
import { tauxConformes } from "../src/lib/stripe/tva";

const APP_PROD = "app_818c5cef-038d-4b93-bf27-efc6a78b9e1c";
const URL_PROD = "https://rojer.fr";
const INTERVALLE = { mensuel: "month", annuel: "year" } as const;

function refus(message: string): never {
  console.error(`Refusé : ${message}`);
  process.exit(1);
}

/**
 * Les paires nom/valeur du JSON de `clever env` (même lecture que
 * `lire-preprod.ts`, qui s'exécute à l'import et ne s'importe donc pas) : la
 * première valeur d'un nom l'emporte, une application liée est ignorée.
 */
function variables(noeud: unknown, vues = new Map<string, string>()): Map<string, string> {
  if (Array.isArray(noeud)) {
    for (const n of noeud) variables(n, vues);
  } else if (noeud && typeof noeud === "object") {
    const o = noeud as Record<string, unknown>;
    if (typeof o.name === "string" && typeof o.value === "string") {
      if (!vues.has(o.name)) vues.set(o.name, o.value);
    } else {
      for (const [cle, v] of Object.entries(o)) {
        if (cle !== "fromDependencies") variables(v, vues);
      }
    }
  }
  return vues;
}

function configurationDeLaProd(): { cle: string; conditions: boolean } {
  let brut: string;
  try {
    brut = execFileSync("clever", ["env", "--app", APP_PROD, "--format", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
    });
  } catch {
    refus("`clever env` a échoué : CLI absente ou non connectée (clever login).");
  }
  const vars = variables(JSON.parse(brut));
  const cle = vars.get("STRIPE_SECRET_KEY")?.trim();
  if (!cle) refus("STRIPE_SECRET_KEY absente de la production.");
  if (!/^rk_live_\w+$/.test(cle)) refus("STRIPE_SECRET_KEY n'a pas la forme d'une clé restreinte de production (rk_live_…).");
  // Même lecture que `config.ts` : seul « non » retire l'acceptation des conditions.
  const conditions = vars.get("STRIPE_CONDITIONS_SUR_CHECKOUT")?.trim().toLowerCase() !== "non";
  return { cle, conditions };
}

type Etat = "ok" | "manque" | "erreur";
type Resultat = { nom: string; etat: Etat; detail: string };
const resultats: Resultat[] = [];
const noter = (nom: string, etat: Etat, detail: string) => resultats.push({ nom, etat, detail });

/** Une erreur Stripe, sans recopier son message (il peut citer un fragment de la clé). */
function lireErreur(e: unknown): { droitManquant: string | null; introuvable: boolean; resume: string } {
  const err = e as { statusCode?: number; code?: string; type?: string; message?: string };
  const message = String(err.message ?? "");
  const droits = [...message.matchAll(/'(rak_[a-z0-9_]+)'/g)].map((m) => m[1]);
  const refusDeDroit = err.statusCode === 403 || droits.length > 0 || /permission/i.test(message);
  return {
    droitManquant: refusDeDroit ? (droits.length ? droits.join(", ") : "droit refusé (403)") : null,
    introuvable: err.statusCode === 404 || err.code === "resource_missing",
    resume: `${err.statusCode ?? "?"} ${err.code ?? err.type ?? ""}`.trim(),
  };
}

/** Un appel réel : il doit réussir. */
async function appel<T>(nom: string, f: () => Promise<T>): Promise<T | null> {
  try {
    const r = await f();
    noter(nom, "ok", "droit accordé");
    return r;
  } catch (e) {
    const { droitManquant, resume } = lireErreur(e);
    noter(nom, droitManquant ? "manque" : "erreur", droitManquant ? `à ajouter : ${droitManquant}` : resume);
    return null;
  }
}

/** Un geste sur un objet fictif : « introuvable » prouve le droit. */
async function sonde(nom: string, f: () => Promise<unknown>) {
  try {
    await f();
    noter(nom, "erreur", "l'objet fictif a été trouvé : inattendu");
  } catch (e) {
    const { droitManquant, introuvable, resume } = lireErreur(e);
    if (droitManquant) noter(nom, "manque", `à ajouter : ${droitManquant}`);
    else if (introuvable) noter(nom, "ok", "droit accordé");
    else noter(nom, "erreur", resume);
  }
}

async function catalogue(stripe: Stripe): Promise<{ priceId: string | null; tauxTva: string | null }> {
  let priceId: string | null = null;
  const liste = await appel("Prix (lecture)", () => stripe.prices.list({ lookup_keys: LOOKUP_KEYS, active: true, limit: 10 }));
  if (liste) {
    const trouves = new Set<string>();
    for (const p of liste.data) {
      const cle = formuleDeLookupKey(p.lookup_key);
      if (!cle) continue;
      const fautes = [
        p.currency !== "eur" ? `devise ${p.currency}` : null,
        p.recurring?.interval !== INTERVALLE[cle.periodicite] ? "intervalle contraire à la clé" : null,
        p.unit_amount === null ? "sans montant" : null,
      ].filter(Boolean);
      const montant = p.unit_amount === null ? "?" : `${(p.unit_amount / 100).toFixed(2).replace(".", ",")} €`;
      if (fautes.length) noter(`Prix ${p.lookup_key}`, "erreur", fautes.join(", "));
      else {
        trouves.add(p.lookup_key!);
        priceId ??= p.id;
        noter(`Prix ${p.lookup_key}`, "ok", montant);
      }
    }
    for (const k of LOOKUP_KEYS) if (!trouves.has(k) && !liste.data.some((p) => p.lookup_key === k)) noter(`Prix ${k}`, "erreur", "absent ou inactif");
  }

  let tauxTva: string | null = null;
  const taux = await appel("Taux de TVA (lecture)", () => stripe.taxRates.list({ active: true, inclusive: true, limit: 100 }));
  if (taux) {
    const conformes = tauxConformes(taux.data);
    tauxTva = conformes[0]?.id ?? null;
    // Sans taux conforme, dire ce qui existe : c'est un réglage du tableau de bord à corriger.
    const vus = taux.data.map((t) => `${t.display_name} ${t.percentage} % pays=${t.country ?? "—"} type=${t.tax_type ?? "—"}`).join(" ; ");
    noter(
      "TVA 20 % incluse, France",
      conformes.length ? "ok" : "erreur",
      conformes.length ? `${conformes.length} taux conforme(s)` : `aucun taux conforme (actif, inclus, 20 %, FR, type vat) : aucun abonnement ne se créerait. Taux actifs inclus : ${vus || "aucun"}`,
    );
  }

  const portail = await appel("Portail client (lecture de la configuration)", () => stripe.billingPortal.configurations.list({ is_default: true, limit: 1 }));
  const conf = portail?.data[0];
  if (portail) {
    if (!conf) noter("Portail client", "erreur", "aucune configuration par défaut");
    else {
      const f = conf.features;
      const fautes = [
        f.subscription_update?.enabled ? "changement de formule OUVERT au portail (doit passer par Rojer)" : null,
        !f.subscription_cancel?.enabled ? "résiliation fermée" : null,
        !f.payment_method_update?.enabled ? "changement de carte fermé" : null,
        !f.invoice_history?.enabled ? "historique des factures fermé" : null,
      ].filter(Boolean);
      noter("Portail client (réglages)", fautes.length ? "erreur" : "ok", fautes.length ? fautes.join(" ; ") : "carte, factures, résiliation ; formule fermée");
    }
  }
  return { priceId, tauxTva };
}

async function lectures(stripe: Stripe) {
  await appel("Clients (lecture)", () => stripe.customers.list({ limit: 1 }));
  await appel("Abonnements (lecture)", () => stripe.subscriptions.list({ limit: 1, status: "all" }));
  await appel("Pages de paiement (lecture)", () => stripe.checkout.sessions.list({ limit: 1 }));
  await appel("Factures (lecture)", () => stripe.invoices.list({ limit: 1 }));
  await sonde("Litiges (lecture)", () => stripe.disputes.retrieve("dp_verification_rojer"));
  await sonde("Paiements / remboursements (lecture)", () => stripe.charges.retrieve("ch_verification_rojer"));
  await sonde("Moyens de paiement (lecture)", () => stripe.paymentMethods.retrieve("pm_verification_rojer"));
  await sonde("Plannings d'abonnement (lecture)", () => stripe.subscriptionSchedules.retrieve("sub_sched_verification_rojer"));
}

async function gestesSansPaiement(stripe: Stripe) {
  // Ce que l'application écrit et qu'on ne peut pas jouer sans paiement.
  await sonde("Abonnements (écriture : changer, résilier)", () => stripe.subscriptions.update("sub_verification_rojer", { metadata: { verification: "rojer" } }));
  await sonde("Abonnements (écriture : annuler)", () => stripe.subscriptions.cancel("sub_verification_rojer"));
  await sonde("Plannings d'abonnement (écriture : baisse de formule)", () =>
    stripe.subscriptionSchedules.update("sub_sched_verification_rojer", { metadata: { verification: "rojer" } }),
  );
  await sonde("Factures (écriture : annuler, à la suppression d'un compte)", () => stripe.invoices.voidInvoice("in_verification_rojer"));
  await sonde("Factures (écriture : supprimer un brouillon)", () => stripe.invoices.del("in_verification_rojer"));
  await sonde("Factures (écriture : finaliser un brouillon)", () => stripe.invoices.finalizeInvoice("in_verification_rojer", { auto_advance: false }));
  await sonde("Plannings d'abonnement (écriture : créer)", () => stripe.subscriptionSchedules.create({ from_subscription: "sub_verification_rojer" }));
  await sonde("Plannings d'abonnement (écriture : libérer)", () => stripe.subscriptionSchedules.release("sub_sched_verification_rojer"));
  await sonde("Factures (aperçu d'un changement de formule)", () => stripe.invoices.createPreview({ subscription: "sub_verification_rojer" }));
}

async function surUnClientFictif(stripe: Stripe, priceId: string | null, tauxTva: string | null, conditions: boolean) {
  const client = await appel("Clients (écriture : créer)", () =>
    stripe.customers.create({
      name: "Vérification Rojer — à supprimer",
      description: "Créé et supprimé par scripts/verifier-stripe-prod.ts, sans paiement.",
      metadata: { verification: "rojer" },
    }),
  );
  if (!client) return;
  try {
    await appel("Clients (écriture : modifier)", () => stripe.customers.update(client.id, { metadata: { verification: "rojer", relu: "oui" } }));
    await appel("Clients (lecture d'un client)", () => stripe.customers.retrieve(client.id));
    await appel("Portail client (ouvrir une session)", () => stripe.billingPortal.sessions.create({ customer: client.id, return_url: `${URL_PROD}/compte/abonnement` }));
    if (!priceId || !tauxTva) {
      noter("Page de paiement (créer)", "erreur", "non essayée : prix ou TVA absents");
    } else {
      // Les paramètres de `ouvrirCheckout` (parcours.ts) : un refus ici serait le refus du premier client.
      const session = await appel("Page de paiement (créer, comme Rojer)", () =>
        stripe.checkout.sessions.create({
          mode: "subscription",
          customer: client.id,
          allowed_payment_method_types: ["card"],
          line_items: [{ price: priceId, quantity: 1 }],
          subscription_data: { metadata: { verification: "rojer" }, default_tax_rates: [tauxTva] },
          ...(conditions ? { consent_collection: { terms_of_service: "required" as const } } : {}),
          tax_id_collection: { enabled: true },
          customer_update: { name: "auto", address: "auto" },
          billing_address_collection: "required",
          success_url: `${URL_PROD}/compte/abonnement`,
          cancel_url: `${URL_PROD}/compte/abonnement`,
          expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        }),
      );
      if (session) await appel("Page de paiement (expirer, sans paiement)", () => stripe.checkout.sessions.expire(session.id));
    }
  } finally {
    const supprime = await appel("Clients (écriture : supprimer)", () => stripe.customers.del(client.id));
    if (!supprime) console.error(`\nLe client fictif ${client.id} n'a pas été supprimé : le supprimer dans le tableau de bord Stripe.`);
  }
}

async function main() {
  if (process.env.CC_APP_ID || process.env.INSTANCE_ID) refus("ce script se lance depuis un poste, pas sur une instance Clever Cloud.");
  const { cle, conditions } = configurationDeLaProd();
  // Sans `apiVersion` : celle du SDK installé, la même que `client.ts` (`satisfies Stripe.LatestApiVersion`).
  const stripe = new Stripe(cle, { maxNetworkRetries: 1, timeout: 15_000, appInfo: { name: "Rojer verification" } });

  const { priceId, tauxTva } = await catalogue(stripe);
  await lectures(stripe);
  await gestesSansPaiement(stripe);
  await surUnClientFictif(stripe, priceId, tauxTva, conditions);

  const marque = { ok: "OK      ", manque: "MANQUE  ", erreur: "ERREUR  " } as const;
  console.log(`Stripe, production (${URL_PROD}) — ${conditions ? "conditions exigées au paiement" : "conditions NON exigées au paiement"}\n`);
  for (const r of resultats) console.log(`${marque[r.etat]}${r.nom} — ${r.detail}`);
  const ko = resultats.filter((r) => r.etat !== "ok");
  console.log(ko.length ? `\n${ko.length} point(s) à corriger.` : "\nTout est en place (hors vrai prélèvement, que seul le premier client prouvera).");
  process.exit(ko.length ? 1 : 0);
}

main().catch(() => refus("échec inattendu (message de Stripe non recopié : il peut citer la clé)."));
