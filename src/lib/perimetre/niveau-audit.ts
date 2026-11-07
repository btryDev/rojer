// Les obligations au NIVEAU AUDIT qui peuvent concerner ce dossier (ADR-042).
//
// DÉCISION DE LA PROPRIÉTAIRE DU 2026-10-08, sur une remarque du préventeur :
// certaines obligations légales — les chiffons imprégnés en tête — sortent du
// quotidien de Rojer. Elles restent au référentiel, avec leur source, et le
// moteur ne les sert plus. La condition posée et acceptée : l'outil ne ment
// pas. Une obligation légale que Rojer ne suit plus au quotidien se NOMME, au
// dossier qu'elle peut concerner — c'est ce module.
//
// PAR ÉTABLISSEMENT, ET NON TOUTES À TOUS. Le calcul est celui du moteur, sans
// la porte du niveau (`determineObligationsNiveauAudit`) : même typologie,
// mêmes équipements déclencheurs, même règle du non-renseigné. Il ne coûte
// rien de plus qu'un appel au moteur, et il épargne au bureau sans masque
// respiratoire la vérification des masques. Le silence d'une réponse ne
// retire rien : une question sans réponse garde la ligne (« peut concerner »).
//
// Les obligations portées par un SALARIÉ font exception : le moteur ne sait
// pas qui détient un titre (ADR-023). Elles sont nommées à tout employeur.
//
// CE QUE CE MODULE NE FAIT JAMAIS. Aucun total, aucun score, aucune date,
// aucune qualification. Il dit ce que l'OUTIL ne suit pas, jamais ce que le
// dirigeant aurait omis.
//
// Module pur : l'établissement et son parc lui sont donnés.

import { determineObligationsNiveauAudit } from "@/lib/matching/engine";
import type {
  EquipementMatching,
  EtablissementMatching,
} from "@/lib/matching/types";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import { QUESTION_DE_TYPE, libelleDuType } from "@/lib/equipements/type-appareil";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { estNiveauAudit } from "@/lib/referentiels/conformite/niveau-audit";
import {
  estPorteeParSalarie,
  type Obligation,
} from "@/lib/referentiels/conformite/types";
import type { CategorieEquipement, Realisateur } from "@/lib/referentiels/types-communs";

/** Une obligation au niveau audit, telle que la page la nomme. */
export type LigneNiveauAudit = {
  id: string;
  /**
   * Les obligations du référentiel que la ligne nomme : la sienne, ou celles
   * qu'un regroupement par appareil réunit (ADR-057). La première fonde
   * `reference`.
   */
  obligations: string[];
  libelle: string;
  /** Le texte fondateur, tel que le référentiel le cite (premier rang). */
  reference: string;
  /** Le lien vers le texte, quand le référentiel en porte un. */
  url: string | null;
  /**
   * Ce qui la ferait s'appliquer ici, en une phrase descriptive — ou `null`
   * quand elle n'apprendrait rien (2026-10-18).
   */
  porteePar: string | null;
  /** Le geste, tiré des réalisateurs (`gesteHorsQuotidien`, ADR-046). */
  geste: string;
};

/**
 * Le geste, sur chaque carte (2026-10-18). La rubrique disait « elle reste
 * due si le texte vous concerne », puis chaque carte répétait « Vise
 * l'établissement lui-même » : rien ne disait au dirigeant quoi faire. La
 * phrase nomme le geste et ce que l'outil ne fera pas, sans qualifier
 * personne.
 *
 * ~~Un seul geste pour toutes les cartes.~~ [2026-10-17, ADR-046 : faux pour
 * la fiche d'entreprise, que le service de santé au travail établit
 * (`R. 4624-46`) — le dirigeant ne la « tient » pas, il l'obtient. Le geste
 * dépend désormais des réalisateurs (`gesteHorsQuotidien`) ; cette constante
 * reste celui de l'exploitant.]
 */
export const GESTE_HORS_QUOTIDIEN =
  "À tenir vous-même : Rojer ne vous le rappellera pas.";

/** Qui réalise, rangé en trois : vous, votre service de santé au travail, un tiers. */
type Qui = "exploitant" | "spst" | "tiers";

function quiRealise(r: Realisateur): Qui {
  switch (r) {
    case "exploitant":
      return "exploitant";
    case "medecin_travail":
    case "professionnel_sante_travail":
    case "equipe_pluridisciplinaire":
      return "spst";
    case "organisme_agree":
    case "organisme_accredite":
    case "personne_qualifiee":
    case "personne_competente":
    case "fabricant":
    case "bureau_controle":
      return "tiers";
    default: {
      // Un réalisateur nouveau arrête la compilation ici : quelqu'un décide
      // du geste au lieu d'en hériter un faux.
      const jamais: never = r;
      return jamais;
    }
  }
}

/** Les quatre gestes (2026-10-17, ADR-046, décision c6 Q4). */
export const GESTES_HORS_QUOTIDIEN = {
  exploitant: GESTE_HORS_QUOTIDIEN,
  spst: "À obtenir de votre service de santé au travail : Rojer ne vous le rappellera pas.",
  // ~~« À obtenir de votre ascensoriste : … »~~ — 2026-10-17, revue de
  // l'ADR-046 : le propriétaire peut assurer lui-même l'entretien de
  // l'ascenseur (R. 134-10 CCH, cité par la revue, non relu dans ce lot) ;
  // la phrase n'impose plus un ascensoriste qu'il n'a pas.
  ascensoriste:
    "À obtenir de votre ascensoriste, ou à établir vous-même si vous assurez l'entretien de l'ascenseur : Rojer ne vous le rappellera pas.",
  tiers: "À faire réaliser par une personne qualifiée : Rojer ne vous le rappellera pas.",
} as const;

/**
 * Le geste d'une obligation hors du quotidien, tiré de ses réalisateurs
 * (2026-10-17, ADR-046) :
 *  - l'exploitant parmi eux → « À tenir vous-même » : s'il peut le faire, le
 *    faire lui revient ;
 *  - sinon le service de santé au travail → « À obtenir de votre service… » ;
 *  - sinon un tiers ; pour un ascenseur, le tiers est l'entreprise
 *    d'entretien — l'ascensoriste. ~~`niveau-audit.test.ts`~~ `geste-hors-quotidien.test.ts` tient que toute
 *    obligation envoyée à l'ascensoriste relève du contrat d'entretien : un
 *    contrôle technique (fait par un contrôleur, pas par l'ascensoriste)
 *    passé au niveau audit ferait tomber le test au lieu de recevoir un faux
 *    destinataire ;
 *  - sinon → « À faire réaliser par une personne qualifiée ».
 */
export function gesteHorsQuotidien(o: Obligation): string {
  const qui = new Set(o.realisateurs.map(quiRealise));
  if (qui.has("exploitant")) return GESTES_HORS_QUOTIDIEN.exploitant;
  if (qui.has("spst")) return GESTES_HORS_QUOTIDIEN.spst;
  if (o.domaine === "ascenseur") return GESTES_HORS_QUOTIDIEN.ascensoriste;
  return GESTES_HORS_QUOTIDIEN.tiers;
}

function porteePar(
  o: Obligation,
  equipements: readonly Pick<EquipementMatching, "categorie" | "caracteristiques">[],
): string | null {
  if (estPorteeParSalarie(o)) {
    return "Concerne chaque personne qui détiendrait ce titre.";
  }
  if (equipements.length > 0) {
    // Le LIBELLÉ de la catégorie, jamais le code de l'enum : « EPI_RESPIRATOIRE »
    // n'est pas un mot que le dirigeant a déclaré. Une catégorie nommée une
    // fois, même pour trois appareils. [2026-11-07, ADR-057 § 5 : le TYPE
    // déclaré quand la catégorie en pose un — « Équipement de protection
    // individuelle » ne dirait pas lequel des EPI la ligne vise.]
    const categories = [
      ...new Set(
        equipements.map((e) => {
          const q = QUESTION_DE_TYPE[e.categorie];
          const type = q ? libelleDuType(e.categorie, e.caracteristiques?.[q.propriete]) : null;
          return type ?? LABEL_CATEGORIE_EQUIPEMENT[e.categorie];
        }),
      ),
    ];
    return `Vise ${equipements.length > 1 ? "les équipements déclarés" : "l'équipement déclaré"} : ${categories.join(", ")}.`;
  }
  // ~~« Vise l'établissement lui-même. »~~ — 2026-10-18 : répété sur chaque
  // carte, il n'apprenait rien. Le silence dit la même chose.
  return null;
}

/**
 * Les obligations que la rubrique réunit PAR APPAREIL (ADR-057, décision de
 * la propriétaire du 2026-11-05 : « une seule ligne pour tous les extincteurs
 * et une ligne pour tous les RIA »). Trois textes — l'arrêté du 4 novembre
 * 1993 en lieu de travail, MS 39 en ERP des catégories 1 à 4, PE 26 en 5ᵉ —
 * demandent le même geste : que l'appareil soit identifié et signalé. Un
 * regroupement d'AFFICHAGE : les trois obligations restent au référentiel,
 * chacune avec sa source.
 */
const SIGNALISATION_PAR_APPAREIL: {
  ids: ReadonlySet<string>;
  libelles: Partial<Record<CategorieEquipement, string>>;
} = {
  ids: new Set([
    "signalisation-incendie-moyens-lutte",
    "signalisation-erp-extincteurs-identification",
    "signalisation-erp-5-extincteurs-identification",
  ]),
  libelles: {
    EXTINCTEUR: "Signalisation des extincteurs",
    RIA: "Signalisation des robinets d'incendie armés",
  },
};

/**
 * Les obligations au niveau audit qui peuvent concerner ce dossier, dans
 * l'ordre du référentiel — la signalisation des extincteurs et des RIA réunie
 * en une ligne par appareil (`SIGNALISATION_PAR_APPAREIL`).
 */
export function obligationsNiveauAuditDuDossier(
  etab: EtablissementMatching,
  equipements: EquipementMatching[],
  obligations: Obligation[] = obligationsConformite,
): LigneNiveauAudit[] {
  const parId = new Map(
    determineObligationsNiveauAudit(etab, equipements, { obligations }).map(
      (a) => [a.obligation.id, a],
    ),
  );
  const out: LigneNiveauAudit[] = [];
  // La signalisation réunie, posée à la place du premier de ses textes.
  let signalisationPosee = false;
  for (const o of obligations) {
    if (!estNiveauAudit(o)) continue;
    const applicable = parId.get(o.id);
    const salarie = estPorteeParSalarie(o) && etab.estEtablissementTravail;
    if (!applicable && !salarie) continue;
    if (SIGNALISATION_PAR_APPAREIL.ids.has(o.id)) {
      if (!signalisationPosee) {
        signalisationPosee = true;
        out.push(...signalisationParAppareil(parId));
      }
      continue;
    }
    const [fondement] = o.referencesLegales;
    out.push({
      id: o.id,
      obligations: [o.id],
      libelle: o.libelle,
      reference: fondement.reference,
      url: fondement.url ?? null,
      porteePar: porteePar(o, applicable?.equipementsConcernes ?? []),
      geste: gesteHorsQuotidien(o),
    });
  }
  return out;
}

/** Une ligne par appareil signalé — extincteurs, puis RIA —, pour ce dossier. */
function signalisationParAppareil(
  parId: ReadonlyMap<string, { obligation: Obligation; equipementsConcernes: EquipementMatching[] }>,
): LigneNiveauAudit[] {
  // Une passe : par catégorie, les textes qui visent un de ses appareils, et
  // ces appareils.
  const parCategorie = new Map<CategorieEquipement, { textes: Obligation[]; appareils: Map<string, EquipementMatching> }>();
  for (const id of SIGNALISATION_PAR_APPAREIL.ids) {
    const a = parId.get(id);
    if (!a) continue;
    for (const e of a.equipementsConcernes) {
      const g = parCategorie.get(e.categorie) ?? {
        textes: [] as Obligation[],
        appareils: new Map<string, EquipementMatching>(),
      };
      if (!g.textes.includes(a.obligation)) g.textes.push(a.obligation);
      g.appareils.set(e.id, e);
      parCategorie.set(e.categorie, g);
    }
  }
  return (Object.entries(SIGNALISATION_PAR_APPAREIL.libelles) as [CategorieEquipement, string][])
    .flatMap(([categorie, libelle]) => {
      const g = parCategorie.get(categorie);
      if (!g) return [];
      // Le texte en tête : le premier qui vise la catégorie.
      const [tete] = g.textes;
      const [fondement] = tete.referencesLegales;
      return [
        {
          id: `signalisation-par-appareil:${categorie}`,
          obligations: g.textes.map((o) => o.id),
          libelle,
          reference: fondement.reference,
          url: fondement.url ?? null,
          porteePar: porteePar(tete, [...g.appareils.values()]),
          geste: gesteHorsQuotidien(tete),
        },
      ];
    });
}
