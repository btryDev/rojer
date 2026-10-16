/**
 * Un état permanent ÉTABLI D'APRÈS LES TITRES déclarés, au lieu d'une case
 * (audit établissement ↔ titre du 2026-10-16, décision de la propriétaire).
 *
 * Le défaut fermé : « Habilitation électrique du personnel » se cochait en
 * place sans lire les titres. Le dossier remis à un inspecteur pouvait donc
 * dire « Les N états applicables sont tous déclarés en place » et, deux pages
 * plus loin, lister l'habilitation expirée du seul électricien parmi les
 * vérifications en retard ; et un dossier sans aucun habilité, case cochée,
 * pouvait conclure « satisfaisante ».
 *
 * À QUI ÇA S'APPLIQUE : à la seule ligne dont une transmission porte
 * `memeObligation` — la même obligation vue par personne (`types.ts`). Une
 * transmission ordinaire ne suffit pas : « CSE en place » ne se déduit pas
 * d'une formation SST, ni le carnet de prescriptions d'une habilitation.
 *
 * CE QUE LA PHRASE NE DIT JAMAIS : « tout le personnel est habilité ». Rojer ne
 * sait pas qui intervient (ADR-023) ; il dit combien de titres déclarés sont à
 * jour, et nomme ceux qui ne le sont plus.
 *
 * Pur : aucune horloge, aucune base. `queries.ts` charge et appelle.
 */
import { formaterDateFr } from "@/lib/dates";
import { estEnRetard } from "@/lib/dates/retard";
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import type { Obligation } from "@/lib/referentiels/conformite/types";
import { echeanceDuTitre } from "@/lib/salaries/echeance";

/** Le titre qui est la même obligation que `o`, vue par personne, ou `null`. */
export function titreDuDouble(o: Obligation): string | null {
  for (const t of o.transmet ?? []) {
    if (t.vers === "salarie_designe" && t.titre && t.memeObligation) return t.titre;
  }
  return null;
}

export type TitreDeclare = {
  /** « Prénom Nom », tel que la fiche Équipe l'affiche. */
  personne: string;
  delivreLe: Date;
  echeanceLe: Date | null;
};

export type EtatParLesTitres = {
  /** Au moins un titre déclaré à jour. */
  enPlace: boolean;
  phrase: string;
};

export function etatParLesTitres(
  titre: Pick<Obligation, "libelle" | "periodicite" | "rythmeRetenu">,
  titres: readonly TitreDeclare[],
  now: Date,
): EtatParLesTitres {
  if (titres.length === 0) {
    return {
      enPlace: false,
      phrase: `Établi d'après les titres déclarés : aucun titre « ${titre.libelle} » sur la fiche Équipe.`,
    };
  }
  const rythme = periodiciteEffective(titre);
  const expires: string[] = [];
  let aJour = 0;
  for (const t of titres) {
    const echeance = echeanceDuTitre(t, rythme);
    if (echeance !== null && estEnRetard(echeance, now)) {
      expires.push(`${t.personne} (le ${formaterDateFr(echeance)})`);
    } else {
      aJour += 1;
    }
  }
  const compte =
    aJour === 0
      ? "aucun titre à jour"
      : aJour === 1
        ? "1 titre à jour"
        : `${aJour} titres à jour`;
  const suite = expires.length > 0 ? ` ; expiré : ${expires.join(", ")}` : "";
  return {
    enPlace: aJour > 0,
    phrase: `Établi d'après les titres déclarés : ${compte}${suite}.`,
  };
}
