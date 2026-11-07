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
 * Équipements (la table le porte, `declarationAdmise`) ; une ancienne case
 * cochée reste en place, avec un rappel de déclarer les appareils.
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
import { pluriel } from "@/lib/rendu/pluriel";
import { phraseDeclaration } from "./phrases";
import type { Obligation } from "@/lib/referentiels/conformite/types";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/** Une obligation de présence établie d'après le parc. */
export type PresenceParLeParc = {
  /** La catégorie dont un appareil déclaré la met en place. */
  categorie: CategorieEquipement;
  /**
   * La seule déclaration qu'elle admet encore, quand elle en admet une : le
   * défibrillateur partagé avec un voisin (CCH R. 157-3, décision de la
   * propriétaire du 2026-11-06). Absent = aucune déclaration nouvelle.
   */
  declarationAdmise?: "partage";
};

/**
 * Les obligations de présence établies d'après le parc. LA table : la page
 * Équipements la lit (`equipements-securite.ts`), la garde de l'action aussi.
 */
export const PRESENCE_PAR_LE_PARC: Readonly<Record<string, PresenceParLeParc>> = {
  "dae-erp-detention": { categorie: "DEFIBRILLATEUR", declarationAdmise: "partage" },
  "incendie-travail-extincteurs-dotation": { categorie: "EXTINCTEUR" },
  "incendie-travail-alarme-sonore": { categorie: "ALARME_INCENDIE" },
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
  return PRESENCE_PAR_LE_PARC[o.id]?.categorie ?? null;
}

/**
 * Le repère d'un défibrillateur PARTAGÉ, écrit par l'action
 * (`basculerDaePartage`) dans la note de la déclaration, et lu par elle seule.
 * C'est aussi le libellé de la case.
 */
export const NOTE_DAE_PARTAGE =
  "Défibrillateur partagé avec un établissement voisin (CCH, art. R. 157-3)";

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

export function sourceParLeParc(
  declares: number,
  declaration: DeclarationLue | null,
): SourceParLeParc {
  if (declares > 0) return "appareils";
  if (declaration === null) return "aucun";
  return declaration.note === NOTE_DAE_PARTAGE ? "partage" : "ancienne_case";
}

export type EtatParLeParc = {
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
  const source = sourceParLeParc(declares, declaration);
  const le = declaration ? formaterDateFr(declaration.declareLe) : "";
  const phrase =
    source === "appareils"
      ? `D'après le parc déclaré : ${pluriel(declares, "appareil")} « ${libelle} ».`
      : source === "partage"
        ? `Défibrillateur partagé avec un établissement voisin, déclaré le ${le}.`
        : source === "ancienne_case"
          ? `${phraseDeclaration("etat", le)}, sans appareil « ${libelle} » au parc.`
          : `D'après le parc déclaré : aucun appareil « ${libelle} ».`;
  return { source, enPlace: source !== "aucun", phrase };
}

/**
 * L'état de chaque obligation de présence, depuis le parc et les
 * déclarations du dossier. LE rassemblement — la lecture de « Ce qui doit
 * être en place » et la page Équipements l'appellent toutes deux, sur le même
 * parc en service : une seule jointure, deux écrans qui disent la même chose.
 */
export function etatsParLeParc(
  appareils: readonly { categorie: CategorieEquipement }[],
  declarations: ReadonlyMap<string, DeclarationLue>,
): Map<string, EtatParLeParc> {
  const parCategorie = new Map<CategorieEquipement, number>();
  for (const a of appareils) parCategorie.set(a.categorie, (parCategorie.get(a.categorie) ?? 0) + 1);
  return new Map(
    Object.entries(PRESENCE_PAR_LE_PARC).map(([id, { categorie }]) => [
      id,
      etatParLeParc(categorie, parCategorie.get(categorie) ?? 0, declarations.get(id) ?? null),
    ]),
  );
}
