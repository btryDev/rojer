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
 * `pleineLargeur` : le corps prend toute la largeur (les trois cartes
 * d'offres de Formules) ; sinon, la mesure d'une colonne de lecture.
 */
export function PageDuCompte({
  titre,
  description,
  menu,
  pleineLargeur = false,
  children,
}: {
  titre: string;
  description: ReactNode;
  menu?: ReactNode;
  pleineLargeur?: boolean;
  children: ReactNode;
}) {
  // Avec le menu, le contenu se pose sur un panneau commun, la surface
  // creuse du board : il se détache du canvas et du menu (retour de test du
  // 2026-11-17, « un bg commun pour toutes les sections »).
  const corps = (
    <div
      className={`flex min-w-0 flex-col gap-5 ${pleineLargeur ? "" : "max-w-[880px]"} ${
        menu ? "rounded-[30px] bg-[color:var(--board-slate-pale)] p-4 sm:p-6" : ""
      }`}
    >
      {children}
    </div>
  );
  return (
    <main className="flex flex-1 flex-col">
      <EnTetePage section="parametres" titre={titre} description={description} />
      <div className="flex flex-1 flex-col bg-[color:var(--board-canvas)] px-[var(--board-gutter)] pt-7 pb-20">
        {menu ? (
          <div className="grid items-start gap-7 lg:grid-cols-[220px_minmax(0,1fr)]">
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
