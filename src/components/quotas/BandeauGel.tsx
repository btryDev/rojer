// Un prestataire gelé (ADR-053 § 14) le dit dès l'ouverture de sa page, et
// ses formulaires ne partent plus (`FermerLaSaisie`, lot D). Le site gelé a
// le sien dans la mise en page (`SaisieDuSite`). Rien tant que l'offre n'est
// pas lancée. À rendre sous `<Suspense fallback={null}>`.

import { getOptionalCompte } from "@/lib/auth/compte";
import { motifDuGel } from "@/lib/abonnements/quotas";
import { FermerLaSaisie } from "./FermerLaSaisie";

export async function BandeauGel({ prestataireId, className = "" }: { prestataireId: string; className?: string }) {
  const compte = await getOptionalCompte();
  if (!compte || compte.compte.role === "lecture") return null;
  const motif = await motifDuGel(compte.db, compte.compte.compteId, { prestataireId });
  return <FermerLaSaisie motif={motif} annonce className={className} />;
}
