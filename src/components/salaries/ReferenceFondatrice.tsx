import { LegalBadge } from "@/components/ui-kit";
import type { ObligationPorteeParSalarie } from "@/lib/referentiels/conformite";

/**
 * Le premier article que le référentiel cite pour une obligation, en badge
 * quand il a une adresse Légifrance. Partagé par les deux cartes de la fiche
 * qui disent ce qui est dû — l'une ne doit pas citer autrement que l'autre.
 */
export function ReferenceFondatrice({
  obligation,
}: {
  obligation: ObligationPorteeParSalarie;
}) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-3">
      {obligation.referencesLegales.slice(0, 1).map((r) =>
        r.url ? (
          <LegalBadge
            key={r.article ?? r.reference}
            charte="board"
            reference={r.reference}
            href={r.url}
          />
        ) : (
          <span
            key={r.article ?? r.reference}
            className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-[color:var(--board-slate-soft)]"
          >
            § {r.reference}
          </span>
        ),
      )}
    </div>
  );
}
