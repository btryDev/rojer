import { segmentsSousEtablissement } from "@/lib/navigation/provenance";

import type { RailCategorieId, SidebarItemId } from "@/components/layout/sidebar-nav";
import type { CadreEnTeteProps } from "./CadreEnTete";

/** L'en-tête qu'annonce le repli de chargement d'une page : une entrée du
 *  rail, ou — pour une page hors du rail, comme l'assistance (2026-11-24) —
 *  un titre et la section dont elle prend la teinte. */
export type RepliSection = (
  | Pick<Extract<CadreEnTeteProps, { item: SidebarItemId }>, "item" | "titre">
  | Pick<Extract<CadreEnTeteProps, { section: RailCategorieId }>, "item" | "titre" | "section">
) & {
  /** La page porte une bascule de vue sous son titre : le repli lui garde
   *  sa place, sans quoi l'en-tête grandirait à l'arrivée de la page. */
  bascule?: true;
};

/**
 * Les pages qui s'ouvrent sur `EnTetePage`, par leur chemin sous
 * `/etablissements/[id]/`. Toutes les autres — le tableau de bord, les fiches,
 * les formulaires — prennent le repli neutre : leur en-tête dépend de la
 * donnée.
 *
 * La garde `chargement-sections.test.ts` relit chaque page et vérifie que
 * cette table dit le même en-tête qu'elle.
 */
const REPLIS: Readonly<Record<string, RepliSection>> = {
  accessibilite: { item: "accessibilite" },
  actions: { item: "actions" },
  // La bascule « Poser une question / Rendez-vous annuel » : en formule Pro
  // seulement (ADR-063) — le repli ne connaît pas la formule, il la réserve.
  assistance: { item: "assistance", bascule: true },
  batiments: { item: "batiments" },
  calendrier: { item: "calendrier", bascule: true },
  "carnet-sanitaire": { item: "carnet-sanitaire" },
  connecter: { item: "connecter" },
  controle: { item: "controle" },
  documents: { item: "documents" },
  duerp: { item: "duerp" },
  "duerp/import": { item: "duerp", titre: "Importer un DUERP" },
  equipe: { item: "equipe" },
  equipements: { item: "equipements" },
  "etats-permanents": { item: "etats-permanents", bascule: true },
  "etats-permanents/en-cas-de": { item: "etats-permanents", bascule: true },
  guide: { item: "guide" },
  modifier: { item: "fiche" },
  perimetre: { item: "perimetre" },
  "permis-feu": { item: "permis-feu" },
  "plan-prevention": { item: "plan-prevention" },
  prescriptions: { item: "prescriptions" },
  prestataires: { item: "prestataires" },
  registre: { item: "registre" },
};

/** L'en-tête à annoncer pendant le chargement de `pathname`, ou `null` pour
 *  le repli neutre. */
export function repliDeChargement(
  pathname: string,
  etablissementId: string,
): RepliSection | null {
  const cle = segmentsSousEtablissement(pathname, etablissementId)?.join("/");
  // `hasOwn` : « constructor » ou « __proto__ » ne sont pas des pages.
  return cle !== undefined && Object.hasOwn(REPLIS, cle) ? REPLIS[cle] : null;
}
