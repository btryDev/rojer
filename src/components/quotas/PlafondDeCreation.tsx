// Un plafond atteint s'annonce dès l'ouverture d'un formulaire de création
// (ADR-053 § 14, lot D), au lieu d'un refus après la saisie : le bandeau dit
// ce qui le lève, et le formulaire ne part pas. La porte du serveur
// (`prendreQuota`) reste le filet. Rien tant que l'offre n'est pas lancée.

import { getOptionalCompte } from "@/lib/auth/compte";
import { refusQuota, type CleQuotaComptee } from "@/lib/abonnements/quotas";
import { stockagePlein } from "@/lib/abonnements/stockage";
import { FermerLaSaisie } from "./FermerLaSaisie";

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
  const c = await getOptionalCompte();
  const motif =
    c && c.compte.role !== "lecture"
      ? ((cle ? await refusQuota(c.db, c.compte.compteId, cle) : null) ??
        (etStockage ? await stockagePlein(c.db, c.compte.compteId) : null))
      : null;
  return (
    <FermerLaSaisie motif={motif} className={className}>
      {children}
    </FermerLaSaisie>
  );
}
