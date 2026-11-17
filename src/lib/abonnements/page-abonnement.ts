import "server-only";
// Ce que les quatre sous-pages de l'abonnement lisent toutes (2026-11-17) :
// le compte de la page, la ligne d'abonnement, les droits et le geste
// proposé. Une seule lecture par rendu (`cache`).

import { cache } from "react";

import { compteDeLaPage, getOptionalCompte } from "@/lib/auth/compte";
import { requireUser } from "@/lib/auth/require-user";
import { droitsDe, gesteAbonnement, phaseDuCompte, resiliationPrevue } from "./droits";
import { formuleDeLookupKey } from "./formules";
import { abonnementDuCompte, contexteDroits, offreLancee } from "./saisie";
import { vueAbonnement, type EntreeVue } from "./vue-abonnement";

/**
 * Sans compte encore (rien créé), les pages se lisent quand même : aucun
 * abonnement (ADR-054) — `requireCompte` renverrait à l'onboarding.
 *
 * La vue d'ensemble relit l'abonnement chez Stripe au retour d'un paiement
 * AVANT d'appeler cette fonction : la ligne lue ici est alors la nouvelle.
 */
export const etatDeLAbonnement = cache(async () => {
  await requireUser();
  const [c, { compteId }] = await Promise.all([getOptionalCompte(), compteDeLaPage()]);
  const ctx = contexteDroits();
  const ouvert = offreLancee(ctx);
  // Une seule lecture : la ligne sert à l'état affiché et aux droits.
  const ligne = c ? await abonnementDuCompte(c.db, c.compte.compteId) : null;
  const phase = phaseDuCompte(ligne, ctx.maintenant);
  const finPrevue = ligne ? resiliationPrevue(ligne) : false;
  // Sans compte encore, `role` est nul : l'essai reste proposé.
  const geste = gesteAbonnement({ ouvert, role: c?.compte.role ?? null, ligne });
  const entree: EntreeVue = {
    geste,
    statut: ligne?.statut ?? null,
    finPrevue,
    documentAttend: false,
    paiementTermine: false,
  };
  return {
    c,
    /** Le compte que montre la page : ses gestes le postent (`ChampCompteAttendu`). */
    compteId,
    ctx,
    ligne,
    droits: droitsDe(ligne, ctx),
    formule: formuleDeLookupKey(ligne?.formule),
    phase,
    /** La variante de la page, décidée une fois (`vueAbonnement`). */
    vue: vueAbonnement(entree),
    /** La même, pour la vue d'ensemble : elle seule lit `?document=1` et le retour de paiement. */
    vueAvec: (o: Pick<EntreeVue, "documentAttend" | "paiementTermine">) => vueAbonnement({ ...entree, ...o }),
  };
});

export type EtatDeLAbonnement = Awaited<ReturnType<typeof etatDeLAbonnement>>;
