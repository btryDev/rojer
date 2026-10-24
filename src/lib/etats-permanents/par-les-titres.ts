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
import { titreParId } from "@/lib/salaries/catalogue";
import { titreDuDouble } from "@/lib/referentiels/conformite/transmissions";

/**
 * LE prédicat : cette ligne est-elle établie d'après les titres, et d'après
 * lequel ? Une ligne en mode « état » dont un titre est la même obligation
 * (`titreDuDouble`), titre présent au catalogue. Lu par la lecture
 * (`queries.ts`) ET par la garde de l'action (`actions.ts`) : deux prédicats
 * voisins avaient été écrits, qui pouvaient diverger (revue du 2026-10-16).
 */
export function etabliParLesTitres(
  o: Obligation,
  mode: "etat" | "fait",
): Obligation | null {
  if (mode !== "etat") return null;
  const id = titreDuDouble(o);
  return id ? (titreParId(id) ?? null) : null;
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
    // [2026-10-24 : ~~« Établi d'après les titres déclarés »~~ — « titre » et
    // « établi » sont des mots de l'outil.]
    const phrase = `D'après votre équipe : personne n'a « ${titre.libelle} » déclaré sur sa fiche Équipe.`;
    // Le dossier sort du produit et se lit par un tiers : pas de « votre ».
    const phraseSansNom = `D'après les titres déclarés par l'employeur : aucune personne n'a « ${titre.libelle} » de déclaré.`;
    return { enPlace: false, phrase, phraseSansNom };
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
  // Déclaré POUR la personne, par l'employeur (revue de justesse).
  const compte =
    titres.length === 1 ? "déclaré pour 1 personne" : `déclaré pour ${titres.length} personnes`;
  const suite = (liste: string[]) =>
    liste.length === 0 ? ", aucune échéance dépassée" : ` ; ${liste.join(" ; ")}`;
  return {
    enPlace: depassees.length < titres.length,
    phrase: `D'après votre équipe : ${compte}${suite(depassees)}.`,
    phraseSansNom: `D'après les titres déclarés par l'employeur : ${compte}${suite(depasseesSansNom)}.`,
  };
}
