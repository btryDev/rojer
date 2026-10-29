import type { ReactNode } from "react";
import { Monitor } from "lucide-react";

/**
 * Un écran laissé à l'ordinateur (décision de la propriétaire du
 * 2026-10-29, détail de l'option 1B) : sur téléphone, sous 768 px, son corps
 * cède la place à une carte qui le dit et dit pourquoi. L'en-tête de la page
 * reste au-dessus, et l'adresse ne change pas : le lien ouvert sur ordinateur
 * mène au même écran.
 *
 * Trois écrans sont concernés : l'import d'un DUERP existant, la connexion
 * d'un assistant, et la personnalisation du tableau de bord (son bouton est
 * simplement retiré sur téléphone, `EditToolbar`).
 */
export function SurOrdinateur({
  raison,
  children,
}: {
  /** Une phrase : pourquoi cet écran se fait mieux sur ordinateur. */
  raison: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="px-[var(--board-gutter)] pt-6 md:hidden">
        <div className="carte-board flex items-start gap-4 px-5 py-5">
          <span
            aria-hidden
            className="grid size-10 flex-none place-items-center rounded-[14px] bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]"
          >
            <Monitor className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="board-titre m-0 text-[17px]">À ouvrir sur ordinateur</p>
            <p className="m-0 mt-1.5 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              {raison}
            </p>
          </div>
        </div>
      </div>
      <div className="hidden flex-1 flex-col md:flex">{children}</div>
    </>
  );
}
