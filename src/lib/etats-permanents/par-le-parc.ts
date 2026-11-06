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
 * (`par-les-titres.ts`). Deux exceptions, décidées le même jour : un
 * défibrillateur PARTAGÉ avec un voisin se déclare d'une case, sur la page
 * Équipements ; une ancienne case cochée reste en place, avec un rappel de
 * déclarer les appareils.
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

import { formaterDateFr } from "@/lib/dates";
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

/**
 * Le repère d'un défibrillateur PARTAGÉ (CCH R. 157-3, décision de la
 * propriétaire du 2026-11-06) : la détention est en place sans appareil au
 * parc — l'appareil est celui d'un voisin, qui en assure la maintenance.
 * Écrit dans la note de la déclaration, et lu par elle seule.
 */
export const NOTE_DAE_PARTAGE =
  "Défibrillateur partagé avec un établissement voisin (CCH, art. R. 157-3)";

/** La seule obligation de la table qui accepte encore une déclaration : le
 *  DAE partagé. Les autres ne se cochent plus (garde de l'action). */
export const DAE_DETENTION = "dae-erp-detention";

export function accepteUneDeclaration(o: Pick<Obligation, "id">): boolean {
  return o.id === DAE_DETENTION;
}

/** Une déclaration lue en base : son jour et son repère. */
export type DeclarationLue = { declareLe: Date; note: string | null };

/**
 * D'où vient l'état :
 *  - `appareils` : au moins un appareil de la catégorie déclaré au parc ;
 *  - `partage` : un défibrillateur partagé avec un voisin, déclaré ;
 *  - `ancienne_case` : une case cochée avant le 2026-11-06, sans appareil
 *    au parc — gardée en place, avec un rappel de déclarer les appareils
 *    (décision de la propriétaire : « garder + rappel ») ;
 *  - `aucun` : rien.
 */
export type SourceParLeParc = "appareils" | "partage" | "ancienne_case" | "aucun";

export type EtatParLeParc = {
  categorie: CategorieEquipement;
  /** Le nombre d'appareils de la catégorie déclarés au parc (en service). */
  declares: number;
  source: SourceParLeParc;
  /** Un appareil déclaré, un DAE partagé ou une ancienne case. */
  enPlace: boolean;
  /** Pour l'écran et pour ce qui sort du produit : aucun nom de personne. */
  phrase: string;
};

export function etatParLeParc(
  categorie: CategorieEquipement,
  declares: number,
  declaration: DeclarationLue | null = null,
): EtatParLeParc {
  const libelle = LABEL_CATEGORIE_EQUIPEMENT[categorie];
  if (declares > 0) {
    const phrase =
      declares === 1
        ? `D'après le parc déclaré : 1 appareil « ${libelle} ».`
        : `D'après le parc déclaré : ${declares} appareils « ${libelle} ».`;
    return { categorie, declares, source: "appareils", enPlace: true, phrase };
  }
  if (declaration !== null) {
    const le = formaterDateFr(declaration.declareLe);
    return declaration.note === NOTE_DAE_PARTAGE
      ? {
          categorie,
          declares,
          source: "partage",
          enPlace: true,
          phrase: `Défibrillateur partagé avec un établissement voisin, déclaré le ${le}.`,
        }
      : {
          categorie,
          declares,
          source: "ancienne_case",
          enPlace: true,
          phrase: `Déclaré en place le ${le}, sans appareil « ${libelle} » au parc.`,
        };
  }
  return {
    categorie,
    declares,
    source: "aucun",
    enPlace: false,
    phrase: `D'après le parc déclaré : aucun appareil « ${libelle} ».`,
  };
}
