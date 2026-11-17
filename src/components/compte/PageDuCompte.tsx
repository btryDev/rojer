import type { ReactNode } from "react";

import { EnTetePage } from "@/components/entete-page/EnTetePage";

/**
 * Le gabarit d'une page du compte (2026-11-17) : l'en-tête commun, puis le
 * corps sur le canvas, dans la gouttière du board. Section Paramètres — le
 * compte se règle, comme le dossier — ; sans dessin, l'en-tête tient sur une
 * colonne, et la teinte ne se voit qu'en liseré sur téléphone.
 *
 * `menu` : le menu interne de l'abonnement, à gauche sur ordinateur. Les
 * autres pages n'en ont pas — la gélule est déjà le menu du compte.
 */
export function PageDuCompte({
  titre,
  description,
  menu,
  children,
}: {
  titre: string;
  description: ReactNode;
  menu?: ReactNode;
  children: ReactNode;
}) {
  const corps = <div className="flex min-w-0 max-w-[820px] flex-col gap-5">{children}</div>;
  return (
    <main className="flex flex-1 flex-col">
      <EnTetePage section="parametres" titre={titre} description={description} />
      <div className="flex flex-1 flex-col bg-[color:var(--board-canvas)] px-[var(--board-gutter)] pt-7 pb-20">
        {menu ? (
          <div className="grid items-start gap-7 lg:grid-cols-[200px_minmax(0,1fr)]">
            {menu}
            {corps}
          </div>
        ) : (
          corps
        )}
      </div>
    </main>
  );
}
