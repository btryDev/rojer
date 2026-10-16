/**
 * Un état permanent ÉTABLI D'APRÈS LES TITRES déclarés, au lieu d'une case
 * (audit établissement ↔ titre du 2026-10-16, décision de la propriétaire).
 *
 * Le défaut fermé : « Habilitation électrique du personnel » se cochait en
 * place sans lire les titres. Le dossier remis à un inspecteur pouvait donc
 * dire « Les N états applicables sont tous déclarés en place » et, deux pages
 * plus loin, lister l'habilitation du seul électricien, échéance dépassée, parmi les
 * vérifications en retard ; et un dossier sans aucun habilité, case cochée,
 * pouvait conclure « satisfaisante ».
 *
 * À QUI ÇA S'APPLIQUE : à la seule ligne dont une transmission porte
 * `memeObligation` — la même obligation vue par personne (`types.ts`). Une
 * transmission ordinaire ne suffit pas : « CSE en place » ne se déduit pas
 * d'une formation SST, ni le carnet de prescriptions d'une habilitation.
 *
 * CE QUE LA PHRASE NE DIT JAMAIS : « tout le personnel est habilité », ni
 * « à jour », ni « expiré ». Rojer ne sait pas qui intervient (ADR-023) ; il
 * dit combien de titres sont déclarés, et nomme ceux dont l'échéance est
 * dépassée.
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
  /** Au moins un titre déclaré dont l'échéance n'est pas dépassée. */
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
  // Les mots de la fiche salarié (`equipe/[salarieId]/page.tsx`,
  // `MOT_DE_L_ETAT`), jamais « expiré » ni « à jour » : le triennal de
  // l'habilitation vient de la NF C 18-510, pas du Code, et « expiré » se lit
  // comme un état de droit ; « à jour » serait une affirmation de conformité
  // (revue indépendante du 2026-10-16). « Déclarée » quand la date vient de
  // la pièce, « calculée » quand elle vient du rythme.
  const rythme = periodiciteEffective(titre);
  const depassees: string[] = [];
  for (const t of titres) {
    const echeance = echeanceDuTitre(t, rythme);
    // La règle du jour civil (ADR-011), celle de `classerTitre`, qu'on ne
    // peut importer ici : son module est `server-only`.
    if (echeance !== null && estEnRetard(echeance, now)) {
      const mot = t.echeanceLe !== null ? "déclarée" : "calculée";
      depassees.push(`${t.personne} : échéance ${mot} dépassée le ${formaterDateFr(echeance)}`);
    }
  }
  const compte = titres.length === 1 ? "1 titre" : `${titres.length} titres`;
  const suite =
    depassees.length === 0 ? ", aucune échéance dépassée" : ` ; ${depassees.join(" ; ")}`;
  return {
    enPlace: depassees.length < titres.length,
    phrase: `Établi d'après les titres déclarés : ${compte}${suite}.`,
  };
}
