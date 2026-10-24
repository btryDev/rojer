import type { PastilleRendezVous } from "@/lib/rendez-vous/regles";

/**
 * Le rendez-vous pris pour un contrôle (ADR-049), en pastille à côté de la
 * méta d'une ligne : la méta est tronquée, et un rendez-vous qui s'efface
 * quand le libellé est long manque là où il compte (même raison que
 * `MentionAConfirmer`). Le mot court est visible ; la phrase complète est
 * dans le `title` et en `sr-only`. Glacier, rose quand le rendez-vous est
 * passé sans rapport.
 */
export function MentionRendezVous({ pastille }: { pastille: PastilleRendezVous | null }) {
  if (!pastille) return null;
  return (
    <span
      className={
        "inline-flex flex-none items-center whitespace-nowrap rounded-full px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.06em] " +
        (pastille.passe
          ? "bg-[color:var(--board-signal-wash)] text-[color:var(--board-signal-ink)]"
          : "bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]")
      }
      title={pastille.complet}
    >
      <span aria-hidden>{pastille.court}</span>
      <span className="sr-only">{pastille.complet}</span>
    </span>
  );
}
