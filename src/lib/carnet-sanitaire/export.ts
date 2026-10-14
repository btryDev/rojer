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
import { LABEL_RESEAU, LABEL_TYPE_POINT, libelleSeuils } from "./schema";
import type { TypePointReleve, TypeReseauEau } from "@prisma/client";

/** Le nombre de relevés par point que l'export lit (borne de la requête). */
export const NB_RELEVES_DU_DOSSIER = 10;

/**
 * 2026-10-14 (chantier § 5) : la ligne du type dit aussi OÙ est le point, et
 * les deux bornes de sa plage. ~~« seuil max » en eau froide, « seuil min »
 * sinon~~ : la borne ne se déduit plus du réseau, elle est stockée.
 */
export function lignesPointDeReleve(pt: {
  nom: string;
  localisation: string | null;
  typeReseau: TypeReseauEau;
  typePoint: TypePointReleve | null;
  seuilMinCelsius: number | null;
  seuilMaxCelsius: number | null;
  releves: { dateReleve: Date; temperatureCelsius: number; conforme: boolean }[];
}): string[] {
  const n = pt.releves.length;
  const ou = pt.typePoint ? LABEL_TYPE_POINT[pt.typePoint] : "type de point non précisé";
  return [
    `${pt.nom}${pt.localisation ? ` — ${pt.localisation}` : ""}`,
    `  Type : ${LABEL_RESEAU[pt.typeReseau]} · ${ou} · plage ${libelleSeuils(pt, (c) => formaterMesure(c, "°C", 0, 1))}`,
    n === 0
      ? "  Aucun relevé enregistré."
      : n === 1
        ? "  Dernier relevé :"
        : `  ${n} derniers relevés :`,
    ...pt.releves.map(
      (r) =>
        `    ${formaterDateFr(r.dateReleve)} · ${formaterMesure(r.temperatureCelsius, "°C", 1)} · ${r.conforme ? "dans la plage du point" : "HORS de la plage du point"}`,
    ),
  ];
}
