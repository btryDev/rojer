// Le cadre ambre « à compléter » : ce qu'il manque sur une page pour que Rojer
// calcule ou tranche (retour de la propriétaire du 2026-10-27). Un seul dessin
// pour les écrans qui le portent — Équipements, la fiche d'un appareil, la
// fiche de l'établissement, les questions sur le travail des salariés. Ambre :
// l'attention, pas le retard (charte board, couleur § 4).

import Link from "next/link";

export function CadreACompleter({
  id,
  titre,
  phrase,
  className = "",
  children,
}: {
  /** L'`id` du titre, pour `aria-labelledby`. */
  id: string;
  titre: string;
  /** Pourquoi, en une phrase courte. */
  phrase?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`rounded-[30px] bg-[color:var(--board-amber-wash)] px-7 py-5 shadow-[inset_0_0_0_1px_var(--board-amber)] sm:px-8 ${className}`}
    >
      <h2 id={id} className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-amber-ink)]">
        {titre}
      </h2>
      {phrase ? <p className="m-0 mt-1.5 text-[13px] text-[color:var(--board-slate-ink)]">{phrase}</p> : null}
      {children}
    </section>
  );
}

/** La puce ambre d'une ligne « à compléter ». */
export function PuceACompleter() {
  return (
    <span
      aria-hidden
      className="size-[8px] flex-none rounded-full bg-[color:var(--board-amber)] shadow-[inset_0_0_0_1px_var(--board-amber-ink)]"
    />
  );
}

/** Des questions à répondre, chacune un lien vers son champ sur la page. */
export function ListeACompleter({ items }: { items: { cle: string; texte: string; href: string }[] }) {
  return (
    <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
      {items.map((i) => (
        <li key={i.cle}>
          <Link
            href={i.href}
            className="inline-flex items-center gap-2.5 text-[14px] font-semibold text-[color:var(--board-ink)] underline decoration-[color:var(--board-amber-ink)] underline-offset-4 hover:text-[color:var(--board-amber-ink)]"
          >
            <PuceACompleter />
            {i.texte}
          </Link>
        </li>
      ))}
    </ul>
  );
}
