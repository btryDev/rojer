/**
 * Un état permanent ÉTABLI D'APRÈS LE PARC déclaré, au lieu d'une case
 * (ADR-057 § 4, décision de la propriétaire du 2026-11-06 : « d'après le
 * parc »).
 *
 * Trois obligations n'exigent que la PRÉSENCE d'un matériel : le
 * défibrillateur (CCH R. 157-2), les extincteurs (R. 4227-29), le système
 * d'alarme sonore (R. 4227-34). Elles se cochaient sur « Ce qui doit être en
 * place » pendant que l'appareil se déclarait au parc : deux endroits pour un
 * fait. Elles s'affichent désormais en tête de leur groupe sur la page
 * Équipements, et sont EN PLACE dès qu'un appareil de la catégorie y est
 * déclaré — comme une formation l'est d'après les titres déclarés dans Équipe
 * (`par-les-titres.ts`).
 *
 * CE QUE ÇA NE DIT JAMAIS : que le matériel est installé, suffisant ou
 * entretenu. « Déclaré dans Rojer » est un fait de saisie (ADR-027) — le même
 * que la case d'avant, porté par un autre geste.
 *
 * Le matériel de premiers secours (R. 4224-14) n'est pas ici : il n'a pas de
 * catégorie d'appareil, il reste une case de « Ce qui doit être en place ».
 *
 * Pur : aucune horloge, aucune base. `queries.ts` compte et appelle.
 */

import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import type { Obligation } from "@/lib/referentiels/conformite/types";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/**
 * Les obligations de présence établies d'après le parc, et la catégorie dont
 * un appareil déclaré les met en place. LA table : la page Équipements la lit
 * aussi (`equipements-securite.ts`).
 */
export const PRESENCE_PAR_LE_PARC: Readonly<Record<string, CategorieEquipement>> = {
  "dae-erp-detention": "DEFIBRILLATEUR",
  "incendie-travail-extincteurs-dotation": "EXTINCTEUR",
  "incendie-travail-alarme-sonore": "ALARME_INCENDIE",
};

/**
 * LE prédicat : cette ligne est-elle établie d'après le parc, et par quelle
 * catégorie ? Une ligne en mode « état » de la table. Lu par la lecture
 * (`queries.ts`) ET par la garde de l'action (`garde.ts`), comme
 * `etabliParLesTitres`.
 */
export function etabliParLeParc(
  o: Pick<Obligation, "id">,
  mode: "etat" | "fait",
): CategorieEquipement | null {
  if (mode !== "etat") return null;
  return PRESENCE_PAR_LE_PARC[o.id] ?? null;
}

export type EtatParLeParc = {
  categorie: CategorieEquipement;
  /** Le nombre d'appareils de la catégorie déclarés au parc (en service). */
  declares: number;
  /** Au moins un appareil déclaré. */
  enPlace: boolean;
  /** Pour l'écran et pour ce qui sort du produit : aucun nom de personne. */
  phrase: string;
};

export function etatParLeParc(
  categorie: CategorieEquipement,
  declares: number,
): EtatParLeParc {
  const libelle = LABEL_CATEGORIE_EQUIPEMENT[categorie];
  const phrase =
    declares === 0
      ? `D'après le parc déclaré : aucun appareil « ${libelle} ».`
      : declares === 1
        ? `D'après le parc déclaré : 1 appareil « ${libelle} ».`
        : `D'après le parc déclaré : ${declares} appareils « ${libelle} ».`;
  return { categorie, declares, enPlace: declares > 0, phrase };
}
