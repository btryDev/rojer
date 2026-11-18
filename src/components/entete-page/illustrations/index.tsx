import type { ComponentType } from "react";
import type { StaticImageData } from "next/image";

import accessibilite from "@/assets/entetes/accessibilite.webp";
import calendrier from "@/assets/entetes/calendrier.webp";
import carnetSanitaire from "@/assets/entetes/carnet-sanitaire.webp";
import duerp from "@/assets/entetes/duerp.webp";
import enPlace from "@/assets/entetes/en-place.webp";
import equipe from "@/assets/entetes/equipe.webp";
import equipements from "@/assets/entetes/equipements.webp";
import permisFeu from "@/assets/entetes/permis-feu.webp";
import planActions from "@/assets/entetes/plan-actions.webp";
import planPrevention from "@/assets/entetes/plan-prevention.webp";
import prescriptions from "@/assets/entetes/prescriptions.webp";
import prestataires from "@/assets/entetes/prestataires.webp";
import registre from "@/assets/entetes/registre.webp";

import type { SidebarItemId } from "@/components/layout/sidebar-nav";

import { ImageEnTete } from "./ImageEnTete";
import { aUneIllustration, type ItemIllustre } from "./liste";

import { IllustrationConnecter } from "./Connecter";
import { IllustrationControle } from "./Controle";
import { IllustrationDocuments } from "./Documents";
import { IllustrationFiche } from "./Fiche";
import { IllustrationGuide } from "./Guide";
import { IllustrationPerimetre } from "./Perimetre";
import { IllustrationZones } from "./Zones";

/**
 * L'illustration de chaque page d'entrée. Une page sans illustration rend
 * un en-tête sans colonne de droite. Toutes se posent sur la teinte de la
 * section, sans fond propre.
 *
 * Deux familles : une image générée (`ImageEnTete`, fixe — scène sans texte
 * ni tampon, `src/assets/entetes/`), ou un dessin SVG (`CadreIllustration` :
 * trait noir, objets blancs en isométrique, une animation `ep-*` jouée une
 * fois, aucune si le visiteur a demandé moins de mouvement).
 */
const ILLUSTRATIONS: Record<ItemIllustre, StaticImageData | ComponentType> = {
  calendrier, // l'éphéméride du 1er février et son extincteur
  actions: planActions, // le porte-bloc, trois actions dont deux cochées
  "etats-permanents": enPlace, // le tableau d'affichage
  duerp, // trois risques cotés, un crayon
  equipe, // trois badges et les pictogrammes de leurs titres
  prescriptions, // la lettre reçue, un paragraphe surligné
  "permis-feu": permisFeu, // le permis signé sur son porte-bloc
  "plan-prevention": planPrevention, // deux entreprises, la zone, deux signatures
  perimetre: IllustrationPerimetre,
  equipements, // le local technique, chaque appareil étiqueté
  batiments: IllustrationZones,
  prestataires, // le fichier rotatif des métiers
  registre, // le registre ouvert, un rapport inséré
  accessibilite, // l'entrée vitrée, sa rampe, l'affiche QR
  "carnet-sanitaire": carnetSanitaire, // la sonde dans le jet, le carnet
  documents: IllustrationDocuments,
  controle: IllustrationControle,
  guide: IllustrationGuide,
  fiche: IllustrationFiche,
  connecter: IllustrationConnecter,
};

export function IllustrationEnTete({ item }: { item: SidebarItemId }) {
  if (!aUneIllustration(item)) return null;
  const illustration = ILLUSTRATIONS[item];
  if (typeof illustration !== "function") return <ImageEnTete image={illustration} />;
  const Dessin = illustration;
  return <Dessin />;
}
