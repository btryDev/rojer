import { segmentsSousEtablissement } from "@/lib/navigation/provenance";

import type { CadreEnTeteProps } from "./CadreEnTete";

/** L'en-tête qu'annonce le repli de chargement d'une page. */
export type RepliSection = Pick<CadreEnTeteProps, "item" | "titre"> & {
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
