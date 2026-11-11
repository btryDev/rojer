import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { validerEtape } from "@/lib/duerps/actions";
import type { EtapeValidable } from "@/lib/duerps/etapes-validees";

/** La page où mène chaque étape une fois validée. */
const SUITE: Record<EtapeValidable, string> = {
  activite: "unites",
  unites: "risques",
  risques: "transverses",
  transverses: "synthese",
};

/**
 * Le bouton qui valide une étape du DUERP et mène à la suivante
 * (2026-11-11, « si pas validé, pas fait »). Un formulaire et non un lien :
 * passer à l'étape suivante, c'est la valider.
 *
 * Qui ne peut pas écrire — membre en lecture seule (ADR-054), saisie fermée
 * (ADR-053) — ne voit pas le formulaire mais un simple lien vers la suite :
 * il avance sans rien valider (`data-chemin-lecture`, `globals.css`).
 */
export function ValiderEtapeBouton({
  duerpId,
  etape,
  libelle = "Valider et continuer →",
  disabled = false,
}: {
  duerpId: string;
  etape: EtapeValidable;
  libelle?: string;
  disabled?: boolean;
}) {
  const classe = buttonVariants({ variant: "board", size: "board" });
  return (
    <>
      <form data-ecriture-ou-saisie action={validerEtape.bind(null, duerpId, etape)}>
        <button type="submit" disabled={disabled} className={classe}>
          {libelle}
        </button>
      </form>
      {!disabled && (
        <Link
          data-chemin-lecture
          href={`/duerp/${duerpId}/${SUITE[etape]}`}
          className={classe}
        >
          Étape suivante →
        </Link>
      )}
    </>
  );
}
