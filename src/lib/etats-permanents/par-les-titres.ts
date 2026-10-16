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
import { periodiciteEffective } from "@/lib/referentiels/conformite/rythme-retenu";
import type { Obligation } from "@/lib/referentiels/conformite/types";
import { echeanceDuTitre } from "@/lib/salaries/echeance";
import { classerTitre } from "@/lib/salaries/etat-titre";

export type TitreDeclare = {
  /** « Prénom Nom », tel que la fiche Équipe l'affiche. */
  personne: string;
  delivreLe: Date;
  echeanceLe: Date | null;
};

export type EtatParLesTitres = {
  /** Au moins un titre déclaré dont l'échéance n'est pas dépassée. */
  enPlace: boolean;
  /** Pour l'écran et le widget, lus par l'employeur : nomme les personnes. */
  phrase: string;
  /**
   * Pour ce qui SORT du produit — dossier de conformité, export contrôle :
   * aucun nom (`docs/rgpd.md` § 6, « Ce qui sort du produit ne nomme donc plus
   * personne » ; revue du 2026-10-16). Les dates restent.
   */
  phraseSansNom: string;
};

export function etatParLesTitres(
  titre: Pick<Obligation, "libelle" | "periodicite" | "rythmeRetenu">,
  titres: readonly TitreDeclare[],
  now: Date,
): EtatParLesTitres {
  if (titres.length === 0) {
    const phrase = `Établi d'après les titres déclarés : aucun titre « ${titre.libelle} » sur la fiche Équipe.`;
    return { enPlace: false, phrase, phraseSansNom: phrase };
  }
  // Les mots de la fiche salarié (`equipe/[salarieId]/page.tsx`,
  // `MOT_DE_L_ETAT`), jamais « expiré » ni « à jour » : le triennal de
  // l'habilitation vient de la NF C 18-510, pas du Code, et « expiré » se lit
  // comme un état de droit ; « à jour » serait une affirmation de conformité
  // (revue indépendante du 2026-10-16). « Déclarée » quand la date vient de
  // la pièce, « calculée » quand elle vient du rythme.
  const rythme = periodiciteEffective(titre);
  const depassees: string[] = [];
  const depasseesSansNom: string[] = [];
  for (const t of titres) {
    // La règle d'un titre dépassé : `classerTitre`, la même que la fiche
    // Équipe et le badge (jour civil, ADR-011).
    const echeance = echeanceDuTitre(t, rythme);
    if (echeance !== null && classerTitre(t, rythme, now) === "enRetard") {
      const mot = t.echeanceLe !== null ? "déclarée" : "calculée";
      const quoi = `échéance ${mot} dépassée le ${formaterDateFr(echeance)}`;
      depassees.push(`${t.personne} : ${quoi}`);
      depasseesSansNom.push(quoi);
    }
  }
  const compte = titres.length === 1 ? "1 titre" : `${titres.length} titres`;
  const suite = (liste: string[]) =>
    liste.length === 0 ? ", aucune échéance dépassée" : ` ; ${liste.join(" ; ")}`;
  return {
    enPlace: depassees.length < titres.length,
    phrase: `Établi d'après les titres déclarés : ${compte}${suite(depassees)}.`,
    phraseSansNom: `Établi d'après les titres déclarés : ${compte}${suite(depasseesSansNom)}.`,
  };
}
