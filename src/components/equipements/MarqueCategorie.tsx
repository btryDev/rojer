// La marque d'une catégorie d'équipement — un pictogramme dans son carré.
//
// Elle a été trois choses successives. D'abord quinze PNG isométriques de
// ~130 Ko chargés sur chaque liste, dont deux catégories n'avaient jamais eu
// de dessin et retombaient sur une icône d'une autre famille graphique.
// Ensuite un monogramme de deux capitales, qui réglait le poids et la
// couverture mais demandait de retenir que « PA » est le portail et « PO »
// la porte — un second alphabet à apprendre, là où la liste en a déjà un.
//
// Ce qui reste garde du monogramme ce qui marchait — un seul carré, la
// même taille partout, `currentColor`, rien à télécharger — et lui rend ce
// qui lui manquait : le dessin de la chose. Le trait vient de lucide,
// l'alphabet du reste de l'application (rail, calendrier) ; les trois
// catégories que lucide ne dessine pas sont tracées à sa grille dans
// `pictos-categorie.tsx` plutôt que rapprochées d'une icône voisine.

import {
  AirVent,
  Barrel,
  BellElectric,
  CloudFog,
  CookingPot,
  DoorOpen,
  Droplets,
  Fan,
  FireExtinguisher,
  Forklift,
  Gauge,
  HardHat,
  Lightbulb,
  Package,
  Refrigerator,
  Shredder,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  PictoAscenseur,
  PictoHottePro,
  PictoPortailAuto,
} from "@/components/equipements/pictos-categorie";
import { LABEL_CATEGORIE_EQUIPEMENT } from "@/lib/equipements/labels";
import type { CategorieEquipement } from "@/lib/referentiels/types-communs";
import { cn } from "@/lib/utils";

/** Ce que la marque sait faire d'une icône : une taille, une épaisseur. */
type Picto = ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

/**
 * Un dessin par catégorie, choisi à la main. Deux règles ont tranché les
 * cas douteux :
 *
 * — **l'objet plutôt que le thème** : la catégorie nomme un équipement
 *   présent dans les murs, pas un domaine de risque. D'où le réfrigérateur
 *   et non le flocon, le manomètre et non le triangle de danger.
 * — **rien qui nomme déjà autre chose** : `Flame` est le permis de feu dans
 *   le rail et le calendrier, `Wrench` y est le module Équipements ;
 *   aucune des deux ne peut désigner ici un objet particulier. La cuisson
 *   ERP prend donc la casserole, et « autre » le colis.
 *
 * L'unicité est vérifiée par le test : deux catégories qui partagent un
 * dessin ne se distinguent plus dans une liste triée par catégorie.
 */
export const ICONE_CATEGORIE: Record<CategorieEquipement, Picto> = {
  // Le casque : le seul objet de la famille que tout le monde reconnaît de
  // loin. Il dit « ce qu'on porte », ce qui est exactement la ligne de partage
  // de cette catégorie — la protection collective reste à l'ouvrage.
  EPI: HardHat,
  INSTALLATION_ELECTRIQUE: Zap,
  INSTALLATION_FRIGORIFIQUE: Refrigerator,
  EXTINCTEUR: FireExtinguisher,
  // Un RIA se distingue de l'extincteur par son alimentation permanente en
  // eau — d'où la goutte, et non la bonbonne : deux dessins identiques
  // rendraient les deux lignes indiscernables dans une liste d'équipements.
  RIA: Droplets,
  BAES: Lightbulb,
  // Sonnerie d'alarme, et non la sirène : c'est le déclencheur manuel et le
  // bloc qui sonnent dans un ERP de 5e catégorie.
  ALARME_INCENDIE: BellElectric,
  // Le désenfumage évacue la fumée : c'est elle qu'on dessine. Le détecteur
  // (`AlarmSmoke`) dirait la détection, qui appartient à l'alarme.
  DESENFUMAGE: CloudFog,
  // Ventilation : l'hélice pour la VMC, la bouche pour la CTA. Les deux
  // brassent de l'air, seule la forme du terminal les sépare à l'œil.
  VMC: Fan,
  CTA: AirVent,
  HOTTE_PRO: PictoHottePro,
  APPAREIL_CUISSON_ERP: CookingPot,
  ASCENSEUR: PictoAscenseur,
  PORTE_AUTO: DoorOpen,
  PORTAIL_AUTO: PictoPortailAuto,
  EQUIPEMENT_SOUS_PRESSION: Gauge,
  STOCKAGE_MATIERE_DANGEREUSE: Barrel,
  EQUIPEMENT_LEVAGE: Forklift,
  // Le compacteur-presse : une machine debout dans laquelle on jette sa
  // matière par le haut. `Shredder` est le seul dessin de lucide qui montre
  // cet objet-là. Les deux voisins plausibles disent autre chose : `Container`
  // dessine la benne, que l'arrêté du 5 mars 1993 exclut expressément de cette
  // catégorie, et `Recycle` est un symbole de thème, pas un appareil présent
  // dans les murs — les deux règles de cette table le refusent.
  COMPACTEUR_PRESSE_DECHETS_MOTORISE: Shredder,
  AUTRE: Package,
};

const TON = {
  /** Sur papier : le carré d'encre de la maquette. */
  encre: "bg-[color:var(--board-ink)] text-white",
  /** Sur l'encre : le voile translucide, l'encre y serait invisible. */
  clair: "bg-white/10 text-white",
  /** Déjà posé dans un champ bleu : le dessin seul, sans second champ. */
  glacier: "text-[color:var(--board-blue-ink)]",
} as const;

/**
 * L'épaisseur du trait, en unités de la grille de 24 — donc **relative** à
 * la taille du dessin, comme chez lucide.
 *
 * Un trait fixe ne peut pas tenir de la pastille de liste (22 px) à la
 * vitrine du tableau de bord (57 px) : le 2 de lucide, à peine soutenu en
 * petit, s'épaissit en gros au point de boucher la casserole et le chariot.
 * La règle rend donc l'épaisseur apparente à peu près constante — autour de
 * 1,5 px à l'écran — avec deux butées : jamais plus fin que 1,15, sinon le
 * blanc sur l'encre se met à filer, jamais plus gras que 1,5.
 */
function trait(icone: number) {
  return Math.min(1.5, Math.max(1.15, 34 / icone));
}

export function MarqueCategorie({
  categorie,
  taille = 44,
  ton = "encre",
  className,
}: {
  /** `string` toléré : le bundle du tableau de bord ne porte pas le type
   *  étroit. Une valeur inconnue tombe sur le colis plutôt que sur du vide. */
  categorie: CategorieEquipement | string;
  taille?: number;
  ton?: keyof typeof TON;
  className?: string;
}) {
  const Icone =
    (ICONE_CATEGORIE as Partial<Record<string, Picto>>)[categorie] ?? Package;
  const label =
    (LABEL_CATEGORIE_EQUIPEMENT as Partial<Record<string, string>>)[
      categorie
    ] ?? "Catégorie inconnue";
  const icone = Math.round(taille * (ton === "glacier" ? 0.62 : 0.5));

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("inline-grid flex-none place-items-center", TON[ton], className)}
      style={{
        width: taille,
        height: taille,
        // Le rayon suit la taille : 15/44 est le rapport relevé sur la
        // maquette, et il tient de la pastille de liste au grand format.
        borderRadius: ton === "glacier" ? 0 : Math.round(taille * 0.34),
      }}
    >
      {/* Sans carré autour, le dessin peut occuper davantage : c'est lui
          qui tient la place, plus la pastille. */}
      <Icone size={icone} strokeWidth={trait(icone)} />
    </span>
  );
}
