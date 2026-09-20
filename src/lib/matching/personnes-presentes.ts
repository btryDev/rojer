/**
 * LE SEUIL DE PERSONNES DE R. 4227-34 CT, HORS DU MOTEUR (2026-09-21).
 *
 * Ce bloc vivait dans `engine.ts`. Il en sort, inchangé, pour une seule
 * raison : `engine.ts` importe le référentiel entier et ne peut pas être
 * chargé par un écran, or le parcours de création doit poser la question du
 * nombre EXACTEMENT là où le moteur ne sait pas conclure — ni plus (la poser à
 * un ERP de 3ᵉ catégorie serait du bruit), ni moins. Deux copies de la règle
 * divergeraient au premier lot ; `nombreDePersonnesADemander`, en bas, appelle
 * donc `evaluerPersonnesPresentes` elle-même.
 *
 * Aucune dépendance au référentiel, à Prisma ni à la session : ce module se
 * charge des deux côtés.
 */
import type { CategorieErp } from "@/lib/referentiels/types-communs";

/** Ce que la règle lit d'un établissement — et rien d'autre. */
export type EtablissementPourLeSeuil = {
  estERP: boolean;
  categorieErp: CategorieErp | null;
  effectifSurSite: number;
  personnesPresentesHabituellement: number | null;
};

/**
 * « Plus de cinquante personnes » (R. 4227-34) : le seuil est franchi à 51.
 * Les deux obligations qui s'y appuient écrivent `personnesPresentesMin: 51` ;
 * `personnes-presentes.test.ts` tient l'égalité des deux.
 */
export const SEUIL_PERSONNES_R422734 = 51;

/**
 * Personnes habituellement présentes — R. 4227-34 CT, « occupées ou réunies ».
 *
 * LE NOMBRE COMPTE LES SALARIÉS **ET** LE PUBLIC, et c'est tout le sujet. Le
 * produit ne l'a plus demandé à la création entre le 2026-09-01 et le
 * 2026-09-21, et ne le demande depuis qu'à ceux que cette règle laisse
 * indéterminés ; pour les autres — et pour les dossiers anciens restés muets —
 * il en déduit ce qu'il peut, et ce qu'il peut n'est jamais qu'une **borne
 * basse** du total.
 *
 * UNE BORNE BASSE NE CONCLUT QUE DANS UN SENS. Elle établit « au-dessus du
 * seuil » et n'établit jamais « en dessous ». C'est le précédent de forme
 * d'`opposabiliteUrssaf` (`prestataires/vigilance.ts`), dont le commentaire dit
 * la même chose de `updatedAt` : la déduction ne vaut que dans ce sens, et
 * c'est le seul qu'on utilise.
 *
 * TROIS ÉTATS, PAS DEUX. `atteint` (le seuil est franchi, on sait pourquoi),
 * `non_atteint` (le total est connu et il est inférieur), `indetermine` (on ne
 * sait pas, et l'obligation est retenue « à confirmer » — le mécanisme
 * d'`evaluerHabitation` et d'`evaluerLocauxSommeil`, pas un second).
 *
 * CE QUI SÉPARE `non_atteint` D'`indetermine` EST LE RÉGIME. Un établissement
 * de travail seul ne reçoit pas de public : son effectif salarié EST le total,
 * la comparaison est exacte, et l'obligation tombe pour de bon. Un ERP en
 * reçoit par définition : rien n'autorise à traiter ses huit salariés comme le
 * nombre de personnes réunies chez lui, et le silence ne peut pas y valoir
 * « non ».
 */
export type EvalPersonnesPresentes =
  | { etat: "atteint"; raison: string }
  | { etat: "indetermine"; raison: string }
  | { etat: "non_atteint" };

/**
 * Le public que la catégorie d'ERP garantit **au moins** (ADR-004, seuils du
 * règlement de sécurité). Seules les trois premières catégories bornent par le
 * bas : la 4ᵉ va du seuil du type jusqu'à 300 et la 5ᵉ est sous le seuil du
 * type — ni l'une ni l'autre ne garantit quoi que ce soit, et les omettre est
 * la façon d'écrire qu'elles ne déduisent rien.
 *
 * Le nombre est le premier de la fourchette, pas sa borne haute : la 3ᵉ
 * catégorie commence à 301, pas à 700.
 */
const PLANCHER_PUBLIC_PAR_CATEGORIE: Partial<Record<CategorieErp, number>> = {
  N1: 1501,
  N2: 701,
  N3: 301,
};

const LIBELLE_CATEGORIE_ERP: Record<CategorieErp, string> = {
  N1: "1ʳᵉ catégorie",
  N2: "2ᵉ catégorie",
  N3: "3ᵉ catégorie",
  N4: "4ᵉ catégorie",
  N5: "5ᵉ catégorie",
};

export function evaluerPersonnesPresentes(
  seuil: number,
  etab: EtablissementPourLeSeuil,
): EvalPersonnesPresentes {
  // Le chiffre déclaré tranche seul, dans les deux sens : il n'y a plus de
  // borne, il y a le total.
  const declare = etab.personnesPresentesHabituellement;
  if (declare !== null && declare !== undefined) {
    return declare >= seuil
      ? {
          etat: "atteint",
          raison: `${declare} personnes habituellement présentes (seuil ${seuil})`,
        }
      : { etat: "non_atteint" };
  }

  // Première borne : la catégorie d'ERP. Le public seul suffit à franchir le
  // seuil dès la 3ᵉ, et le dirigeant l'a déclarée — rien à demander de plus.
  const categorie = etab.estERP ? etab.categorieErp : null;
  if (categorie) {
    const plancherPublic = PLANCHER_PUBLIC_PAR_CATEGORIE[categorie];
    if (plancherPublic !== undefined && plancherPublic >= seuil) {
      return {
        etat: "atteint",
        raison: `ERP de ${LIBELLE_CATEGORIE_ERP[categorie]} : le public admis y atteint au moins ${plancherPublic} personnes, seuil de ${seuil} franchi par le public seul`,
      };
    }
  }

  // Seconde borne : l'effectif salarié, compté par le texte au même titre.
  if (etab.effectifSurSite >= seuil) {
    return {
      etat: "atteint",
      raison: `${etab.effectifSurSite} salariés sur site, seuil de ${seuil} personnes présentes franchi par l'effectif seul`,
    };
  }

  // Sous les deux bornes. Pour un ERP, cela ne dit rien du total : il reçoit du
  // public, et le nombre n'est pas déclaré.
  if (etab.estERP) {
    return {
      etat: "indetermine",
      raison: `nombre de personnes habituellement présentes non renseigné, et l'établissement reçoit du public — obligation retenue par prudence, à confirmer (seuil ${seuil})`,
    };
  }

  // Établissement de travail seul : pas de public, l'effectif est le total.
  return { etat: "non_atteint" };
}

/**
 * Faut-il DEMANDER le nombre à ce dirigeant ?
 *
 * Oui quand, sans lui, le moteur ne saurait pas conclure — c'est-à-dire quand
 * `evaluerPersonnesPresentes` rendrait `indetermine` sur un nombre absent : un
 * ERP que ni sa catégorie ni son effectif ne portent au-dessus du seuil. Pour
 * tous les autres la question ne changerait rien, et on ne la pose pas.
 *
 * Un effectif illisible (champ encore vide à l'écran) ne pose pas la question :
 * on ne demande rien sur la foi d'une valeur qu'on n'a pas.
 */
export function nombreDePersonnesADemander(etab: {
  estERP: boolean;
  categorieErp: CategorieErp | null | undefined;
  effectifSurSite: number | null | undefined;
}): boolean {
  if (!etab.estERP || !etab.categorieErp) return false;
  if (etab.effectifSurSite == null || !Number.isFinite(etab.effectifSurSite)) {
    return false;
  }
  return (
    evaluerPersonnesPresentes(SEUIL_PERSONNES_R422734, {
      estERP: true,
      categorieErp: etab.categorieErp,
      effectifSurSite: etab.effectifSurSite,
      personnesPresentesHabituellement: null,
    }).etat === "indetermine"
  );
}
