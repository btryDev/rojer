// La saisie d'une page de site (ou du compte), fermée dès l'ouverture quand
// elle doit l'être (ADR-053 § 14, lot D) : l'arrêt des envois, et le bandeau
// quand aucun autre ne le dit (le gel). À rendre sous `<Suspense>`, dans une
// zone `data-zone-saisie`.

import { saisieFermeeDuSite } from "@/lib/abonnements/saisie-annoncee";
import { VerrouDeLaPage } from "./FermerLaSaisie";

export async function SaisieDuSite({ etablissementId }: { etablissementId?: string }) {
  const fermee = await saisieFermeeDuSite(etablissementId);
  return <VerrouDeLaPage motif={fermee?.motif ?? null} annonce={fermee?.annonce} className="mx-[var(--board-gutter)] mt-4" />;
}
