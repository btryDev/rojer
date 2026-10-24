/**
 * Ce que le DUERP signale et qu'aucun salarié ne porte (décision de la
 * propriétaire du 2026-10-24, refonte de la fiche salarié).
 *
 * Une question du DUERP répond pour l'ÉTABLISSEMENT : « des travailleurs
 * conduisent-ils des engins ? ». Rojer ne sait pas lesquels (ADR-023), donc la
 * fiche d'une personne ne peut pas lui réclamer le titre. Mais si la réponse
 * est « oui » et que PERSONNE dans l'effectif ne le détient, le trou est
 * certain, quel que soit le conducteur : il se dit une fois, pour
 * l'établissement, sur Équipe › Formations. Le titre se déclare ensuite sur la
 * fiche de qui conduit, depuis « Ajouter un titre ».
 *
 * Trois sortes de titres sont laissées dehors :
 * - les pièces médicales (`pieceMedicale`) : une attestation d'absence de
 *   contre-indication conditionne la VALIDITÉ d'un autre titre (R. 4323-56
 *   pour l'autorisation de conduite, R. 4544-11-1 pour l'habilitation au
 *   voisinage), elle n'est pas due à l'établissement. Celle de l'habilitation
 *   ne vaut même que pour certaines habilitations, ce que Rojer ignore ;
 * - ceux qu'un AUTRE titre appelle avec un délai : la fiche de la personne
 *   qui détient le premier les date (`titresLusParLaFiche`, ADR-043) ;
 * - ceux dont une ligne d'établissement est le double (l'habilitation
 *   électrique, `titreDuDouble`) : la ligne est établie d'après les titres de
 *   toute l'équipe (`par-les-titres.ts`), et dit déjà « aucun titre ».
 *
 * Seul un « oui » déclenche l'alerte : un silence ou un « non » ne disent pas
 * que la tâche existe. Module pur.
 */
import {
  FAITS_ACTIVITE,
  intituleDuFait,
  type ChampFaitActivite,
  type ReponsesFaitsActivite,
} from "@/lib/etablissements/faits-activite";
import {
  obligationsConformite,
  type ObligationPorteeParSalarie,
} from "@/lib/referentiels/conformite";
import { titreDuDouble } from "@/lib/referentiels/conformite/transmissions";
import { titreParId } from "./catalogue";
import { titresLusParLaFiche } from "./du-a-la-personne";
import { OBLIGATION_EMPLOYEUR } from "./obligation-employeur";

export type FaitSansPorteur = {
  champ: ChampFaitActivite;
  /** La question, telle que l'écran des risques la pose. */
  question: string;
  titres: {
    obligation: ObligationPorteeParSalarie;
    /** À quelle condition le titre est dû — lue, jamais réécrite. */
    condition: string | null;
  }[];
};

/** Les titres qu'une autre surface suit déjà (voir l'en-tête). */
function suivisAilleurs(): ReadonlySet<string> {
  const doubles = obligationsConformite.flatMap((o) => {
    const t = titreDuDouble(o);
    return t ? [t] : [];
  });
  return new Set([...titresLusParLaFiche(), ...doubles]);
}

export function titresSansPorteur(
  faits: ReponsesFaitsActivite,
  /** Les titres déclarés par au moins un salarié PRÉSENT dans l'effectif. */
  detenus: ReadonlySet<string>,
): FaitSansPorteur[] {
  const ailleurs = suivisAilleurs();
  return FAITS_ACTIVITE.filter((f) => faits[f.champ] === true).flatMap((f) => {
    const titres = f.declencheTitres.flatMap((id) => {
      if (ailleurs.has(id) || detenus.has(id)) return [];
      const obligation = titreParId(id);
      return obligation && !obligation.pieceMedicale
        ? [{ obligation, condition: OBLIGATION_EMPLOYEUR[id]?.condition ?? null }]
        : [];
    });
    return titres.length > 0 ? [{ champ: f.champ, question: intituleDuFait(f), titres }] : [];
  });
}
