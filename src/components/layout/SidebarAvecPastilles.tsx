import { Suspense, type ComponentProps } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { getEtatModules } from "@/lib/etablissements/modules";
import { chargerSidebarCounts } from "@/lib/navigation/sidebar-counts";

type Props = {
  etablissement: ComponentProps<typeof AppSidebar>["etablissement"] & { estERP: boolean };
  /** L'entrée allumée, quand le chemin ne la donne pas (le shell DUERP). */
  active?: ComponentProps<typeof AppSidebar>["active"];
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
 * Elle sert le shell d'établissement et, depuis qu'il a son repli de
 * chargement (`duerp/[id]/loading.tsx`), le shell DUERP : mêmes chargeurs,
 * donc mêmes nombres (ADR-015).
 */
export function SidebarAvecPastilles({ etablissement, active }: Props) {
  return (
    <Suspense fallback={<AppSidebar etablissement={etablissement} active={active} enAttente />}>
      <SidebarComplete etablissement={etablissement} active={active} />
    </Suspense>
  );
}

/** Exporté pour les tests. */
export async function SidebarComplete({ etablissement, active }: Props) {
  const lues = await lirePastilles(etablissement).catch((erreur: unknown) => {
    // La page est déjà affichée : une lecture de pastille en échec ne doit
    // pas la remplacer par l'écran d'erreur. La barre reste, utilisable, sans
    // pastilles ; l'erreur part au journal.
    console.error("Pastilles de la barre latérale illisibles", erreur);
    return null;
  });
  return (
    <AppSidebar
      etablissement={etablissement}
      active={active}
      counts={lues?.counts}
      modules={lues?.modules}
    />
  );
}

async function lirePastilles(etablissement: Props["etablissement"]) {
  const [counts, modules] = await Promise.all([
    chargerSidebarCounts(etablissement.id),
    getEtatModules(etablissement.id, etablissement.estERP),
  ]);
  return { counts, modules };
}
