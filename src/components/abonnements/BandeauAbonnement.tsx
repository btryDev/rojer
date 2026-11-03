// Ce que l'abonnement change pour le compte (ADR-053 § 3), en tête des pages
// du dossier. Rien tant que l'offre n'est pas lancée, ni quand tout va bien.
// Trois tons : saisie fermée (signal), paiement échoué (ambre), échéance à
// venir (bleu) — et toujours le chemin vers la page de l'abonnement.

import Link from "next/link";
import type { Bandeau } from "@/lib/abonnements/droits";

const TONS: Record<Bandeau["ton"], { fond: string; filet: string; encre: string }> = {
  ferme: { fond: "var(--board-signal-wash)", filet: "var(--board-signal-line)", encre: "var(--board-signal-ink)" },
  alerte: { fond: "var(--board-amber-wash)", filet: "var(--board-amber)", encre: "var(--board-amber-ink)" },
  info: { fond: "var(--board-blue-soft)", filet: "var(--board-slate-line)", encre: "var(--board-blue-ink)" },
};

export function BandeauAbonnement({ bandeau }: { bandeau: Bandeau }) {
  const ton = TONS[bandeau.ton];
  return (
    <section
      role={bandeau.ton === "info" ? "note" : "status"}
      className="carte-board mx-6 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4 sm:mx-10"
      style={{ background: ton.fond, boxShadow: `0 0 0 1px ${ton.filet}` }}
    >
      <p className="m-0 min-w-0 flex-1 text-[14px] font-semibold leading-[1.45]" style={{ color: ton.encre }}>
        {bandeau.message}
      </p>
      <Link href="/compte/abonnement" className="text-[13.5px] font-semibold underline" style={{ color: ton.encre }}>
        Voir mon abonnement
      </Link>
    </section>
  );
}
