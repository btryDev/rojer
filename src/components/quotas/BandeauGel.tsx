// Un prestataire gelé (ADR-053 § 14) le dit dès l'ouverture de sa page, et
// ce qu'enveloppe ce composant ne s'envoie plus (`FermerLaSaisie`, lot D). Le
// site gelé a le sien dans la mise en page (`SaisieDuSite`). Rien tant que
// l'offre n'est pas lancée.

import { getOptionalCompte } from "@/lib/auth/compte";
import { motifDuGel } from "@/lib/abonnements/quotas";
import { FermerLaSaisie } from "./FermerLaSaisie";

export async function GelDuPrestataire({
  prestataireId,
  className,
  children,
}: {
  prestataireId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const compte = await getOptionalCompte();
  const motif =
    compte && compte.compte.role !== "lecture" ? await motifDuGel(compte.db, compte.compte.compteId, { prestataireId }) : null;
  return (
    <FermerLaSaisie motif={motif} className={className}>
      {children}
    </FermerLaSaisie>
  );
}
