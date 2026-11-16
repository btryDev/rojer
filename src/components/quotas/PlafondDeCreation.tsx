// Un plafond atteint s'annonce dès l'ouverture d'un formulaire de création
// (ADR-053 § 14, lot D), au lieu d'un refus après la saisie : le bandeau dit
// ce qui le lève, et le formulaire ne part pas. La porte du serveur
// (`prendreQuota`) reste le filet. Rien tant que l'offre n'est pas lancée.

import { getOptionalCompte } from "@/lib/auth/compte";
import { refusQuota, type CleQuotaComptee } from "@/lib/abonnements/quotas";
import { stockagePlein } from "@/lib/abonnements/stockage";
import { FermerLaSaisie } from "./FermerLaSaisie";

/**
 * Le motif du plafond atteint, ou `null`. Lu par `PlafondDeCreation`, et par
 * la page qui annonce le plafond ailleurs qu'en tête (l'onboarding, dont
 * l'assistant occupe tout l'écran).
 */
export async function motifDuPlafond({
  cle,
  etStockage = false,
}: {
  cle?: CleQuotaComptee;
  etStockage?: boolean;
}): Promise<string | null> {
  const c = await getOptionalCompte();
  return c && c.compte.role !== "lecture"
    ? ((cle ? await refusQuota(c.db, c.compte.compteId, cle) : null) ??
        (etStockage ? await stockagePlein(c.db, c.compte.compteId) : null))
    : null;
}

export async function PlafondDeCreation({
  cle,
  etStockage = false,
  className,
  children,
}: {
  /** Le plafond de ce que la page crée ; absent : seulement le stockage. */
  cle?: CleQuotaComptee;
  /** La page dépose des fichiers : le stockage plein s'annonce aussi. */
  etStockage?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const motif = await motifDuPlafond({ cle, etStockage });
  return (
    <FermerLaSaisie motif={motif} className={className}>
      {children}
    </FermerLaSaisie>
  );
}
