// L'aide d'une catégorie d'équipement (`DESCRIPTION_CATEGORIE`) : ce que Rojer
// suit pour elle, et ce qu'il ne suit pas. Une seule mise en forme pour le
// formulaire, sous le choix de la catégorie, et pour la fiche de l'appareil,
// sous la catégorie (contrôle visuel E2, 2026-10-16). Sans aide, rien.

import { DESCRIPTION_CATEGORIE } from "@/lib/equipements/labels";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/** Le gabarit d'une phrase d'aide — celui du formulaire. */
export const CLASSE_AIDE =
  "m-0 mt-1.5 max-w-[66ch] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]";

export function AideCategorie({
  categorie,
  id,
}: {
  categorie: CategorieEquipement;
  id?: string;
}) {
  const aide = DESCRIPTION_CATEGORIE[categorie];
  if (!aide) return null;
  return (
    <p id={id} className={CLASSE_AIDE}>
      {aide}
    </p>
  );
}
