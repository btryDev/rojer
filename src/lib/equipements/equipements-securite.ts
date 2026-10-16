// La section « Équipements de sécurité » de la page Équipements.
//
// DÉCISION DE LA PROPRIÉTAIRE DU 2026-10-15. Un regroupement d'AFFICHAGE : le
// référentiel ne bouge pas. Certaines obligations portées par l'établissement
// n'exigent rien d'autre que la PRÉSENCE d'un matériel — un défibrillateur,
// des extincteurs, une alarme sonore, du matériel de premiers secours. Elles
// vivaient sur l'écran « Ce qui doit être en place », loin du parc où l'on
// déclare l'appareil. La section les pose à côté du parc et, pour chacune,
// dit si un appareil de la catégorie est DÉCLARÉ dans Rojer — jamais s'il est
// en place, ni s'il suffit (ADR-027 : une déclaration n'est pas une preuve).
//
// UNE TABLE EXPLICITE, PAS `equipementsEnContexte`. Ce champ est indicatif : il
// liste `EXTINCTEUR` sous le registre de sécurité ou la consigne incendie, qui
// ne sont pas des obligations de présence. Le lire ici aurait fait dire
// « extincteur déclaré » sous une obligation qu'un extincteur ne satisfait pas.
//
// CE QUI N'Y EST PAS, et pourquoi (plan du 2026-10-15) :
//  - le balisage des cheminements d'évacuation : c'est un balisage, pas la
//    présence d'un BAES ;
//  - l'alimentation de secours des signalisations : elle ne naît que d'un
//    appareil déclaré (`siEquipementDeclare`), donc n'est jamais « pas encore
//    déclarée » — et les signalisations sont hors de ce lot ;
//  - l'eau potable et les sanitaires : aucune catégorie d'équipement ;
//  - la présence d'une personne qualifiée (EL 18) : une personne, pas un
//    matériel ;
//  - le RIA, le désenfumage, les extincteurs et BAES en ERP : déjà portés par
//    l'appareil, ils sont dans le parc.
//
// Module pur : ni base, ni session. La page lui passe les obligations
// applicables du dossier (lecture bornée au compte) et le parc déclaré.

import type { ObligationApplicable } from "@/lib/matching/types";
import { LIBELLE_SOURCE } from "@/lib/referentiels/conformite/types";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";

/** Ce qui fait passer une ligne à « déclaré ». */
export type CibleDeclaration =
  | { kind: "categorie"; categorie: CategorieEquipement }
  /**
   * Aucune catégorie : le matériel se déclare sur l'écran « Ce qui doit être
   * en place ». C'est le matériel de premiers secours (R. 4224-14) — ni sa
   * composition ni un rythme ne sont réglementés, une catégorie ne
   * déclencherait rien et « Autre » porterait la pastille « hors référentiel »
   * (décision du 2026-10-15).
   */
  | { kind: "etat_permanent" };

export type EquipementDeSecurite = {
  obligationId: string;
  /** Le nom court de la ligne, celui du matériel. */
  libelle: string;
  cible: CibleDeclaration;
};

export const EQUIPEMENTS_DE_SECURITE: readonly EquipementDeSecurite[] = [
  {
    obligationId: "dae-erp-detention",
    libelle: "Défibrillateur (DAE)",
    cible: { kind: "categorie", categorie: "DEFIBRILLATEUR" },
  },
  {
    obligationId: "incendie-travail-extincteurs-dotation",
    libelle: "Extincteurs",
    cible: { kind: "categorie", categorie: "EXTINCTEUR" },
  },
  {
    obligationId: "incendie-travail-alarme-sonore",
    libelle: "Système d'alarme sonore",
    cible: { kind: "categorie", categorie: "ALARME_INCENDIE" },
  },
  {
    obligationId: "secours-etablissement-materiel",
    libelle: "Matériel de premiers secours",
    cible: { kind: "etat_permanent" },
  },
];

/** Ce que la section sait d'un appareil du parc. */
export type AppareilDuParc = {
  id: string;
  libelle: string;
  categorie: CategorieEquipement;
};

export type LigneEquipementSecurite = {
  obligationId: string;
  libelle: string;
  /** « art. R. 4227-29, Code du travail » — le premier article, celui qui fonde. */
  article: string;
  /** L'adresse de l'article sur Légifrance, si le référentiel la porte. */
  href: string | null;
  /**
   * Le moteur retient l'obligation « à confirmer » : une réponse manque pour
   * trancher (ADR-022, règle du non-renseigné). La ligne ne dit alors pas
   * « obligatoire ici ».
   */
  aConfirmer: boolean;
  cible: CibleDeclaration;
  /** Les appareils déclarés de la catégorie ; vide si aucun, ou sans catégorie. */
  appareils: AppareilDuParc[];
  etat: "declare" | "pas_encore_declare" | "ailleurs";
};

/** « art. R. 157-1, Code de la construction et de l'habitation ». */
function articleCite(o: ObligationApplicable["obligation"]): {
  article: string;
  href: string | null;
} {
  const r = o.referencesLegales[0];
  // La clé d'un article du CCH porte le code en préfixe (« CCH R. 157-1 ») ; le
  // libellé de la source le redit en toutes lettres.
  const nu = (r.article ?? r.reference).replace(/^CCH\s+/, "");
  return { article: `art. ${nu}, ${LIBELLE_SOURCE[r.source]}`, href: r.url ?? null };
}

/**
 * Les lignes de la section, dans l'ordre de la table, pour les seules
 * obligations APPLICABLES au dossier. Un bureau non-ERP ne voit pas le
 * défibrillateur ; un ERP de 3ᵉ catégorie le voit.
 */
export function lignesEquipementsSecurite(
  applicables: readonly ObligationApplicable[],
  parc: readonly AppareilDuParc[],
): LigneEquipementSecurite[] {
  const parId = new Map(applicables.map((a) => [a.obligation.id, a]));
  const lignes: LigneEquipementSecurite[] = [];
  for (const e of EQUIPEMENTS_DE_SECURITE) {
    const a = parId.get(e.obligationId);
    if (!a) continue;
    const cible = e.cible;
    const appareils =
      cible.kind === "categorie"
        ? parc.filter((p) => p.categorie === cible.categorie)
        : [];
    lignes.push({
      obligationId: e.obligationId,
      libelle: e.libelle,
      ...articleCite(a.obligation),
      aConfirmer: (a.sansReponse?.length ?? 0) > 0,
      cible,
      appareils,
      etat:
        cible.kind === "etat_permanent"
          ? "ailleurs"
          : appareils.length > 0
            ? "declare"
            : "pas_encore_declare",
    });
  }
  return lignes;
}
