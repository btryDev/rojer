/**
 * La mention d'une ligne retenue par prudence : la fiche ne dit pas, donc la
 * ligne s'affiche (règle du non-renseigné, ADR-022 § 7).
 *
 * Même forme que `MentionContractuelle`, et pour la même raison : un marquage
 * qui n'existe qu'en un exemplaire ne s'oublie pas sur une surface. Le mot
 * court est visible ; les phrases complètes sont dans le `title` ET dans un
 * `sr-only` — un survol n'est pas une lecture.
 *
 * **Ardoise, pas ambre ni rouge** : l'ambre dit l'engagement contractuel et
 * l'échéance proche, le rouge le retard. Une ligne « à confirmer » n'est ni
 * l'un ni l'autre — c'est une question sans réponse. Voile cerné, comme toute
 * annotation (`docs/charte-board.md` § 1.5).
 */
export function MentionAConfirmer({
  phrases,
  className = "",
}: {
  phrases: readonly string[];
  className?: string;
}) {
  if (phrases.length === 0) return null;
  const complet = phrases.join(" ");
  return (
    <span
      className={
        "inline-flex flex-none items-center rounded-full bg-[color:var(--board-slate-pale)] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--board-ink)] ring-1 ring-inset ring-[color:color-mix(in_oklch,var(--board-ink)_25%,transparent)] " +
        className
      }
      title={complet}
    >
      <span aria-hidden>À confirmer</span>
      <span className="sr-only">À confirmer. {complet}</span>
    </span>
  );
}
