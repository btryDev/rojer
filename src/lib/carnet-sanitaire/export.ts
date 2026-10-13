/**
 * Les lignes d'un point de relevé dans la pièce « carnet sanitaire » de
 * l'export contrôle — le ZIP remis à un tiers.
 *
 * Sorties de la route le 2026-10-13 pour être testées : le contrôle visuel du
 * jour y relevait deux défauts qu'aucun test ne pouvait voir.
 *
 *   - « 10 derniers relevés : » suivi de SIX relevés. Le 10 était la borne de
 *     la requête, écrite en dur dans le texte ; le libellé dit désormais le
 *     nombre réellement listé.
 *   - « Type : ECS_BOUCLAGE », l'énumération brute de la base. Le document dit
 *     le libellé de l'écran (`LABEL_RESEAU`), « ECS — bouclage ».
 */
import { formaterDateFr } from "@/lib/dates";
import { formaterMesure } from "@/lib/rendu/mesures";
import { LABEL_RESEAU } from "./schema";
import type { TypeReseauEau } from "@prisma/client";

/** Le nombre de relevés par point que l'export lit (borne de la requête). */
export const NB_RELEVES_DU_DOSSIER = 10;

export function lignesPointDeReleve(pt: {
  nom: string;
  localisation: string | null;
  typeReseau: TypeReseauEau;
  seuilMinCelsius: number;
  releves: { dateReleve: Date; temperatureCelsius: number; conforme: boolean }[];
}): string[] {
  const n = pt.releves.length;
  return [
    `${pt.nom}${pt.localisation ? ` — ${pt.localisation}` : ""}`,
    `  Type : ${LABEL_RESEAU[pt.typeReseau]} · seuil ${pt.typeReseau === "EFS" ? "max" : "min"} ${formaterMesure(pt.seuilMinCelsius, "°C", 0, 1)}`,
    n === 0
      ? "  Aucun relevé enregistré."
      : n === 1
        ? "  Dernier relevé :"
        : `  ${n} derniers relevés :`,
    ...pt.releves.map(
      (r) =>
        `    ${formaterDateFr(r.dateReleve)} · ${formaterMesure(r.temperatureCelsius, "°C", 1)} · ${r.conforme ? "au seuil du point" : "HORS du seuil du point"}`,
    ),
  ];
}
