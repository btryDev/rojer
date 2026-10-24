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

import {
  fondementDe,
  type ContexteFondement,
  type FondementLigne,
} from "@/lib/etats-permanents/fondement";
import { ancreEtatPermanent } from "@/lib/etats-permanents/ancre";
import { cheminDeDeclaration } from "@/lib/etats-permanents/par-l-equipe";
import { obligationParId } from "@/lib/referentiels/conformite";
import { modeDeclarationApplique } from "@/lib/etats-permanents/regle";
import { phrasesAConfirmer } from "@/lib/matching/marques";
import type { ObligationApplicable } from "@/lib/matching/types";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
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
  /**
   * Le nom de la ligne, quand il n'est pas celui de la catégorie. Absent, la
   * ligne prend `LABEL_CATEGORIE_EQUIPEMENT` : un seul endroit où le
   * défibrillateur s'appelle « Défibrillateur (DAE) ».
   */
  libelle?: string;
  cible: CibleDeclaration;
};

export const EQUIPEMENTS_DE_SECURITE: readonly EquipementDeSecurite[] = [
  {
    obligationId: "dae-erp-detention",
    cible: { kind: "categorie", categorie: "DEFIBRILLATEUR" },
  },
  {
    obligationId: "incendie-travail-extincteurs-dotation",
    cible: { kind: "categorie", categorie: "EXTINCTEUR" },
  },
  {
    obligationId: "incendie-travail-alarme-sonore",
    // Pas le libellé de la catégorie (« SSI et équipement d'alarme
    // incendie ») : R. 4227-34 exige un « système d'alarme sonore », et un
    // SSI n'en est qu'une forme possible.
    libelle: "Système d'alarme sonore",
    cible: { kind: "categorie", categorie: "ALARME_INCENDIE" },
  },
  {
    obligationId: "secours-etablissement-materiel",
    libelle: "Matériel de premiers secours",
    cible: { kind: "etat_permanent" },
  },
];

/** Le nom affiché d'une ligne — et le seul : le bouton le reprend. */
export function libelleEquipementSecurite(e: EquipementDeSecurite): string {
  if (e.libelle) return e.libelle;
  if (e.cible.kind === "categorie") return LABEL_CATEGORIE_EQUIPEMENT[e.cible.categorie];
  throw new Error(`${e.obligationId} : une ligne sans catégorie doit porter son libellé`);
}

/** Ce que la section sait d'un appareil du parc. */
export type AppareilDuParc = {
  id: string;
  libelle: string;
  categorie: CategorieEquipement;
};

export type LigneEquipementSecurite = {
  obligationId: string;
  libelle: string;
  /**
   * L'article qui fonde la ligne, et son texte — la même lecture que l'écran
   * « Ce qui doit être en place » (`fondementDe`), jamais une seconde.
   */
  fondement: FondementLigne | null;
  /**
   * Le moteur retient l'obligation « à confirmer » : une réponse manque pour
   * trancher (ADR-022, règle du non-renseigné), ou un seuil n'est franchi que
   * par l'effectif de l'entreprise (C37). La ligne ne dit alors pas
   * « obligatoire ici ».
   */
  aConfirmer: boolean;
  cible: CibleDeclaration;
  /** Les appareils déclarés de la catégorie ; vide si aucun, ou sans catégorie. */
  appareils: AppareilDuParc[];
  etat: "declare" | "pas_encore_declare" | "ailleurs";
};

/**
 * Les lignes de la section, dans l'ordre de la table, pour les seules
 * obligations APPLICABLES au dossier. Un bureau non-ERP ne voit pas le
 * défibrillateur ; un ERP de 3ᵉ catégorie le voit.
 */
export function lignesEquipementsSecurite(
  applicables: readonly ObligationApplicable[],
  parc: readonly AppareilDuParc[],
  /** Le type et la catégorie d'ERP, qui choisissent l'article à montrer. */
  contexte: ContexteFondement,
): LigneEquipementSecurite[] {
  const parId = new Map(applicables.map((a) => [a.obligation.id, a]));
  const lignes: LigneEquipementSecurite[] = [];
  for (const e of EQUIPEMENTS_DE_SECURITE) {
    const a = parId.get(e.obligationId);
    if (!a) continue;
    // « Déclarer sur Ce qui doit être en place » ne se promet que si l'écran
    // montre la ligne : la règle de cet écran le décide (`modeDeclarationApplique`),
    // pas cette table. Une obligation qui y gagnerait un rythme (prescription,
    // rythme retenu) quitterait l'écran pour le calendrier ; le lien serait
    // mort, et la ligne n'est alors pas posée ici (charte, interdit 19).
    if (e.cible.kind === "etat_permanent" && modeDeclarationApplique(a)?.mode !== "etat") {
      continue;
    }
    const cible = e.cible;
    const appareils =
      cible.kind === "categorie"
        ? parc.filter((p) => p.categorie === cible.categorie)
        : [];
    lignes.push({
      obligationId: e.obligationId,
      libelle: libelleEquipementSecurite(e),
      fondement: fondementDe(a.obligation, contexte),
      // La règle entière, pas sa moitié : une question restée sans réponse OU
      // un seuil compté sur l'effectif de l'entreprise (`phrasesAConfirmer`).
      aConfirmer: phrasesAConfirmer(a).length > 0,
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

/**
 * Où mène le geste d'une ligne qui n'est pas déclarée : le formulaire ouvert
 * sur la catégorie, ou la ligne de l'obligation sur « Ce qui doit être en
 * place » — l'ancre que la vignette pose (`ancreEtatPermanent`, E5). Une ligne « ailleurs » n'existe
 * que si cet écran la montre (`modeDeclarationApplique`, plus haut) : l'ancre
 * vise donc une ligne réellement rendue. `null` pour une ligne déclarée.
 */
export function hrefActionSecurite(
  l: Pick<LigneEquipementSecurite, "obligationId" | "cible" | "etat">,
  liens: { base: string; hrefNouveau: (categorie: CategorieEquipement) => string },
): string | null {
  if (l.etat === "declare") return null;
  if (l.cible.kind === "categorie") return liens.hrefNouveau(l.cible.categorie);
  // Une formation se déclare dans Équipe › Formations (`par-l-equipe.ts`,
  // ADR-047) : l'écran « en place » ne l'affiche pas.
  const o = obligationParId(l.obligationId);
  const ancre = ancreEtatPermanent(l.obligationId);
  return `${liens.base}${o ? cheminDeDeclaration(o, ancre) : `/etats-permanents#${ancre}`}`;
}
