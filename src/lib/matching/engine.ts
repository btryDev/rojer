/**
 * Moteur de matching équipements ↔ obligations (étape 5, spec/PLAN.md).
 *
 * Entrée :
 *   - un `Etablissement` (typologie + effectif)
 *   - la liste de ses `Equipement`s déclarés
 *   - optionnellement une liste d'obligations (injection pour les tests)
 *
 * Sortie :
 *   - la liste des obligations applicables, avec pour chacune les
 *     équipements qui les déclenchent et les raisons textuelles
 *     (« mode explain »).
 *
 * Règles (doc : `docs/regles-matching.md`) :
 *   1. La typologie de l'obligation doit matcher l'établissement — les
 *      régimes positifs (travail/ERP/IGH/habitation) en OU entre eux, les
 *      exclusions (`false`), les restrictions de catégorie ERP, de **type
 *      d'exploitation ERP**, de classe IGH et l'effectif en ET
 *      (amendements 2026-08).
 *   2. Au moins un équipement de l'établissement doit avoir sa catégorie
 *      dans `obligation.categoriesEquipement`.
 *   3. Si l'obligation a des `conditions[]`, elles sont regroupées par
 *      catégorie d'équipement ; il doit exister au moins un équipement
 *      E satisfaisant TOUTES les conditions dont `categorie === E.categorie`.
 *   4. Si l'obligation a `effectifMin`/`effectifMax`, l'effectif sur site
 *      doit être dans la plage (bornes incluses).
 *   5. Si l'obligation a `locauxSommeilPublic`, l'établissement doit le
 *      satisfaire — avec la règle du non-renseigné : `true` retient quand la
 *      réponse manque (« à confirmer »), `false` rejette (un allègement ne se
 *      donne pas sur une absence supposée).
 *   6. Si l'obligation a `personnesPresentesMin`, le moteur ne connaît du
 *      total (salariés + public) que des **bornes basses** : la catégorie
 *      d'ERP et l'effectif salarié. Une borne basse établit « au-dessus du
 *      seuil » et jamais « en dessous » — d'où, sous la borne, « à confirmer »
 *      pour un ERP et un rejet pour un établissement de travail seul.
 *
 * Le moteur est **pur** : pas d'I/O, pas d'horloge, pas d'aléatoire. Deux
 * appels avec les mêmes entrées renvoient le même résultat, ce qui est la
 * condition d'auditabilité (cf. CLAUDE.md, principe zéro-IA).
 */

import { obligationsConformite } from "@/lib/referentiels/conformite";
import {
  estPorteeParEquipement,
  porteurDe,
  type ConditionApplication,
  type Obligation,
  type ObligationPorteeParEquipement,
} from "@/lib/referentiels/conformite/types";
import type {
  CategorieEquipement,
  CategorieErp,
  FamilleHabitation,
  TypologieApplication,
} from "@/lib/referentiels/types-communs";
import { sommeilPlausiblePourLeType } from "@/lib/referentiels/types-communs";
import type {
  EquipementMatching,
  EtablissementMatching,
  ObligationApplicable,
} from "./types";

// -----------------------------------------------------------------------------
// Étape 1 — Typologie
// -----------------------------------------------------------------------------

export type ResultatTypologie = { ok: true; raisons: string[] } | { ok: false };

/**
 * Évaluation d'un critère de régime : `absent` (non déclaré par
 * l'obligation), `match` (satisfait, avec sa raison textuelle) ou
 * `mismatch` (déclaré mais non satisfait).
 */
type EvalRegime =
  { etat: "absent" } | { etat: "match"; raison: string } | { etat: "mismatch" };

function evaluerErp(
  critere: TypologieApplication["erp"],
  etab: EtablissementMatching,
): EvalRegime {
  if (critere === undefined || critere === false) return { etat: "absent" };
  if (!etab.estERP) return { etat: "mismatch" };
  if (typeof critere === "object") {
    const precisions: string[] = [];

    if (critere.categories && critere.categories.length > 0) {
      if (
        !etab.categorieErp ||
        !critere.categories.includes(etab.categorieErp)
      ) {
        return { etat: "mismatch" };
      }
      precisions.push(
        `catégorie ${etab.categorieErp.slice(1)} (règle limitée à ${critere.categories
          .map((c) => c.slice(1))
          .join(", ")})`,
      );
    }

    // Restriction par type d'exploitation — même sémantique que la catégorie :
    // un ERP dont le type n'est pas renseigné ne satisfait pas la restriction.
    if (critere.types && critere.types.length > 0) {
      if (!etab.typeErp || !critere.types.includes(etab.typeErp)) {
        return { etat: "mismatch" };
      }
      precisions.push(
        `type ${etab.typeErp} (règle limitée aux types ${critere.types.join(", ")})`,
      );
    }

    // Exclusion par type d'exploitation — sémantique INVERSE de la
    // restriction ci-dessus, et c'est voulu : un ERP dont le type n'est pas
    // renseigné n'est PAS exclu. Une exclusion que l'on ne peut pas vérifier
    // ne doit pas faire disparaître une ligne (cf. `TypologieApplication`).
    if (critere.typesExclus && critere.typesExclus.length > 0) {
      if (etab.typeErp && critere.typesExclus.includes(etab.typeErp)) {
        return { etat: "mismatch" };
      }
      precisions.push(
        etab.typeErp
          ? `type ${etab.typeErp} (règle excluant les types ${critere.typesExclus.join(", ")})`
          : `type non précisé (règle excluant les types ${critere.typesExclus.join(", ")}, exclusion non vérifiable)`,
      );
    }

    return {
      etat: "match",
      raison: precisions.length > 0 ? `ERP ${precisions.join(", ")}` : "ERP",
    };
  }
  return { etat: "match", raison: "ERP" };
}

/**
 * L'IGH, avec ou sans restriction de classe (arrêté du 30 décembre 2011).
 *
 * LA CLASSE NON RENSEIGNÉE NE REJETTE PLUS, depuis le 2026-09-03, et ce
 * changement n'est pas un confort : il ferme un faux négatif MUET que le
 * retrait de la question aurait rendu certain.
 *
 * Jusqu'ici, `classeIgh: null` faisait `mismatch` sur toute règle bornée par
 * `classes`. C'était déjà contraire à la règle du non-renseigné de l'ADR-022 —
 * « l'incertitude ne réduit jamais la couverture » —, et c'était sans
 * conséquence tant qu'un dirigeant pouvait renseigner la classe. La question a
 * été retirée du produit le 2026-09-03 : plus aucune surface ne l'écrit, donc
 * tout dossier neuf porte `null`, donc la PREMIÈRE obligation qu'on encoderait
 * un jour avec `igh: { classes }` disparaîtrait silencieusement pour tout le
 * monde. Une capacité qu'on garde doit rester utilisable sans piège.
 *
 * Le comportement est désormais celui d'`evaluerHabitation`, mot pour mot :
 * classe connue et visée → match ; classe connue et non visée → mismatch ;
 * classe absente → match, en le disant. Ce qui reste asymétrique — et doit le
 * rester — est `evaluerErp` sur la catégorie, où l'absence écarte : une
 * catégorie d'ERP se déclare toujours, elle.
 */
function evaluerIgh(
  critere: TypologieApplication["igh"],
  etab: EtablissementMatching,
): EvalRegime {
  if (critere === undefined || critere === false) return { etat: "absent" };
  if (!etab.estIGH) return { etat: "mismatch" };
  if (typeof critere === "object") {
    if (critere.classes && critere.classes.length > 0) {
      const attendues = critere.classes.join(", ");
      if (!etab.classeIgh) {
        return {
          etat: "match",
          raison: `IGH, classe non renseignée — obligation retenue par prudence, à confirmer (règle limitée à : ${attendues})`,
        };
      }
      if (!critere.classes.includes(etab.classeIgh)) {
        return { etat: "mismatch" };
      }
      return {
        etat: "match",
        raison: `IGH classe ${etab.classeIgh} (règle limitée à : ${attendues})`,
      };
    }
    return { etat: "match", raison: "IGH" };
  }
  return { etat: "match", raison: "IGH" };
}

const LIBELLE_FAMILLE: Record<FamilleHabitation, string> = {
  PREMIERE: "1ʳᵉ famille",
  DEUXIEME: "2ᵉ famille",
  TROISIEME_A: "3ᵉ famille A",
  TROISIEME_B: "3ᵉ famille B",
  QUATRIEME: "4ᵉ famille",
};

/**
 * Habitation, avec ou sans restriction de famille (arrêté du 31 janvier 1986).
 *
 * Le cas qui distingue cette fonction d'`evaluerErp` est **la famille non
 * renseignée** : elle ne rejette pas, elle retient l'obligation en le disant.
 * La raison est écrite dans `TypologieApplication.habitation` — la famille
 * n'existe que depuis le 2026-09-01, tous les dossiers antérieurs en sont
 * dépourvus, et les écarter retirerait en silence des obligations que
 * personne ne pourrait voir manquer.
 */
function evaluerHabitation(
  critere: TypologieApplication["habitation"],
  etab: EtablissementMatching,
): EvalRegime {
  if (critere === undefined || critere === false) return { etat: "absent" };
  if (!etab.estHabitation) return { etat: "mismatch" };
  if (typeof critere === "object") {
    const attendues = critere.familles
      .map((f) => LIBELLE_FAMILLE[f])
      .join(", ");
    if (!etab.familleHabitation) {
      return {
        etat: "match",
        raison: `immeuble d'habitation, famille non renseignée — obligation retenue par prudence, à confirmer (règle limitée à : ${attendues})`,
      };
    }
    if (!critere.familles.includes(etab.familleHabitation)) {
      return { etat: "mismatch" };
    }
    return {
      etat: "match",
      raison: `immeuble d'habitation de ${LIBELLE_FAMILLE[etab.familleHabitation]} (règle limitée à : ${attendues})`,
    };
  }
  return { etat: "match", raison: "immeuble d'habitation" };
}

/**
 * Locaux à sommeil pour le public — arrêté du 25 juin 1980, Livre III
 * (PE 4 § 1, PE 33, PE 35, PE 37).
 *
 * Le patron est celui d'`evaluerHabitation` : **l'attribut non renseigné ne
 * retire rien**, il retient l'obligation en le disant. La règle du
 * non-renseigné (`.claude/CLAUDE.md`) veut ici la même prudence, et pour la
 * même raison mesurable — la colonne n'existe que depuis le 2026-09-01, aucun
 * dossier antérieur ne porte de réponse, et retirer PE 37 à un hôtel qui n'a
 * pas encore répondu serait un faux négatif que personne ne peut voir.
 *
 * Le sens INVERSE ne se comporte pas de la même façon, et c'est la seconde
 * moitié de la même règle : un allègement de régime conditionné à l'ABSENCE de
 * locaux à sommeil (`locauxSommeilPublic: false`) ne s'applique pas tant que
 * l'absence n'est pas déclarée. On ne allège jamais sur une supposition.
 *
 * `null` (le critère est absent de l'obligation) ⇒ aucune contrainte : cette
 * fonction ne se prononce pas.
 */
type EvalLocauxSommeil = { ok: false } | { ok: true; raison: string };

function evaluerLocauxSommeil(
  critere: TypologieApplication["locauxSommeilPublic"],
  etab: EtablissementMatching,
): EvalLocauxSommeil | null {
  if (critere === undefined) return null;
  const declare = etab.comporteLocauxSommeilPublic;

  if (critere === true) {
    // Une réponse explicite l'emporte toujours, dans les deux sens et pour
    // tout type : « non » écarte, « oui » applique — y compris à l'auberge
    // typée N, que le type unique du modèle ne sait pas dire autrement.
    if (declare === false) return { ok: false };
    if (declare === true) {
      return { ok: true, raison: "locaux à sommeil pour le public déclarés" };
    }
    // LE SILENCE, ET CE QU'IL VAUT SELON LE TYPE (2026-09-21). Jusqu'ici il
    // retenait partout : mesuré en production, un musée, un magasin, un bureau
    // et un restaurant de 5ᵉ catégorie portaient chacun les quatre lignes —
    // contrat d'entretien de la détection, consigne dans les chambres —, et
    // les auraient portées pour toujours, la question ne leur étant posée que
    // sur un écran que personne n'ouvre. La prudence couvre une INCERTITUDE ;
    // or un type déclaré hors de `TYPES_ERP_A_SOMMEIL_PLAUSIBLE` n'en laisse
    // pas : le type a déjà répondu. Sans type déclaré, en revanche, rien n'a
    // répondu, et le silence retient comme avant (ADR-022 § 7).
    if (!sommeilPlausiblePourLeType(etab.typeErp)) return { ok: false };
    return {
      ok: true,
      raison:
        "présence de locaux à sommeil pour le public non renseignée — obligation retenue par prudence, à confirmer",
    };
  }

  // `false` : l'obligation ne vise que les établissements SANS locaux à
  // sommeil. Le silence ne vaut pas absence, donc il ne donne pas l'allègement.
  if (declare !== false) return { ok: false };
  return {
    ok: true,
    raison: "absence de locaux à sommeil pour le public déclarée",
  };
}

/**
 * Personnes habituellement présentes — R. 4227-34 CT, « occupées ou réunies ».
 *
 * LE NOMBRE COMPTE LES SALARIÉS **ET** LE PUBLIC, et c'est tout le sujet. Le
 * produit ne le demande plus depuis le 2026-09-01 ; il en déduit donc ce qu'il
 * peut, et ce qu'il peut n'est jamais qu'une **borne basse** du total.
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
type EvalPersonnesPresentes =
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

function evaluerPersonnesPresentes(
  seuil: number,
  etab: EtablissementMatching,
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
 * Sémantique (amendements 2026-08, cf. `docs/regles-matching.md`) :
 *   - Les critères de régime **positifs** (`travail: true`, `erp: true |
 *     {categories}`, `igh: true | {classes}`, `habitation: true`) forment
 *     une **disjonction** : l'établissement doit en satisfaire AU MOINS UN.
 *     Une obligation déclarant `{ travail: true, erp: true, igh: true }`
 *     s'applique donc aux établissements de travail OU ERP OU IGH
 *     (cas des ascenseurs).
 *   - Les critères **négatifs** (`travail: false`, `erp: false`, …) restent
 *     des **exclusions en ET** : un seul violé suffit à rejeter.
 *   - Les **restrictions de catégorie ERP, de type d'exploitation ERP et de
 *     classe IGH** sont en ET, et non
 *     dans la disjonction : si l'obligation écrit `erp: { categories: [...] }`
 *     et que l'établissement EST un ERP, sa catégorie doit appartenir à la
 *     liste — même si un autre régime positif (`travail: true`) matche par
 *     ailleurs. Sans cette règle, une obligation `{ travail: true,
 *     erp: { categories: ["N1"] } }` s'appliquerait à un ERP de 5ᵉ catégorie
 *     employeur via la seule branche « travail », contournant en silence la
 *     restriction de catégorie que le rédacteur a explicitement posée.
 *   - L'**exclusion par type** (`erp: { typesExclus: [...] }`) est elle aussi
 *     en ET, mais ne mord que sur un type CONNU : un ERP dont le `typeErp`
 *     n'est pas renseigné n'est pas exclu. C'est l'inverse de `types`, et
 *     pour la même raison — dans les deux cas, ne pas savoir ne retire
 *     jamais une ligne du calendrier.
 *   - `effectifMin`/`effectifMax` restent en ET avec le reste.
 *   - Les `raisons` ne contiennent que les régimes effectivement matchés.
 */
// Exporté depuis l'ADR-021 : la composition du registre de sécurité pose la
// même question que le matching d'une obligation — « à qui cette ligne
// s'applique-t-elle ? » — et doit y répondre avec la même logique, seuils,
// exclusions et garde-fous compris. La réécrire ailleurs, c'est se garantir
// deux réponses divergentes le jour où l'une des deux est corrigée.
export function matchTypologie(
  t: TypologieApplication,
  etab: EtablissementMatching,
): ResultatTypologie {
  // 1. Exclusions (ET) — un critère négatif violé rejette immédiatement.
  if (t.travail === false && etab.estEtablissementTravail) return { ok: false };
  if (t.erp === false && etab.estERP) return { ok: false };
  if (t.igh === false && etab.estIGH) return { ok: false };
  if (t.habitation === false && etab.estHabitation) return { ok: false };

  // 1 bis. Restrictions de catégorie / classe (ET). Elles ne s'appliquent qu'aux
  // établissements qui relèvent effectivement du régime restreint : un bureau
  // non-ERP n'est pas concerné par une restriction « ERP 1ʳᵉ à 4ᵉ catégorie »,
  // il est simplement hors de cette branche de la disjonction.
  if (
    typeof t.erp === "object" &&
    t.erp.categories !== undefined &&
    t.erp.categories.length > 0 &&
    etab.estERP &&
    (!etab.categorieErp || !t.erp.categories.includes(etab.categorieErp))
  ) {
    return { ok: false };
  }
  if (
    typeof t.erp === "object" &&
    t.erp.types !== undefined &&
    t.erp.types.length > 0 &&
    etab.estERP &&
    (!etab.typeErp || !t.erp.types.includes(etab.typeErp))
  ) {
    return { ok: false };
  }
  // Exclusion par type (ET, comme la restriction) — mais elle ne mord que sur
  // un type CONNU. Un ERP dont le type n'est pas renseigné traverse
  // l'exclusion : c'est ce qui permet d'écrire le complément d'un tableau
  // (GE 4 § 1) sans priver de ligne l'établissement qui n'a rien précisé.
  if (
    typeof t.erp === "object" &&
    t.erp.typesExclus !== undefined &&
    t.erp.typesExclus.length > 0 &&
    etab.estERP &&
    etab.typeErp !== null &&
    etab.typeErp !== undefined &&
    t.erp.typesExclus.includes(etab.typeErp)
  ) {
    return { ok: false };
  }
  // Classe d'IGH : même rôle que la restriction de catégorie ERP — empêcher
  // qu'une obligation restreinte passe par une autre branche de la disjonction
  // (`travail: true`) sans que la restriction soit vérifiée. Et depuis le
  // 2026-09-03, même dissymétrie que la famille d'habitation : la classe
  // ABSENTE ne rejette pas. La garde en ET ne doit pas défaire la prudence
  // d'`evaluerIgh` — sans quoi une obligation bornée par classe disparaîtrait
  // de tous les dossiers, la question ayant été retirée du produit.
  if (
    typeof t.igh === "object" &&
    t.igh.classes.length > 0 &&
    etab.estIGH &&
    etab.classeIgh !== null &&
    etab.classeIgh !== undefined &&
    !t.igh.classes.includes(etab.classeIgh)
  ) {
    return { ok: false };
  }
  // Famille d'habitation : même rôle que la restriction de catégorie ERP —
  // empêcher qu'une obligation restreinte passe par une autre branche de la
  // disjonction (`travail: true`) sans que la restriction soit vérifiée.
  // Une seule différence, et c'est celle qui gouverne tout ce champ : la
  // famille ABSENTE ne rejette pas. Elle ne peut pas rejeter ici sans annuler
  // la prudence d'`evaluerHabitation`.
  if (
    typeof t.habitation === "object" &&
    t.habitation.familles.length > 0 &&
    etab.estHabitation &&
    etab.familleHabitation !== null &&
    etab.familleHabitation !== undefined &&
    !t.habitation.familles.includes(etab.familleHabitation)
  ) {
    return { ok: false };
  }

  // 2. Régimes positifs (OU) — au moins un déclaré doit matcher.
  const regimes: EvalRegime[] = [
    t.travail === true
      ? etab.estEtablissementTravail
        ? { etat: "match", raison: "établissement de travail (salariés)" }
        : { etat: "mismatch" }
      : { etat: "absent" },
    evaluerErp(t.erp, etab),
    evaluerIgh(t.igh, etab),
    evaluerHabitation(t.habitation, etab),
  ];

  const declares = regimes.filter((r) => r.etat !== "absent");
  const matches = regimes.filter((r) => r.etat === "match");
  if (declares.length > 0 && matches.length === 0) {
    return { ok: false };
  }

  const raisons = matches.map((r) => (r as { raison: string }).raison);

  // 3. Effectif (ET).
  if (t.effectifMin !== undefined && etab.effectifSurSite < t.effectifMin) {
    return { ok: false };
  }
  if (t.effectifMax !== undefined && etab.effectifSurSite > t.effectifMax) {
    return { ok: false };
  }
  if (t.effectifMin !== undefined || t.effectifMax !== undefined) {
    // Cette raison est LUE PAR UN DIRIGEANT : le guide « Comprendre » l'affiche
    // sous « pourquoi chez vous ». Elle s'écrivait en notation d'intervalle —
    // « effectif sur site 6 dans la plage [— ; 49] » —, une notation de
    // développeur, avec un tiret cadratin pour dire « pas de borne ». Personne
    // hors de ce dépôt ne lit ça.
    //
    // Trois formes plutôt qu'une, parce que le seuil qui compte n'est pas le
    // même selon les bornes déclarées, et qu'une seule tournure aurait forcé à
    // nommer une borne absente.
    const n = etab.effectifSurSite;
    const seuil =
      t.effectifMin !== undefined && t.effectifMax !== undefined
        ? `de ${t.effectifMin} à ${t.effectifMax} salariés`
        : t.effectifMin !== undefined
          ? `à partir de ${t.effectifMin} salarié${t.effectifMin > 1 ? "s" : ""}`
          : `jusqu'à ${t.effectifMax} salariés`;
    raisons.push(`effectif sur site ${n} — obligation applicable ${seuil}`);
  }

  // 3 bis. Personnes présentes (salariés + public) et champ R. 4227-34.
  //
  // Le seuil compte « les personnes occupées ou réunies » : salariés ET
  // public. Le produit n'a pas toujours ce nombre — la question a été retirée
  // du parcours de création le 2026-09-01, c'était une question de technicien
  // posée à qui n'avait encore rien vu du produit — et ce qu'il fait alors est
  // ce que ce bloc décide.
  //
  // CE QU'IL FAISAIT JUSQU'AU 2026-09-02, ET POURQUOI C'ÉTAIT LE MAUVAIS SENS.
  // Le silence retombait sur `effectifSurSite` et le nombre obtenu était traité
  // comme le total : sous le seuil, l'obligation disparaissait. Or un ERP reçoit
  // du public par définition ; répondre « 8 » pour un restaurant de huit
  // salariés qui sert trois cents couverts est une chose qu'on sait fausse, et
  // elle faisait disparaître en silence la consigne de sécurité incendie et les
  // exercices semestriels — deux lignes qu'un inspecteur regarde en premier.
  //
  // CE QU'IL FAIT MAINTENANT : il ne connaît que des BORNES BASSES du total, et
  // une borne basse ne conclut que dans un sens. Elle établit « au-dessus du
  // seuil », jamais « en dessous ». Deux bornes, et la meilleure des deux :
  //
  //   - la catégorie d'ERP, déclarée par le dirigeant depuis le 2026-09-01 —
  //     dès la 3ᵉ catégorie le public seul dépasse trois cents personnes, donc
  //     largement les cinquante et une du seuil, sans qu'on ait rien à
  //     demander (`PLANCHER_PUBLIC_PAR_CATEGORIE`) ;
  //   - l'effectif salarié, qui est compté par le texte lui aussi.
  //
  // Au-dessus de la borne : l'obligation s'applique, et la raison dit d'où le
  // dépassement est établi. En dessous, la déduction ne dit rien, et la suite
  // dépend du régime — un ERP reçoit du public, un établissement de travail
  // seul n'en reçoit pas. C'est la même dissymétrie qu'`opposabiliteUrssaf`,
  // dont le commentaire dit la même chose de `updatedAt`.
  //
  // `manipuleMatieresR422722` absent ⇒ « non ». Cette branche ne fait
  // qu'ajouter des cas à un champ déjà ouvert par le seuil, aucun établissement
  // ne perd d'obligation par son silence — mais c'est la seconde entorse à la
  // règle du non-renseigné recensée par `.claude/CLAUDE.md`, et elle reste.
  //
  // Le critère est évalué dès que **l'une** des deux branches est déclarée :
  // une obligation qui n'écrirait que `champR422734` (branche matières seule)
  // ne doit pas passer sans filtre — un critère que l'on ne sait pas vérifier
  // ne s'ignore jamais en silence.
  if (t.personnesPresentesMin !== undefined || t.champR422734 === true) {
    const brancheMatieres =
      t.champR422734 === true && etab.manipuleMatieresR422722 === true;
    const seuil =
      t.personnesPresentesMin === undefined
        ? { etat: "non_atteint" as const }
        : evaluerPersonnesPresentes(t.personnesPresentesMin, etab);

    if (seuil.etat === "non_atteint" && !brancheMatieres) return { ok: false };

    // La raison « à confirmer » ne se dit que si rien d'autre n'établit le
    // champ : quand les matières sont déclarées, l'obligation est due de façon
    // certaine et annoncer un doute par-dessus se lirait comme le sien.
    if (
      seuil.etat === "atteint" ||
      (seuil.etat === "indetermine" && !brancheMatieres)
    ) {
      raisons.push(seuil.raison);
    }
    if (brancheMatieres) {
      raisons.push(
        "manipulation de matières visées par R. 4227-22 déclarée (champ R. 4227-34, quel que soit l'effectif)",
      );
    }
  }

  // 3 ter. Locaux à sommeil pour le public (ET).
  const sommeil = evaluerLocauxSommeil(t.locauxSommeilPublic, etab);
  if (sommeil !== null) {
    if (!sommeil.ok) return { ok: false };
    raisons.push(sommeil.raison);
  }

  // Si aucune contrainte de typologie n'a été posée ET aucune raison n'a
  // été ajoutée, l'obligation est considérée comme non applicable (garde-fou :
  // évite de matcher toutes les obligations mal rédigées sans typologie).
  if (raisons.length === 0) {
    return { ok: false };
  }

  return { ok: true, raisons };
}

// -----------------------------------------------------------------------------
// Étape 2 — Équipements (catégorie + conditions)
// -----------------------------------------------------------------------------

function lireProprieteNumerique(
  eq: EquipementMatching,
  propriete: string,
): number | undefined {
  const v = eq.caracteristiques?.[propriete];
  return typeof v === "number" ? v : undefined;
}

function lireProprieteBooleenne(
  eq: EquipementMatching,
  propriete: string,
): boolean | undefined {
  const v = eq.caracteristiques?.[propriete];
  return typeof v === "boolean" ? v : undefined;
}

/**
 * Une valeur d'énumération est lue comme une chaîne ; tout le reste vaut
 * absence, exactement comme pour les deux lecteurs ci-dessus.
 *
 * Une première rédaction traitait aussi la chaîne VIDE comme une absence, au
 * motif qu'une reprise de données peut poser `""`. Le cas est réel, la
 * précaution était vide : sur une condition dont la `valeur` est un membre de
 * l'énumération, `""` produit déjà le même verdict que l'absence — différent de
 * la valeur visée, donc régime général. Le code ne gardait rien et le
 * commentaire affirmait le contraire, ce qui est la forme la plus durable d'une
 * fausse justification. Retiré.
 */
function lireProprieteEnum(
  eq: EquipementMatching,
  propriete: string,
): string | undefined {
  const v = eq.caracteristiques?.[propriete];
  return typeof v === "string" ? v : undefined;
}

/**
 * Évaluation d'une condition pour un équipement donné.
 *
 * Le point sensible est le traitement de la propriété **non renseignée** :
 *   - `numerique` et `booleenne` : non renseignée ⇒ NON satisfaite (opt-in).
 *     L'obligation n'apparaît qu'après une réponse explicite de l'utilisateur.
 *   - `non_infirmee` : non renseignée ⇒ SATISFAITE (opt-out). Seule la valeur
 *     booléenne `false` — c'est-à-dire une réponse « non » explicite — rend la
 *     condition non satisfaite. C'est la forme imposée aux obligations de
 *     criticité ≥ 4 auxquelles on ajoute une condition après coup : les
 *     équipements déjà en base ne peuvent alors pas perdre l'obligation en
 *     silence (cf. `ConditionApplication` dans le référentiel).
 *   - `infirmee` : miroir de la précédente. Non renseignée ⇒ SATISFAITE ;
 *     seule une réponse « oui » explicite l'infirme. Elle porte la règle
 *     générale d'un couple d'obligations qui s'excluent, l'obligation
 *     spécifique portant l'opt-in correspondant. Tant que la question n'a pas
 *     été posée, c'est la règle générale qui s'applique — jamais aucune.
 *   - `enum_egale` : non renseignée ⇒ NON satisfaite (opt-in). L'égalité sur
 *     une valeur d'énumération, pour la ligne SPÉCIFIQUE d'un couple.
 *   - `enum_differente` : non renseignée ⇒ SATISFAITE. La différence, pour la
 *     ligne GÉNÉRALE du même couple. Le silence ne l'éteint pas : un
 *     équipement dont la famille n'a jamais été saisie garde le régime
 *     général, il ne tombe pas hors des deux.
 *
 * Le motif est le même dans les quatre derniers cas, et c'est le point à ne pas
 * perdre : la forme qui porte la règle générale est TOUJOURS celle qui survit à
 * l'absence de réponse. Une paire dont les deux membres s'éteignent au silence
 * fabrique un faux négatif muet ; une paire dont les deux membres y survivent
 * fabrique un doublon.
 */
function conditionSatisfaite(
  cond: ConditionApplication,
  eq: EquipementMatching,
): boolean {
  if (cond.type === "equipement_propriete_non_infirmee") {
    return lireProprieteBooleenne(eq, cond.propriete) !== false;
  }
  if (cond.type === "equipement_propriete_infirmee") {
    return lireProprieteBooleenne(eq, cond.propriete) !== true;
  }
  if (cond.type === "equipement_propriete_numerique") {
    const v = lireProprieteNumerique(eq, cond.propriete);
    if (v === undefined) return false;
    switch (cond.operateur) {
      case ">":
        return v > cond.valeur;
      case ">=":
        return v >= cond.valeur;
      case "<":
        return v < cond.valeur;
      case "<=":
        return v <= cond.valeur;
      case "==":
        return v === cond.valeur;
    }
  }
  if (cond.type === "equipement_propriete_booleenne") {
    const v = lireProprieteBooleenne(eq, cond.propriete);
    if (v === undefined) return false;
    return v === cond.valeur;
  }
  if (cond.type === "equipement_propriete_enum_egale") {
    const v = lireProprieteEnum(eq, cond.propriete);
    if (v === undefined) return false;
    return v === cond.valeur;
  }
  if (cond.type === "equipement_propriete_enum_differente") {
    const v = lireProprieteEnum(eq, cond.propriete);
    // Non renseignée ⇒ SATISFAITE. C'est ce `undefined` qui garde la ligne
    // générale sur un équipement dont la famille n'a jamais été saisie.
    if (v === undefined) return true;
    return v !== cond.valeur;
  }
  return false;
}

function conditionsParCategorie(
  conditions: ConditionApplication[] | undefined,
): Map<CategorieEquipement, ConditionApplication[]> {
  const out = new Map<CategorieEquipement, ConditionApplication[]>();
  if (!conditions) return out;
  for (const c of conditions) {
    const bucket = out.get(c.categorie) ?? [];
    bucket.push(c);
    out.set(c.categorie, bucket);
  }
  return out;
}

type ResultatEquipements = {
  ok: boolean;
  declencheurs: EquipementMatching[];
  raison?: string;
};

function matchEquipements(
  o: ObligationPorteeParEquipement,
  equipements: EquipementMatching[],
): ResultatEquipements {
  const categoriesAcceptees = new Set<CategorieEquipement>(
    o.categoriesEquipement,
  );
  const conditions = conditionsParCategorie(o.conditions);

  const declencheurs: EquipementMatching[] = [];
  for (const eq of equipements) {
    if (!categoriesAcceptees.has(eq.categorie)) continue;
    const condsCategorie = conditions.get(eq.categorie) ?? [];
    const toutes = condsCategorie.every((c) => conditionSatisfaite(c, eq));
    if (toutes) declencheurs.push(eq);
  }

  if (declencheurs.length === 0) {
    // LIMITE CONNUE, non corrigée ici (ADR-022). Cette branche ne dit pas
    // POURQUOI l'obligation n'apparaît pas, et `evaluerObligation` rend `null`
    // juste après : l'obligation est écartée sans trace. Le mode *explain*
    // est donc explicatif pour ce qui s'applique, muet pour ce qui ne
    // s'applique pas — alors que « aucun appareil déclaré ne la déclenche »
    // et « vous n'y êtes pas soumis » sont deux informations différentes.
    //
    // Une première rédaction de ce chantier construisait ici un message. Il a
    // été retiré : aucun appelant ne le lisait, et du code qui calcule une
    // explication que personne n'affiche donne l'illusion que le trou est
    // bouché. Le combler suppose un canal de sortie — `determineObligations-
    // Applicables` ne rend que les retenues — et un écran qui s'en serve.
    // `matchTypologie` souffre du même défaut, en pire : son type de retour
    // ne prévoit aucune raison d'échec.
    return {
      ok: false,
      declencheurs: [],
    };
  }

  return {
    ok: true,
    declencheurs,
    raison: `équipement${declencheurs.length > 1 ? "s" : ""} déclenche${
      declencheurs.length > 1 ? "nt" : ""
    } la règle (${declencheurs.map((e) => e.libelle).join(", ")})`,
  };
}

// -----------------------------------------------------------------------------
// API publique
// -----------------------------------------------------------------------------

export function evaluerObligation(
  o: Obligation,
  etab: EtablissementMatching,
  equipements: EquipementMatching[],
): ObligationApplicable | null {
  const typo = matchTypologie(o.typologies, etab);
  if (!typo.ok) return null;

  // Analyse de cas EXHAUSTIVE sur le porteur, jamais une négation (ADR-023).
  //
  // Cette branche s'écrivait `if (!estPorteeParEquipement(o))` et concluait
  // `porteur: "etablissement"` en dur. Tant qu'il n'y avait que deux porteurs,
  // c'était exact. À l'arrivée du troisième, elle l'aurait capté et requalifié
  // en obligation d'établissement — sans erreur de compilation, sans test
  // rouge. Une négation attribue au cas précédent tout ce qu'on ajoutera
  // ensuite ; c'est ce qu'il fallait supprimer, pas seulement contourner.
  const porteur = porteurDe(o);

  // Porteur salarié : cette fonction ne peut PAS répondre, et rendre `null`
  // est la seule réponse honnête (ADR-023 § 1 bis).
  //
  // Elle reçoit un établissement et ses équipements. Or l'applicabilité d'un
  // titre dépend de ce qu'une PERSONNE fait — opérer au voisinage de pièces
  // nues sous tension, conduire un engin, travailler en hauteur — et ce fait
  // ne lui est pas transmis. Le déduire de la typologie reviendrait à réclamer
  // une attestation médicale à toute une entreprise de bureaux parce qu'elle a
  // un tableau électrique.
  //
  // Ces obligations existent bien : elles sont au catalogue, et leurs lignes
  // naissent des `TitreSalarie` déclarés par l'employeur, dans
  // `genererVerificationsDepuisTitres`. Les rendre ici les ferait aussi
  // apparaître dans le guide « Comprendre » chez des établissements qui n'en
  // doivent aucune — un faux positif que l'ADR-023 refuse explicitement.
  if (porteur === "salarie") return null;

  // Porteur établissement : aucun équipement ne déclenche, et l'absence
  // d'équipement déclaré ne fait pas disparaître l'obligation (ADR-022).
  // C'est tout l'objet de la branche — `PE 4 § 2` reste dû, via `PE 2 § 3`,
  // par les établissements qui n'ont rien déclaré.
  if (porteur === "etablissement") {
    const enContexte = (o.equipementsEnContexte ?? []).filter((c) =>
      equipements.some((e) => e.categorie === c),
    );
    const raisons = [...typo.raisons];
    raisons.push(
      "l'obligation porte sur l'établissement lui-même : elle ne dépend " +
        "d'aucun appareil déclaré",
    );
    if (enContexte.length > 0) {
      raisons.push(
        `installations déclarées concernées, à titre indicatif et non ` +
          `limitatif : ${enContexte.join(", ")}`,
      );
    }
    return {
      obligation: o,
      equipementsConcernes: [],
      porteur: "etablissement",
      raisons,
    };
  }

  // Reste le porteur équipement. Le rétrécissement est explicite : si une
  // quatrième valeur apparaissait sans branche, `estPorteeParEquipement`
  // rendrait `false` et l'obligation serait écartée — bruyamment absente
  // plutôt que silencieusement requalifiée.
  if (!estPorteeParEquipement(o)) return null;

  const eq = matchEquipements(o, equipements);
  if (!eq.ok) return null;

  const raisons = [...typo.raisons];
  if (eq.raison) raisons.push(eq.raison);

  return {
    obligation: o,
    equipementsConcernes: eq.declencheurs,
    porteur: "equipement",
    raisons,
  };
}

export type DetermineOptions = {
  /** Remplacement complet du référentiel par défaut — utile pour les tests. */
  obligations?: Obligation[];
};

export function determineObligationsApplicables(
  etab: EtablissementMatching,
  equipements: EquipementMatching[],
  options?: DetermineOptions,
): ObligationApplicable[] {
  const source = options?.obligations ?? obligationsConformite;
  const out: ObligationApplicable[] = [];
  for (const o of source) {
    const res = evaluerObligation(o, etab, equipements);
    if (res) out.push(res);
  }
  return out;
}
