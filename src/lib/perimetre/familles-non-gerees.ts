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
//    que `non-couverture.test.ts` confronte aux obligations ;
//  - promettre quoi que ce soit sur la dotation d'extincteurs de `R. 4227-29`,
//    qui est encodée (`incendie-travail-extincteurs-dotation`) : la famille
//    « équipements à prévoir » parle du type, de l'emplacement et du
//    dimensionnement, pas de la présence ;
//  - dire « accessibilité » seul — Rojer tient le registre public
//    d'accessibilité ; ce qu'il ne gère pas, c'est la mise en accessibilité du
//    bâtiment ;
//  - qualifier : ni « conforme », ni « en règle » (`sans-qualification.test.ts`).
//
// Module pur, sans dépendance hors `nonPorte`.

import { nonPorte } from "./non-couverture";

export type CleFamille =
  | "construction"
  | "equipements_a_prevoir"
  | "regles_de_conduite"
  | "risques_specialises"
  | "hors_sante_securite";

export type FamilleNonGeree = { cle: CleFamille; phrase: string };

/** Dans l'ordre d'affichage. */
export const FAMILLES_NON_GEREES: readonly FamilleNonGeree[] = [
  {
    cle: "construction",
    phrase: `Rojer ne suit pas ${nonPorte("les règles de construction et d'aménagement des locaux")} — dégagements, isolement, résistance au feu : elles relèvent du constructeur, de l'installateur et, pour un établissement recevant du public, de la commission de sécurité.`,
  },
  {
    cle: "equipements_a_prevoir",
    phrase: `Rojer ne choisit pas ${nonPorte("le type, l'emplacement et le dimensionnement des installations de sécurité")} : c'est l'affaire de l'installateur et, pour un établissement recevant du public, de la commission de sécurité ; Rojer part des équipements que vous déclarez.`,
  },
  {
    cle: "regles_de_conduite",
    phrase: `Rojer ne suit pas ${nonPorte("les interdictions et les règles de comportement qui ne demandent aucun geste daté")}, comme l'interdiction d'utiliser des bougies ou des ballons gonflés au gaz dans certains établissements recevant du public.`,
  },
  {
    cle: "risques_specialises",
    phrase: `Rojer ne suit pas ${nonPorte("les mesures de prévention propres aux risques spécialisés")} — amiante, plomb, radon, rayonnements ionisants —, ni ${nonPorte("les installations classées pour la protection de l'environnement")}.`,
  },
  {
    cle: "hors_sante_securite",
    phrase: `Rojer ne suit pas ${nonPorte("les obligations étrangères à la santé et à la sécurité")} : l'hygiène alimentaire, les affichages commerciaux, les licences, ${nonPorte("la mise en accessibilité du bâtiment")}, la gestion administrative du personnel, les assurances.`,
  },
];
