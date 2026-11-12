"use client";

import { usePathname } from "next/navigation";
import { WizardSteps, type Etape } from "./WizardSteps";
import type { EtapeId } from "@/lib/duerps/etapes";


/**
 * Le fil des étapes, posé une fois par la mise en page du DUERP dans le pied
 * de l'en-tête (2026-11-12). La mise en page ne connaît pas la page ouverte :
 * elle calcule le fil pour chacune, et ce composant choisit sur l'adresse
 * (`/duerp/[id]/<page>/…`). Hors des étapes (aperçu PDF, versions), rien.
 */
export function FilDuDuerp({
  etapesParPage,
}: {
  etapesParPage: Record<EtapeId, Etape[]>;
}) {
  const segment = usePathname().split("/")[3] as EtapeId | undefined;
  if (!segment || !(segment in etapesParPage)) return null;
  return <WizardSteps etapes={etapesParPage[segment]} />;
}
