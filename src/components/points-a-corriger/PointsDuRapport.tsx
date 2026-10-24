import { formaterDateCourteFr } from "@/lib/dates";
import {
  LIBELLE_POINT,
  MENTION_R4226_19,
  texteDuPoint,
  versPointDuRapport,
} from "@/lib/points-a-corriger/libelles";

/**
 * Sous un rapport du registre, les points qu'il a relevés et leur correction
 * (ADR-048, lot 3). Pour les installations électriques, R. 4226-19 veut sur
 * le registre « les justifications des travaux et modifications effectués
 * pour porter remède aux défectuosités constatées ». Même ligne que le PDF
 * (`versPointDuRapport`, `texteDuPoint`).
 */
export function PointsDuRapport({
  points,
  electricite,
}: {
  points: Parameters<typeof versPointDuRapport>[0][];
  electricite: boolean;
}) {
  const lignes = points.flatMap((p) => versPointDuRapport(p) ?? []);
  if (lignes.length === 0) return null;
  return (
    <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
      {lignes.map((p) => (
        <li key={p.id}>
          <span className="font-semibold text-[color:var(--board-ink)]">
            {LIBELLE_POINT} : {p.libelle}
          </span>
          {" — "}
          {texteDuPoint(p, formaterDateCourteFr)}
        </li>
      ))}
      {electricite && <li className="text-[12px]">{MENTION_R4226_19}</li>}
    </ul>
  );
}
