import { LegalBadge, ReferenceSansLien } from "@/components/ui-kit";
import type { ReferenceLegale } from "@/lib/referentiels/conformite";

/**
 * Le premier article que le référentiel cite pour une obligation, en badge
 * quand il a une adresse Légifrance. Partagé par les deux cartes de la fiche
 * qui disent ce qui est dû — l'une ne doit pas citer autrement que l'autre.
 */
export function ReferenceFondatrice({
  obligation,
  article,
}: {
  obligation: { referencesLegales: readonly ReferenceLegale[] };
  /**
   * L'article à citer quand ce n'est pas le premier (ADR-043) : le délai
   * d'entrée de la VIP est fondé par `R. 4624-10`, cité second. Introuvable,
   * on retombe sur le premier.
   */
  article?: string;
}) {
  const refs = obligation.referencesLegales;
  const choisie = refs.find((r) => article !== undefined && r.article === article) ?? refs[0];
  // Un titre dont l'obligation a quitté le référentiel n'a plus de référence.
  if (!choisie) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {[choisie].map((r) =>
        r.url ? (
          // Compacte (refonte de la fiche, 2026-10-24) : l'article seul sur le
          // bouton, son intitulé en tête du panneau. L'intitulé en capitales
          // prenait plus de place que la ligne qu'il fonde.
          <LegalBadge
            key={r.article ?? r.reference}
            reference={r.reference}
            href={r.url}
            libelle={r.article ?? r.reference}
          />
        ) : (
          <ReferenceSansLien key={r.article ?? r.reference} reference={r.reference} />
        ),
      )}
    </div>
  );
}
