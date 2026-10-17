// « Ce que Rojer ne gère pas » — cinq familles, une phrase chacune (2026-10-17,
// ADR-046, plan validé par c6 et la propriétaire).
//
// POURQUOI DES FAMILLES. La page « Ce que Rojer ne couvre pas » listait
// quelque quatre cent cinquante articles écartés, un par un : « une liste de
// courses énorme » (la propriétaire). Les articles et leurs motifs vont à
// l'annexe du PDF du référentiel complet ; la page dit les FAMILLES. Les
// familles valent clause générale du § 7 de
// `docs/couverture-declaree-du-produit.md` (décision c6, Q2).
//
// LE DIRIGEANT N'A PAS ACCÈS AU PDF (Q1, propriétaire, 2026-10-17). Chaque
// phrase se suffit donc à elle-même : jamais « voir le document », jamais
// « détaillé ailleurs ».
//
// CE QUE CES PHRASES NE FONT JAMAIS :
//  - démentir le référentiel — chaque chose non gérée passe par `nonPorte(…)`,
//    que `non-couverture.test.ts` confronte aux obligations. TOUT ÉLÉMENT
//    D'UNE ÉNUMÉRATION aussi [2026-10-17, revue indépendante : « rayonnements
//    ionisants », écrit hors du marqueur, était démenti par le suivi renforcé
//    de catégorie A sans que rien le voie] : une énumération ne s'écrit que
//    dans `liste`, dont chaque élément est un `nonPorte(…)`, et
//    `familles-non-gerees.test.ts` refuse une énumération écrite ailleurs ;
//  - promettre quoi que ce soit sur la dotation d'extincteurs de `R. 4227-29`
//    ni sur la détention du défibrillateur, qui sont encodées : la famille
//    « équipements » dit que Rojer ne CONÇOIT pas les installations,
//    ~~« le type, l'emplacement et le dimensionnement »~~ [2026-10-17, revue :
//    le type et l'emplacement touchaient ces deux lignes] ;
//  - dire « accessibilité » seul — Rojer tient le registre public
//    d'accessibilité ; ce qu'il ne gère pas, c'est la mise en accessibilité du
//    bâtiment ;
//  - qualifier : ni « conforme », ni « en règle » (`sans-qualification.test.ts`).
//
// ~~Première rédaction (2026-10-17, `da1df8cf`)~~ — rayée le même jour après la
// revue indépendante : la famille « risques spécialisés » nommait amiante,
// plomb, radon et rayonnements ionisants hors de `nonPorte`, ce que le suivi
// renforcé dément ; les listes de « construction » et « hors santé-sécurité »
// étaient écrites hors du marqueur ; « ballons gonflés au gaz » ne disait pas
// le gaz inflammable de `M 36`.
//
// Module pur, sans dépendance hors `nonPorte` et `porte`.

import { nonPorte, porte } from "./non-couverture";

export type CleFamille =
  | "construction"
  | "equipements_a_prevoir"
  | "regles_de_conduite"
  | "risques_specialises"
  | "hors_sante_securite";

export type FamilleNonGeree = {
  cle: CleFamille;
  phrase: string;
  /**
   * L'énumération que la phrase porte, élément par élément, chacun écrit par
   * `nonPorte`. Vide quand la phrase n'énumère rien.
   */
  liste: readonly string[];
};

/** « a, b et c » — « ou » au besoin. */
export function enumerer(liste: readonly string[], conjonction = "et"): string {
  if (liste.length <= 1) return liste.join("");
  return `${liste.slice(0, -1).join(", ")} ${conjonction} ${liste[liste.length - 1]}`;
}

const CONSTRUCTION = [
  nonPorte("le dimensionnement des dégagements"),
  nonPorte("l'isolement entre locaux"),
  nonPorte("la résistance au feu des matériaux"),
] as const;

const CONDUITE = [
  nonPorte("des bougies"),
  nonPorte("des ballons gonflés avec un gaz inflammable"),
] as const;

// Le motif de l'exclusion `risque_specialise` (`corpus/perimetre.ts`), élément
// par élément.
const RISQUES = [
  nonPorte("les installations classées soumises à autorisation"),
  nonPorte("les atmosphères explosives"),
  nonPorte("la radioprotection"),
  nonPorte("les piscines"),
  nonPorte("les bains à remous"),
  nonPorte("les appareils de bronzage UV"),
] as const;

const HORS_SST = [
  nonPorte("l'hygiène alimentaire"),
  nonPorte("les affichages commerciaux"),
  nonPorte("les licences"),
  nonPorte("la mise en accessibilité du bâtiment"),
  nonPorte("la gestion administrative du personnel"),
  nonPorte("les assurances"),
] as const;

/** Dans l'ordre d'affichage. */
export const FAMILLES_NON_GEREES: readonly FamilleNonGeree[] = [
  {
    cle: "construction",
    liste: CONSTRUCTION,
    phrase: `Rojer ne suit pas ${nonPorte("les règles de construction et d'aménagement des locaux")} — ${enumerer(CONSTRUCTION)} : elles relèvent du constructeur et, pour un établissement recevant du public, de la commission de sécurité.`,
  },
  {
    cle: "equipements_a_prevoir",
    liste: [],
    phrase: `Rojer ne conçoit pas vos installations de sécurité : ${nonPorte("leur choix et leur dimensionnement")} relèvent de l'installateur et, pour un établissement recevant du public, de la commission de sécurité ; Rojer part des équipements que vous déclarez.`,
  },
  {
    cle: "regles_de_conduite",
    liste: CONDUITE,
    phrase: `Rojer ne suit pas ${nonPorte("les interdictions et les règles de comportement qui ne demandent aucun geste daté")}, comme l'interdiction ${enumerer(CONDUITE, "ou")} dans certains établissements recevant du public.`,
  },
  {
    cle: "risques_specialises",
    liste: RISQUES,
    phrase: `Rojer ne suit pas les mesures de prévention propres aux risques spécialisés — ${enumerer(RISQUES)} ; il tient en revanche ${porte("le suivi individuel renforcé")} de chaque salarié dont vous déclarez le titre.`,
  },
  {
    cle: "hors_sante_securite",
    liste: HORS_SST,
    phrase: `Rojer ne suit pas ${nonPorte("les obligations étrangères à la santé et à la sécurité")} : ${enumerer(HORS_SST)}.`,
  },
];
