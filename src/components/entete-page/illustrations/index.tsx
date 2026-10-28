import type { ComponentType } from "react";

import type { SidebarItemId } from "@/components/layout/sidebar-nav";

import { aUneIllustration, type ItemIllustre } from "./liste";

import { IllustrationAccessibilite } from "./Accessibilite";
import { IllustrationCalendrier } from "./Calendrier";
import { IllustrationCarnetSanitaire } from "./CarnetSanitaire";
import { IllustrationConnecter } from "./Connecter";
import { IllustrationControle } from "./Controle";
import { IllustrationDocuments } from "./Documents";
import { IllustrationDuerp } from "./Duerp";
import { IllustrationEnPlace } from "./EnPlace";
import { IllustrationEquipe } from "./Equipe";
import { IllustrationEquipements } from "./Equipements";
import { IllustrationFiche } from "./Fiche";
import { IllustrationGuide } from "./Guide";
import { IllustrationPerimetre } from "./Perimetre";
import { IllustrationPermisFeu } from "./PermisFeu";
import { IllustrationPlanActions } from "./PlanActions";
import { IllustrationPlansPrevention } from "./PlansPrevention";
import { IllustrationPrescriptions } from "./Prescriptions";
import { IllustrationPrestataires } from "./Prestataires";
import { IllustrationRegistre } from "./Registre";
import { IllustrationZones } from "./Zones";

/**
 * L'illustration de chaque page d'entrée. Une page sans illustration rend
 * un en-tête sans colonne de droite.
 *
 * Le style est commun à toutes : trait noir d'épaisseur constante, aplats
 * noirs ponctuels, objets blancs en perspective isométrique, posés sur la
 * teinte de la section — pas de fond propre. Une seule animation par dessin
 * vectoriel (une image générée, comme celle du Calendrier, reste fixe),
 * jouée une fois au chargement (`ep-*` dans `globals.css`), aucune si le
 * visiteur a demandé moins de mouvement.
 */
const ILLUSTRATIONS: Record<ItemIllustre, ComponentType> = {
  calendrier: IllustrationCalendrier,
  actions: IllustrationPlanActions,
  "etats-permanents": IllustrationEnPlace,
  duerp: IllustrationDuerp,
  equipe: IllustrationEquipe,
  prescriptions: IllustrationPrescriptions,
  "permis-feu": IllustrationPermisFeu,
  "plan-prevention": IllustrationPlansPrevention,
  perimetre: IllustrationPerimetre,
  equipements: IllustrationEquipements,
  batiments: IllustrationZones,
  prestataires: IllustrationPrestataires,
  registre: IllustrationRegistre,
  accessibilite: IllustrationAccessibilite,
  "carnet-sanitaire": IllustrationCarnetSanitaire,
  documents: IllustrationDocuments,
  controle: IllustrationControle,
  guide: IllustrationGuide,
  fiche: IllustrationFiche,
  connecter: IllustrationConnecter,
};

export function IllustrationEnTete({ item }: { item: SidebarItemId }) {
  if (!aUneIllustration(item)) return null;
  const Dessin = ILLUSTRATIONS[item];
  return <Dessin />;
}
