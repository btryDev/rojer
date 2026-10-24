import type { StatutAction } from "@prisma/client";
import { formaterDateCourteFr } from "@/lib/dates";
import { LIBELLE_POINT } from "@/lib/points-a-corriger/libelles";

/**
 * Sous un rapport du registre, les points qu'il a relevés et leur correction
 * (ADR-048, lot 3). Pour les installations électriques, R. 4226-19 veut sur
 * le registre « les justifications des travaux et modifications effectués
 * pour porter remède aux défectuosités constatées ». Un point abandonné
 * n'est pas une correction : il n'apparaît pas.
 */
export function PointsDuRapport({
  points,
  electricite,
}: {
  points: {
    id: string;
    libelle: string;
    statut: StatutAction;
    leveeLe: Date | null;
    leveeCommentaire: string | null;
    leveeFichierNom: string | null;
  }[];
  electricite: boolean;
}) {
  const affiches = points.filter((p) => p.statut !== "abandonnee");
  if (affiches.length === 0) return null;
  return (
    <ul className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
      {affiches.map((p) => (
        <li key={p.id}>
          <span className="font-semibold text-[color:var(--board-ink)]">
            {LIBELLE_POINT} : {p.libelle}
          </span>
          {" — "}
          {p.statut === "levee" && p.leveeLe
            ? `corrigé le ${formaterDateCourteFr(p.leveeLe)}${p.leveeCommentaire ? ` : ${p.leveeCommentaire}` : ""}${p.leveeFichierNom ? " (pièce jointe)" : ""}`
            : "à corriger"}
        </li>
      ))}
      {electricite && <li className="text-[12px]">Consigné au registre (art. R. 4226-19 du Code du travail).</li>}
    </ul>
  );
}
