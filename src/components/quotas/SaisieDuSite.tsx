// La saisie d'un site, fermée dès l'ouverture de ses pages quand elle doit
// l'être (ADR-053 § 14, lot D) : l'arrêt des envois, et le bandeau du gel
// (lecture seule et abonnement ont déjà le leur).

import { saisieFermeeDuSite } from "@/lib/abonnements/saisie-annoncee";
import { FermerLaSaisie } from "./FermerLaSaisie";

export async function SaisieDuSite({ etablissementId }: { etablissementId: string }) {
  const fermee = await saisieFermeeDuSite(etablissementId);
  return (
    <FermerLaSaisie motif={fermee?.motif ?? null} annonce={fermee?.annonce} className="mx-[var(--board-gutter)] mt-4" />
  );
}
