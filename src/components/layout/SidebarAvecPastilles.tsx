import { Suspense, type ComponentProps } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { getEtatModules } from "@/lib/etablissements/modules";
import { chargerSidebarCounts } from "@/lib/navigation/sidebar-counts";

type Props = {
  etablissement: ComponentProps<typeof AppSidebar>["etablissement"] & { estERP: boolean };
};

/**
 * La barre latérale d'un établissement, sans attendre ses pastilles (plan
 * performance, lot 3, 2026-10-29).
 *
 * Les pastilles et l'état des registres se lisent en une vingtaine de
 * requêtes. Le layout les attendait avant de rendre quoi que ce soit : sur un
 * chargement complet de page, rien ne s'affichait tant qu'elles n'étaient pas
 * lues, et la page elle-même attendait derrière. Désormais la barre s'affiche
 * tout de suite, sans pastilles et inerte (`enAttente`), la page se rend en
 * même temps, et la barre complète la remplace dès que ses lectures sont
 * faites. Inerte : aucun panneau ne peut s'ouvrir pendant l'attente, donc le
 * remplacement ne referme rien et ne réordonne rien sous le curseur.
 *
 * Le shell DUERP n'en profite pas encore : sans `loading.tsx` sous
 * `/duerp/[id]`, sa page bloque le premier envoi, et la barre sans pastilles
 * s'y montrerait sans rien faire gagner. Il garde sa lecture attendue — mêmes
 * chargeurs, donc mêmes nombres (ADR-015).
 */
export function SidebarAvecPastilles({ etablissement }: Props) {
  return (
    <Suspense fallback={<AppSidebar etablissement={etablissement} enAttente />}>
      <SidebarComplete etablissement={etablissement} />
    </Suspense>
  );
}

/** Exporté pour les tests. */
export async function SidebarComplete({ etablissement }: Props) {
  const lues = await lirePastilles(etablissement).catch((erreur: unknown) => {
    // La page est déjà affichée : une lecture de pastille en échec ne doit
    // pas la remplacer par l'écran d'erreur. La barre reste, utilisable, sans
    // pastilles ; l'erreur part au journal.
    console.error("Pastilles de la barre latérale illisibles", erreur);
    return null;
  });
  return (
    <AppSidebar etablissement={etablissement} counts={lues?.counts} modules={lues?.modules} />
  );
}

async function lirePastilles(etablissement: Props["etablissement"]) {
  const [counts, modules] = await Promise.all([
    chargerSidebarCounts(etablissement.id),
    getEtatModules(etablissement.id, etablissement.estERP),
  ]);
  return { counts, modules };
}
