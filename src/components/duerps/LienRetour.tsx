import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Le retour d'une page du DUERP (2026-11-12) : un bouton clair « ← … », le
 * même partout — en tête des pages de détail et en pied des étapes. Il y
 * avait trois formes (capitales monospacées, lien gris, bouton).
 * [2026-11-21, « il faut unifier » : le retour de toute l'application — les
 * fiches par `FilRetour`, les pages de saisie directement.]
 *
 * [2026-11-21, relecture] Un libellé long (le nom d'une action, une raison
 * sociale) ne déborde plus sur téléphone : le bouton tient dans sa colonne,
 * le texte s'arrête sur « … » et le libellé entier est dans `title`.
 * `discret` : le second retour de `FilRetour` (la liste, quand on arrive
 * d'ailleurs), d'un ton plus clair que le premier.
 */

/** Le texte d'un libellé fait de chaînes et de nombres (`Plan {numero}`). */
function texteDe(children: ReactNode): string {
  return [children]
    .flat()
    .filter((x) => typeof x === "string" || typeof x === "number")
    .join("");
}

export function LienRetour({
  href,
  children,
  discret = false,
}: {
  href: string;
  children: ReactNode;
  discret?: boolean;
}) {
  return (
    <Link
      href={href}
      title={texteDe(children) || undefined}
      className={cn(
        buttonVariants({ variant: "boardClair", size: "boardSm" }),
        "max-w-full",
        discret && "text-[color:var(--board-slate-mid)] shadow-[inset_0_0_0_1px_rgba(10,10,10,.08)]",
      )}
    >
      <span className="min-w-0 truncate">← {children}</span>
    </Link>
  );
}
