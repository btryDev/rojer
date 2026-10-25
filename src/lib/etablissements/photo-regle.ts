import type { RegleDepot } from "@/lib/rapports/validator";

/**
 * Ce que la photo d'un établissement accepte : JPEG ou PNG, 2 Mo au plus.
 *
 * 2 Mo, et non les 20 Mo d'un rapport : la photo est ré-encodée côté
 * navigateur à 1600 px au plus (`CartePhoto`), ce qui donne quelques
 * centaines de Ko ; la borne du serveur tient si ce ré-encodage est contourné.
 * Partagée par l'action (serveur) et le formulaire (client), d'où ce module
 * sans dépendance.
 */
export const REGLE_PHOTO: RegleDepot = {
  types: ["image/jpeg", "image/png"],
  tailleMax: 2 * 1024 * 1024,
};

/** Le côté le plus long de la photo ré-encodée par le navigateur. */
export const COTE_MAX_PHOTO = 1600;
