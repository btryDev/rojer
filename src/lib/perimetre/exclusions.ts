// Ce que le produit écarte, et à quel titre il l'écarte.
//
// Trois statuts cohabitent, et la distinction est le fond du sujet (ADR-025
// § 8). Les confondre est la faute que ce module existe pour empêcher : dire
// « refusé » de ce qui est servi incomplètement ferait fuir un dirigeant que
// le produit sert très bien par ailleurs, et dire « servi partiellement » d'un
// régime refusé lui ferait croire qu'un dossier l'attend.
//
//  1. **Refusé à l'entrée** — le produit ne sait pas servir ce cas *du tout*
//     (ADR-031). ~~Deux cas, et deux seulement.~~ Trois depuis le 2026-09-26 :
//     la propriétaire a plafonné l'effectif de l'entreprise comme celui du
//     site (« c'est la limite de Rojer »). Projeté ci-dessous. [2026-10-18 :
//     trois refus de TAILLE et d'IGH ; le filtre à l'accueil du 2026-10-17
//     refuse en plus des types d'ERP (`etablissements/types-refuses.ts`,
//     ADR-031 amendée), ~~et ce module ne les sonde pas — point ouvert~~
//     [2026-10-18 : sondés aussi, `refusDuFiltreSondes`]. Sept en tout.]
//  2. **Servi partiellement et prévenu** — c'est `perimetre/couverture.ts`,
//     et rien d'autre. Ce module ne le redit pas : la page appelle les deux.
//  3. **Hors périmètre déclaré** — les articles que le dépouillement a lus et
//     dont aucune obligation d'exploitant ne découle, chacun rattaché à l'une
//     des quatre clés fermées de `referentiels/corpus/perimetre.ts`. Projeté
//     ci-dessous également.
//
// ⚠ CE MODULE NE DÉCLARE RIEN. Comme `couverture.ts`, il **projette** des
// sources qui existent — le schéma de création pour les refus, le corpus pour
// les exclusions. Un refus écrit ici en dur serait la troisième déclaration de
// ce que le produit sert, après le schéma et le module de couverture ; elle
// divergerait en silence le jour où la porte changerait, et personne ne le
// verrait puisque deux constantes ne peuvent pas se contredire par un test.
//
// D'où la forme surprenante de `refusAlEntree()` : il **interroge la porte**
// plutôt que de la décrire. ~~Deux dossiers-sondes sont soumis au schéma de
// création~~ ~~[2026-10-18 : sept dossiers-sondes sont soumis à deux schémas de
// création — six à celui de l'établissement, un à celui de l'entreprise]~~
// [2026-10-26 : sept dossiers-sondes sont soumis à LA porte de création, le
// schéma du parcours d'onboarding — les deux autres portes ont été retirées
// avec `/etablissements/nouveau` et `/entreprises/nouvelle`], et
// ce sont ses propres messages qui sont rendus. Si la règle
// disparaît du schéma, la sonde ne rend plus rien, et le test tombe — au lieu
// d'une page qui continuerait d'annoncer un refus que le produit ne fait plus.
// C'est le même geste qu'`obligationsSuspenduesAuPublicRecu`, qui rejoue le
// verdict du moteur au lieu de recopier ses seuils.
//
// Ce module a des arêtes sortantes au runtime (Zod, le corpus) : c'est
// justement pour cela qu'il n'est PAS dans `couverture.ts`, qui reste pur.

import { EFFECTIF_MAX } from "@/lib/etablissements/schema";
import { onboardingSchema } from "@/lib/onboarding/schema";
import { CORPUS, EXCLUSIONS } from "@/lib/referentiels/corpus";
import type { MotifExclusion } from "@/lib/referentiels/corpus";
import { nonPorte } from "./non-couverture";
import { REGLEMENT_IGH_NON_TRAITE } from "./couverture";

/* ─── 1. Ce qui est refusé à l'entrée ─────────────────────────────────── */

/** Les refus, nommés pour être cités — jamais pour être comptés. */
export type CleRefus =
  | "effectif"
  | "effectif_entreprise"
  | "erp_en_igh"
  // Le filtre à l'accueil (décisions de la propriétaire du 2026-10-17,
  // `etablissements/types-refuses.ts`, ADR-031 amendée le 2026-10-18).
  | "type_j"
  | "type_u"
  | "etablissements_speciaux"
  | "r_accueil_enfants";

export type RefusAlEntree = {
  cle: CleRefus;
  /** Le régime refusé, en une phrase. */
  regime: string;
  /**
   * Ce que la porte répond, mot pour mot.
   *
   * Rendu par le schéma, pas écrit ici : c'est la phrase que le dirigeant a
   * lue au moment du refus, et deux formulations pour un même refus lui
   * feraient croire à deux règles.
   */
  message: string;
  /** Ce qu'il reste à faire — la moitié qu'un refus sec ne donne pas. */
  indication: string;
  /**
   * Les types d'ERP que ce refus nomme, quand il porte sur le type (filtre à
   * l'accueil). Un test soumet chaque type de GN 1 à la porte : l'ensemble des
   * types refusés doit être exactement l'union de ces listes.
   */
  types?: readonly string[];
};

/**
 * Un dossier que la porte accepte : chaque sonde n'en change qu'une chose.
 * Le SIRET est celui, public, du siège de l'INSEE.
 */
const DOSSIER_SONDE = {
  raisonSociale: "Sonde de périmètre",
  siret: "12002701600357",
  adresse: "1 rue de la Sonde, 75000 Paris",
  codeNaf: "56.10A",
  effectifSurSite: 1,
  effectifEntreprise: 1,
  personnesPresentesHabituellement: null,
  manipuleMatieresR422722: null,
  estEtablissementTravail: true,
  estERP: false,
  estIGH: false,
  estHabitation: false,
};

/**
 * La phrase que la porte oppose à un dossier-sonde, ou `null` si elle le
 * laisse passer.
 *
 * `null` n'est pas une erreur : c'est la réponse « cette règle n'existe plus ».
 * Elle doit remonter telle quelle jusqu'à l'appelant, et surtout pas être
 * remplacée par un texte de repli — un refus annoncé que la porte ne fait plus
 * est exactement le mensonge que ce module empêche.
 */
function messageDeLaPorte(
  dossier: Record<string, unknown>,
  champ: string,
): string | null {
  const r = onboardingSchema.safeParse(dossier);
  if (r.success) return null;
  return messageDuSeulChamp(r.error.issues, champ);
}

/**
 * Le message porté par `champ`, à condition qu'il soit la SEULE raison de
 * l'échec (revue du 2026-10-18). Une sonde ne change qu'une chose du dossier
 * accepté ; si la porte la refuse aussi pour un autre champ, la sonde est
 * cassée — elle mesurerait deux règles à la fois — et rend `null`, ce qui fait
 * tomber le test au lieu de masquer la seconde raison.
 */
function messageDuSeulChamp(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  champ: string,
): string | null {
  if (issues.some((i) => i.path[0] !== champ)) return null;
  return issues.find((i) => i.path[0] === champ)?.message ?? null;
}

/**
 * Les régimes que la création refuse, tels que la création les refuse.
 *
 * La liste est courte, et elle a été raccourcie en séance : un premier jet en
 * refusait une douzaine, la propriétaire l'a ramenée à deux le 2026-09-01
 * (ADR-031). Le critère qui a présidé est meilleur que celui qu'il remplace —
 * on refuse ce qu'on ne peut pas servir, pas ce qu'on ne couvre pas
 * entièrement. Une TPE qui manipule un agent CMR reste un employeur ordinaire
 * pour tout le reste ; lui fermer la porte lui retirerait tout au motif qu'on
 * ne lui donnerait pas tout.
 *
 * Rend moins de ~~deux~~ ~~[2026-10-18 : trois]~~ [2026-10-18 : sept, filtre à l'accueil compris] entrées si le schéma a cessé de refuser : c'est un fait à
 * faire remonter, pas à combler.
 */
export function refusAlEntree(): RefusAlEntree[] {
  const refus: RefusAlEntree[] = [];

  const effectif = messageDeLaPorte(
    { ...DOSSIER_SONDE, effectifSurSite: EFFECTIF_MAX + 1 },
    "effectifSurSite",
  );
  if (effectif !== null) {
    refus.push({
      cle: "effectif",
      regime: `Une structure de plus de ${EFFECTIF_MAX} travailleurs`,
      message: effectif,
      indication: `La borne compte les travailleurs, jamais le public reçu : un restaurant de huit salariés qui peut accueillir quatre cents personnes à la fois reste dans la cible. Au-delà, des obligations que cet outil ne porte pas s'ajoutent — ${nonPorte("le programme annuel de prévention des risques")}, notamment — et votre service de prévention et de santé au travail est le premier interlocuteur pour les cadrer. Un dossier déjà ouvert n'est jamais fermé s'il franchit le seuil en cours de route : il porte alors ce manque, écrit, dans la partie ci-dessous.`,
    });
  }

  // La même borne, sur l'effectif de l'ENTREPRISE (décision de la
  // propriétaire du 2026-09-26, ADR-031 : « c'est la limite de Rojer »).
  // ~~Interrogée sur SA porte — la création d'une entreprise~~ [2026-10-26 :
  // une entreprise naît avec son premier établissement, à la même porte que
  // les autres refus], pour que la page ne l'annonce que tant que la porte la
  // fait.
  const effectifEntreprise = messageDeLaPorte(
    { ...DOSSIER_SONDE, effectifEntreprise: EFFECTIF_MAX + 1 },
    "effectifEntreprise",
  );
  if (effectifEntreprise !== null) {
    refus.push({
      cle: "effectif_entreprise",
      regime: `Une entreprise de plus de ${EFFECTIF_MAX} salariés, tous établissements confondus`,
      message: effectifEntreprise,
      indication: `La borne vaut pour l'entreprise comme pour chacun de ses sites : les seuils qui changent la nature des obligations se comptent sur l'entreprise. Au-delà, des obligations que cet outil ne porte pas s'ajoutent — ${nonPorte("le programme annuel de prévention des risques")}, notamment — et votre service de prévention et de santé au travail est le premier interlocuteur pour les cadrer. Un dossier déjà ouvert n'est jamais fermé si l'entreprise franchit le seuil en cours de route : il porte alors ce manque, écrit, dans la partie ci-dessous.`,
    });
  }

  const erpEnIgh = messageDeLaPorte(
    {
      ...DOSSIER_SONDE,
      estERP: true,
      typeErp: "N",
      categorieErp: "N5",
      // Dû à un ERP de 5ᵉ catégorie depuis le 2026-09-20. Sans lui la sonde
      // échouerait pour DEUX raisons, et « chaque sonde n'en change qu'une
      // chose » cesserait d'être vrai.
      personnesPresentesHabituellement: 30,
      estIGH: true,
    },
    "estIGH",
  );
  if (erpEnIgh !== null) {
    refus.push({
      cle: "erp_en_igh",
      regime:
        "Un établissement recevant du public situé dans un immeuble de grande hauteur",
      message: erpEnIgh,
      // ~~« seul l'article GH 5 a été lu […] les obligations du règlement IGH
      // pèsent sur l'exploitant de l'immeuble, pas sur lui »~~ — faux des
      // deux bouts, rayé le 2026-10-12 (audit) : le corpus lit six articles
      // (GH 4, GH 5, GH 61, GH 66, GH U 16, GH W 5), et GH 61 § 5 comme
      // GH W 5 § 2 visent les OCCUPANTS. La même page le disait plus bas, à
      // l'établissement servi dans une tour. La phrase est désormais la sienne.
      indication: `${REGLEMENT_IGH_NON_TRAITE} L'IGH seul, lui, n'est pas refusé : un employeur installé dans une tour relève du Code du travail, que le produit sert, hormis ce qui précède. C'est le cumul avec l'accueil du public qui ferme la porte.`,
    });
  }

  refus.push(...refusDuFiltreSondes());
  return refus;
}

/**
 * Le filtre à l'accueil (2026-10-17), sondé sur la même porte que les trois
 * refus de taille et d'IGH. Jusqu'au 2026-10-18 ce module ne le sondait pas,
 * et l'annexe du document de relecture annonçait trois refus quand la porte
 * en faisait sept.
 *
 * Chaque sonde est un ERP de 5ᵉ catégorie que la porte accepte sous le type N,
 * et n'en change que le type — plus, pour J, U et R, la réponse « non » à la
 * question du sommeil, que ces types déclenchent : sans elle, la sonde
 * échouerait pour deux raisons.
 */
const ERP_SONDE = {
  ...DOSSIER_SONDE,
  estERP: true,
  typeErp: "N",
  categorieErp: "N5",
  personnesPresentesHabituellement: 30,
};

/** Ce qui reste vrai d'un dossier ouvert avant le filtre, dit une fois. */
const AVANT_LE_FILTRE =
  "Un dossier ouvert avant ce refus n'est pas fermé : la porte ne refuse que ce qui entre.";

function refusDuFiltreSondes(): RefusAlEntree[] {
  const refus: RefusAlEntree[] = [];
  const sonde = (d: Record<string, unknown>, champ: string) =>
    messageDeLaPorte({ ...ERP_SONDE, ...d }, champ);

  const j = sonde({ typeErp: "J", comporteLocauxSommeilPublic: false }, "typeErp");
  if (j !== null) {
    refus.push({
      cle: "type_j",
      types: ["J"],
      regime: "Une structure d'accueil pour personnes âgées ou handicapées (ERP de type J)",
      message: j,
      indication: `Les dispositions particulières de ce type, au règlement de sécurité, et les textes propres à l'accueil de ces personnes ne sont pas suivis par Rojer. La commission de sécurité qui a classé l'établissement est le premier interlocuteur pour les cadrer. ${AVANT_LE_FILTRE}`,
    });
  }

  const u = sonde({ typeErp: "U", comporteLocauxSommeilPublic: false }, "typeErp");
  if (u !== null) {
    refus.push({
      cle: "type_u",
      types: ["U"],
      regime: "Un établissement de soins (ERP de type U)",
      message: u,
      indication: `Les dispositions particulières de ce type, au règlement de sécurité, et les textes propres aux établissements de soins ne sont pas suivis par Rojer. La commission de sécurité qui a classé l'établissement est le premier interlocuteur pour les cadrer. ${AVANT_LE_FILTRE}`,
    });
  }

  const speciaux = sonde({ typeErp: "PA" }, "typeErp");
  if (speciaux !== null) {
    refus.push({
      cle: "etablissements_speciaux",
      types: ["PA", "CTS", "SG", "OA", "REF", "GA", "EF"],
      regime:
        "Un établissement spécial : plein air (PA), chapiteau ou tente (CTS), structure gonflable (SG), hôtel-restaurant d'altitude (OA), refuge de montagne (REF), gare (GA), établissement flottant (EF)",
      message: speciaux,
      indication: `Ces établissements relèvent de dispositions propres que Rojer n'a pas lues. Les parcs de stationnement couverts (PS), établissements spéciaux eux aussi, sont acceptés. ${AVANT_LE_FILTRE}`,
    });
  }

  const enfants = sonde(
    { typeErp: "R", comporteLocauxSommeilPublic: false, accueilEnfants: "oui" },
    "accueilEnfants",
  );
  if (enfants !== null) {
    refus.push({
      cle: "r_accueil_enfants",
      regime: "Un établissement d'enseignement ou d'accueil (type R) qui accueille des enfants : crèche, école, centre de loisirs",
      message: enfants,
      indication: `L'accueil d'enfants relève d'obligations propres à d'autres codes que Rojer ne suit pas. Un établissement de type R qui ne forme que des adultes est accepté : la question n'est posée qu'au type R. ${AVANT_LE_FILTRE}`,
    });
  }

  return refus;
}

/* ─── 3. Ce qui est hors périmètre déclaré ────────────────────────────── */

export type ArticleEcarte = {
  /** Le corpus d'où il vient, pour situer le texte. */
  corpus: string;
  /**
   * L'identifiant du corpus — stable, là où l'intitulé se renomme (2026-10-17,
   * ADR-046 : la clé de parité page ↔ PDF le lit).
   */
  corpusId: string;
  /** La référence telle qu'elle se cite : « PE 8 », « R. 4226-5 ». */
  ref: string;
  intitule?: string;
  /** Ce que la lecture a conclu, quand elle l'a écrit. */
  motif?: string;
};

export type ExclusionDeclaree = {
  cle: MotifExclusion;
  /** Le libellé du corpus, cité et non réécrit. */
  libelle: string;
  /** Le motif du corpus, cité et non réécrit. */
  motif: string;
  /** Les articles lus que cette exclusion écarte. Peut être vide. */
  articles: ArticleEcarte[];
};

/**
 * Les quatre exclusions déclarées, avec les articles que chacune écarte.
 *
 * Les quatre sont rendues, **y compris celles qui n'écartent encore aucun
 * article**, et c'est délibéré : l'exclusion est la déclaration, l'article
 * n'en est que la preuve. Ne rendre que les exclusions peuplées ferait
 * disparaître de la page une frontière que le produit revendique, au seul
 * motif que le dépouillement ne l'a pas encore rencontrée.
 *
 * Ni libellé ni motif ne sont réécrits ici : ils ont été rédigés par la
 * personne qui a posé l'exclusion, et une reformulation vieillirait à part de
 * sa source. C'est la règle que suit déjà
 * `docs/couverture-declaree-du-produit.md` § 3.
 *
 * ⚠ « Hors périmètre » ne dit JAMAIS « on a choisi de ne pas s'en occuper ».
 * Il dit « aucune obligation d'exploitant n'en découle ». Un manque assumé se
 * marque `non_couvert`, se compte, et n'entre pas ici — les confondre ferait
 * passer une dette pour une non-question.
 */
export function exclusionsDeclarees(): ExclusionDeclaree[] {
  return (Object.keys(EXCLUSIONS) as MotifExclusion[]).map((cle) => ({
    cle,
    libelle: EXCLUSIONS[cle].libelle,
    motif: EXCLUSIONS[cle].motif,
    articles: CORPUS.flatMap((c) =>
      c.articles.flatMap((a) =>
        a.statut === "hors_perimetre" && a.exclusion === cle
          ? [
              {
                corpus: c.intitule,
                corpusId: c.id,
                ref: a.ref,
                intitule: a.intitule,
                motif: a.motif,
              },
            ]
          : [],
      ),
    ),
  }));
}
