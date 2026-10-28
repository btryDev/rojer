import type { SidebarItemId } from "@/components/layout/sidebar-nav";

/** L'en-tête qu'annonce le repli de chargement d'une page. */
export type RepliSection = {
  item: Exclude<SidebarItemId, "tableau">;
  titre?: string;
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
const REPLIS: Record<string, RepliSection> = {
  accessibilite: { item: "accessibilite" },
  actions: { item: "actions" },
  batiments: { item: "batiments" },
  calendrier: { item: "calendrier" },
  "carnet-sanitaire": { item: "carnet-sanitaire" },
  connecter: { item: "connecter" },
  controle: { item: "controle" },
  documents: { item: "documents" },
  duerp: { item: "duerp" },
  "duerp/import": { item: "duerp", titre: "Importer un DUERP" },
  equipe: { item: "equipe" },
  equipements: { item: "equipements" },
  "etats-permanents": { item: "etats-permanents" },
  "etats-permanents/en-cas-de": { item: "etats-permanents" },
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
export function repliDeChargement(pathname: string): RepliSection | null {
  const [racine, , ...suite] = pathname.split("/").filter(Boolean);
  if (racine !== "etablissements") return null;
  return REPLIS[suite.join("/")] ?? null;
}
