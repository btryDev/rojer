// L'aide d'une catégorie d'équipement (`DESCRIPTION_CATEGORIE`) : ce que Rojer
// suit pour elle, et ce qu'il ne suit pas. Une seule mise en forme pour le
// formulaire, sous le choix de la catégorie, et pour la fiche de l'appareil,
// sous la catégorie (contrôle visuel E2, 2026-10-16). Sans aide, rien.

import { DESCRIPTION_CATEGORIE } from "@/lib/equipements/labels";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/** Le gabarit d'une aide de formulaire : partagé par la phrase d'aide d'un
 *  champ (`EquipementForm`) et par l'aide en plusieurs blocs au-dessus des
 *  questions exigées du levage. */
export const CLASSE_AIDE =
  "m-0 mt-1.5 max-w-[66ch] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]";

/** Le « corps explicatif » de la charte (`docs/charte-board.md`, barème) :
 *  l'aide posée sur la fiche, hors d'un champ de formulaire. */
const CLASSE_CORPS_EXPLICATIF =
  "m-0 mt-1.5 max-w-[62ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]";

export function AideCategorie({
  categorie,
  id,
  gabarit = "champ",
}: {
  categorie: CategorieEquipement;
  id?: string;
  /** `champ` sous le choix du formulaire, `fiche` sur la fiche de l'appareil. */
  gabarit?: "champ" | "fiche";
}) {
  const aide = DESCRIPTION_CATEGORIE[categorie];
  if (!aide) return null;
  return (
    <p id={id} className={gabarit === "fiche" ? CLASSE_CORPS_EXPLICATIF : CLASSE_AIDE}>
      {aide}
    </p>
  );
}
