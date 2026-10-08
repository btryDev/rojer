import {
  LIBELLE_POUR_INFORMATION,
  MENTION_POUR_INFORMATION,
} from "@/lib/referentiels/conformite/initiative";

/**
 * La mention d'une ligne à l'initiative de l'administration — la visite de la
 * commission de sécurité (C64, 2026-10-08).
 *
 * Même forme que `MentionAConfirmer` et `MentionContractuelle` : un marquage
 * qui n'existe qu'en un exemplaire ne s'oublie pas sur une surface. Le mot
 * court est visible ; la phrase complète est dans le `title` ET dans un
 * `sr-only` — un survol n'est pas une lecture.
 *
 * **Ardoise** : ni le rouge du retard, ni l'ambre de l'attention. C'est une
 * information, pas une échéance de l'exploitant.
 */
export function MentionPourInformation({ className = "" }: { className?: string }) {
  return (
    <span
      className={
        "inline-flex flex-none items-center rounded-full bg-[color:var(--board-slate-pale)] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--board-ink)] ring-1 ring-inset ring-[color:color-mix(in_oklch,var(--board-ink)_25%,transparent)] " +
        className
      }
      title={MENTION_POUR_INFORMATION}
    >
      <span aria-hidden>{LIBELLE_POUR_INFORMATION}</span>
      <span className="sr-only">{MENTION_POUR_INFORMATION}</span>
    </span>
  );
}
