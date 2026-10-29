import { Suspense, type ComponentProps } from "react";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { getEtatModules } from "@/lib/etablissements/modules";
import { chargerSidebarCounts } from "@/lib/navigation/sidebar-counts";

type Props = {
  etablissement: ComponentProps<typeof AppSidebar>["etablissement"] & { estERP: boolean };
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
 * tout de suite sans elles — ce qu'`AppSidebar` sait rendre —, la page se
 * rend en même temps, et la barre complète la remplace dès que ses lectures
 * sont faites.
 *
 * Le même composant sert le shell d'établissement et le shell DUERP : les
 * deux annoncent les mêmes nombres (ADR-015).
 */
export function SidebarAvecPastilles({ etablissement, active }: Props) {
  return (
    <Suspense fallback={<AppSidebar etablissement={etablissement} active={active} />}>
      <SidebarComplete etablissement={etablissement} active={active} />
    </Suspense>
  );
}

async function SidebarComplete({ etablissement, active }: Props) {
  const [counts, modules] = await Promise.all([
    chargerSidebarCounts(etablissement.id),
    getEtatModules(etablissement.id, etablissement.estERP),
  ]);
  return (
    <AppSidebar etablissement={etablissement} active={active} counts={counts} modules={modules} />
  );
}
