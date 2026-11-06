// Un plafond atteint s'annonce dès l'ouverture d'un formulaire de création
// (ADR-053 § 14, lot D), au lieu d'un refus après la saisie : le bandeau dit
// ce qui le lève, et le formulaire ne part pas. La porte du serveur
// (`prendreQuota`) reste le filet. Rien tant que l'offre n'est pas lancée.

import { getOptionalCompte } from "@/lib/auth/compte";
import { refusQuota, type CleQuotaComptee } from "@/lib/abonnements/quotas";
import { FermerLaSaisie } from "./FermerLaSaisie";

export async function PlafondDeCreation({
  cle,
  className,
  children,
}: {
  cle: CleQuotaComptee;
  className?: string;
  children: React.ReactNode;
}) {
  const c = await getOptionalCompte();
  const motif = c && c.compte.role !== "lecture" ? await refusQuota(c.db, c.compte.compteId, cle) : null;
  return (
    <FermerLaSaisie motif={motif} className={className}>
      {children}
    </FermerLaSaisie>
  );
}
