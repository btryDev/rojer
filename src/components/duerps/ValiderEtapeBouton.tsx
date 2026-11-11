import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { saisieFermeeDuSite } from "@/lib/abonnements/saisie-annoncee";
import { validerEtape } from "@/lib/duerps/actions";
import { etapeSuivante, type EtapeValidable } from "@/lib/duerps/etapes-validees";

/**
 * Le bouton qui valide une étape du DUERP et mène à la suivante (ADR-059,
 * « si pas validé, pas fait »). Un formulaire et non un lien : passer à
 * l'étape suivante, c'est la valider.
 *
 * Qui ne peut pas écrire — membre en lecture seule (ADR-054), saisie fermée
 * ou site gelé (ADR-053) — reçoit un simple lien vers la suite : il avance
 * sans rien valider. `saisieFermeeDuSite` est la lecture commune (mise en
 * cache pour le rendu, déjà lue par la mise en page du site).
 */
export async function ValiderEtapeBouton({
  duerpId,
  etablissementId,
  etape,
  libelle = "Valider et continuer →",
  disabled = false,
}: {
  duerpId: string;
  etablissementId: string;
  etape: EtapeValidable;
  libelle?: string;
  disabled?: boolean;
}) {
  const classe = buttonVariants({ variant: "board", size: "board" });
  if (await saisieFermeeDuSite(etablissementId)) {
    return disabled ? null : (
      <Link href={`/duerp/${duerpId}/${etapeSuivante(etape)}`} className={classe}>
        Étape suivante →
      </Link>
    );
  }
  return (
    <form action={validerEtape.bind(null, duerpId, etape)}>
      <button type="submit" disabled={disabled} className={classe}>
        {libelle}
      </button>
    </form>
  );
}
