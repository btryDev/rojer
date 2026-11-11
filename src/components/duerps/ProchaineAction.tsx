import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/**
 * La prochaine chose à faire, en un bandeau (2026-11-12) : le seul élément
 * de l'écran en bleu pâle, pour qu'il se détache des cartes sans en être une.
 */
export function ProchaineAction({
  texte,
  action,
}: {
  texte: React.ReactNode;
  action?: { href: string; libelle: string };
}) {
  return (
    <section
      aria-label="Prochaine action"
      className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-[18px] bg-[color:var(--board-blue-pale)] px-5 py-3.5 sm:px-6"
    >
      <p className="m-0 min-w-0 text-[14px] leading-[1.5] text-[color:var(--board-slate-ink)]">
        {texte}
      </p>
      {action && (
        <Link
          data-ecriture
          href={action.href}
          className={buttonVariants({ variant: "board", size: "board" })}
        >
          {action.libelle}
        </Link>
      )}
    </section>
  );
}
